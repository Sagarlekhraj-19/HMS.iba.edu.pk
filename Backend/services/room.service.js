// server/services/room.service.js
const prisma = require("./prisma");
const { publishRoomUpdate } = require("./realtime");
const AppError = require("./AppError");
const withAppError = require("./withAppError");

const syncRoomAvailability = async (roomId) => {
  if (!roomId) return;

  const room = await prisma.room.findUnique({ where: { id: Number(roomId) } });
  if (!room) return;

  const occupiedCount = await prisma.roomApplication.count({
    where: { roomId: Number(roomId), status: "ALLOCATED" },
  });

  await prisma.room.update({
    where: { id: Number(roomId) },
    data: { isAvailable: occupiedCount < room.capacity },
  });
};

// ── List all rooms (for students to browse) ──────────────────
const getAllRooms = async (filters = {}) => {
  const rooms = await prisma.room.findMany({
    where: {
      ...(filters.block && { block: filters.block }),
      ...(filters.type  && { type:  filters.type  }),
      ...(filters.available !== undefined && { isAvailable: filters.available }),
    },
    orderBy: { roomNumber: "asc" },
  });

  const allocations = await prisma.roomApplication.groupBy({
    by: ["roomId"],
    where: { roomId: { not: null }, status: "ALLOCATED" },
    _count: { _all: true },
  });

  const occupiedMap = allocations.reduce((acc, row) => {
    if (row.roomId != null) acc[row.roomId] = row._count._all;
    return acc;
  }, {});

  return rooms.map((room) => {
    const occupiedCount = occupiedMap[room.id] || 0;
    const occupancyStatus = occupiedCount >= room.capacity ? "FULL" : occupiedCount > 0 ? "PARTIAL" : "EMPTY";
    return { ...room, occupiedCount, occupancyStatus };
  });
};

// ── Get one room ─────────────────────────────────────────────
const getRoomById = async (id) => {
  const room = await prisma.room.findUnique({ where: { id: Number(id) } });
  if (!room) throw new AppError("Room not found", 404);
  return room;
};

// ── Student: submit a room application ──────────────────────
const applyForRoom = async (userId, { term }) => {
  const normalizedTerm = String(term || "").trim();
  if (!normalizedTerm) throw new AppError("Term is required", 400);

  // Get student record
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw new AppError("Student profile not found", 404);

  // Check for existing pending application
  const existing = await prisma.roomApplication.findFirst({
    where: { studentId: student.id, term: normalizedTerm, status: { notIn: ["REJECTED"] } },
  });
  if (existing) throw new AppError("You already have an active application for this term", 409);

  return prisma.roomApplication.create({
    data: {
      studentId: student.id,
      term: normalizedTerm,
      status: "PENDING",
    },
    include: { student: { include: { user: true } } },
  });
};

// ── Student: get their own applications ─────────────────────
const getMyApplications = async (userId) => {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw new AppError("Student profile not found", 404);

  return prisma.roomApplication.findMany({
    where: { studentId: student.id },
    include: {
      room: true,
      student: {
        include: {
          user: {
            select: {
              fullName: true,
              erp: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: { submittedAt: "desc" },
  });
};

// ── Admin: get all applications ──────────────────────────────
const getAllApplications = async (statusFilter, termFilter) => {
  return prisma.roomApplication.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(termFilter ? { term: termFilter } : {}),
    },
    include: {
      student: { include: { user: true } },
      room: true,
      admin: { include: { user: true } },
    },
    orderBy: { submittedAt: "desc" },
  });
};

const exportApplicationsCsv = async (statusFilter, termFilter) => {
  const list = await getAllApplications(statusFilter, termFilter);

  const header = [
    "App ID",
    "Student Name",
    "Student ERP",
    "Term",
    "Status",
    "Allocated Room",
    "Submitted At",
    "Last Updated",
    "Reviewed By",
    "Remarks",
  ];

  const rows = list.map((a) => [
    a.appId,
    a.student?.user?.fullName || "",
    a.student?.user?.erp || "",
    a.term,
    a.status,
    a.room?.roomNumber || "",
    a.submittedAt?.toISOString?.() || "",
    a.updatedAt?.toISOString?.() || "",
    a.admin?.user?.fullName || "",
    a.remarks || "",
  ]);

  return [header, ...rows]
    .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
};

// ── Admin: update application status (approve/allocate/reject) ──
const updateApplicationStatus = async (appId, { status, roomNumber, roomId, remarks, adminUserId }) => {
  const admin = await prisma.admin.findUnique({ where: { userId: adminUserId } });
  if (!admin) throw new AppError("Admin profile not found", 403);

  const application = await prisma.roomApplication.findUnique({
    where: { id: Number(appId) },
    include: {
      student: {
        include: {
          user: {
            select: {
              id: true,
              erp: true,
              email: true,
            },
          },
        },
      },
    },
  });
  if (!application) throw new AppError("Application not found", 404);

  const previousRoomId = application.roomId;
  let parsedRoomId = null;

  // Handle room by number (new way) or by ID (backward compatibility)
  if (status === "ALLOCATED" && (roomNumber || roomId)) {
    let room = null;

    if (roomNumber) {
      const normalizedRoomNumber = String(roomNumber).trim().toUpperCase();
      
      // Look up room by number
      room = await prisma.room.findUnique({ 
        where: { roomNumber: normalizedRoomNumber } 
      });

      // If room doesn't exist, create it with default values
      if (!room) {
        room = await prisma.room.create({
          data: {
            roomNumber: normalizedRoomNumber,
            block: "Block A", // default block
            floor: 1, // default floor
            type: "DOUBLE", // default type
            capacity: 2, // default capacity
            isAvailable: true,
          },
        });
      }
      parsedRoomId = room.id;
    } else if (roomId) {
      parsedRoomId = Number(roomId);
      room = await prisma.room.findUnique({ where: { id: parsedRoomId } });
    }

    if (!room) {
      throw new AppError("Room not found", 404);
    }

    // Check if room is already fully allocated
    const allocatedInRoom = await prisma.roomApplication.count({
      where: { roomId: room.id, status: "ALLOCATED", id: { not: Number(appId) } },
    });
    if (allocatedInRoom >= room.capacity) {
      throw new AppError(`Room "${room.roomNumber}" is already full (capacity: ${room.capacity}). Please choose another room.`, 409);
    }

    // Check if student already has an allocated room
    const studentHasAllocatedRoom = await prisma.roomApplication.findFirst({
      where: {
        studentId: application.studentId,
        id: { not: Number(appId) },
        status: "ALLOCATED",
      },
      include: { room: true },
    });
    if (studentHasAllocatedRoom) {
      throw new AppError(
        `Student is already allocated to room "${studentHasAllocatedRoom.room?.roomNumber}". Remove that allocation first.`,
        409
      );
    }
  }

  if (status === "ALLOCATED" && !parsedRoomId) {
    throw new AppError("Room is required when allocating", 400);
  }

  const updateData = {
    status,
    remarks,
    reviewedBy: admin.id,
    isAdminReviewed: true,
    reviewedAt: application.reviewedAt || new Date(),
    ...(status === "ALLOCATED"
      ? { roomId: parsedRoomId }
      : parsedRoomId
        ? { roomId: parsedRoomId }
        : status
          ? { roomId: null }
          : {}),
  };

  let updated;
  try {
    updated = await prisma.roomApplication.update({
      where: { id: Number(appId) },
      data: updateData,
      include: { student: { include: { user: true } }, room: true },
    });
  } catch (err) {
    const msg = String(err?.message || "");
    if (msg.includes("Unknown argument")) {
      const { remarks: _ignoredRemarks, reviewedAt: _ignoredReviewedAt, isAdminReviewed: _ignoredIsAdminReviewed, ...updateDataWithoutNewFields } = updateData;
      updated = await prisma.roomApplication.update({
        where: { id: Number(appId) },
        data: updateDataWithoutNewFields,
        include: { student: { include: { user: true } }, room: true },
      });
    } else {
      throw err;
    }
  }

  await Promise.all([
    syncRoomAvailability(previousRoomId),
    syncRoomAvailability(updated.roomId),
  ]);

  publishRoomUpdate(application.student.userId, {
    applicationId: updated.id,
    appId: updated.appId,
    status: updated.status,
    roomNumber: updated.room?.roomNumber || null,
    roomBlock: updated.room?.block || null,
    studentErp: application.student?.user?.erp || null,
    isAllocated: updated.status === "ALLOCATED",
  });

  return updated;
};

// ── Admin: mark application as reviewed (when opening modal) ──
const markApplicationAsReviewed = async (appId, adminUserId) => {
  const admin = await prisma.admin.findUnique({ where: { userId: adminUserId } });
  if (!admin) throw new AppError("Admin profile not found", 403);

  const application = await prisma.roomApplication.findUnique({
    where: { id: Number(appId) },
  });
  if (!application) throw new AppError("Application not found", 404);

  if (!application.isAdminReviewed) {
    return prisma.roomApplication.update({
      where: { id: Number(appId) },
      data: {
        isAdminReviewed: true,
        reviewedAt: new Date(),
      },
      include: { student: { include: { user: true } }, room: true, admin: { include: { user: true } } },
    });
  }

  return application;
};

// ── Admin: CRUD for rooms ────────────────────────────────────
const createRoom = async (data) => {
  return prisma.room.create({ data });
};

const updateRoom = async (id, data) => {
  return prisma.room.update({ where: { id: Number(id) }, data });
};

const deleteRoom = async (id) => {
  return prisma.room.delete({ where: { id: Number(id) } });
};

module.exports = {
  getAllRooms: withAppError(getAllRooms),
  getRoomById: withAppError(getRoomById),
  applyForRoom: withAppError(applyForRoom),
  getMyApplications: withAppError(getMyApplications),
  getAllApplications: withAppError(getAllApplications),
  updateApplicationStatus: withAppError(updateApplicationStatus),
  markApplicationAsReviewed: withAppError(markApplicationAsReviewed),
  exportApplicationsCsv: withAppError(exportApplicationsCsv),
  createRoom: withAppError(createRoom),
  updateRoom: withAppError(updateRoom),
  deleteRoom: withAppError(deleteRoom),
};
