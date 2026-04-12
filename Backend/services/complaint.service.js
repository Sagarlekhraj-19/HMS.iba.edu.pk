// server/services/complaint.service.js
const prisma = require("./prisma");
const AppError = require("./AppError");
const withAppError = require("./withAppError");

const CATEGORY_MAP = {
  ELECTRICAL_FAN_AC: "ELECTRICAL",
  ELECTRICAL_LIGHTS: "ELECTRICAL",
  PLUMBING_LEAKAGE: "PLUMBING",
  MESS_FOOD_QUALITY: "MESS_FOOD",
  MESS_LATE_MEALS: "MESS_FOOD",
  MESS_KITCHEN_HYGIENE: "MESS_FOOD",
  FURNITURE_BED_MATTRESS: "MAINTENANCE",
  FURNITURE_DAMAGE: "MAINTENANCE",
  WATER_SHORTAGE: "PLUMBING",
  LAUNDRY_ISSUES: "MAINTENANCE",
};

const VALID_CATEGORIES = new Set([
  "MAINTENANCE",
  "PLUMBING",
  "ELECTRICAL",
  "MESS_FOOD",
  "INTERNET_WIFI",
  "CLEANING",
  "OTHER",
]);

const getComplaintUpdateDelegate = () => {
  const delegate = prisma.complaintUpdate;
  if (!delegate || typeof delegate.findMany !== "function") return null;
  return delegate;
};

const withUpdatesForList = async (complaints, take = 20) => {
  if (!Array.isArray(complaints) || complaints.length === 0) return [];

  const complaintUpdate = getComplaintUpdateDelegate();
  if (!complaintUpdate) {
    return complaints.map((complaint) => ({ ...complaint, updates: [] }));
  }

  const complaintIds = complaints.map((c) => c.id);
  const updates = await complaintUpdate.findMany({
    where: { complaintId: { in: complaintIds } },
    include: { updatedBy: true },
    orderBy: [{ complaintId: "asc" }, { createdAt: "desc" }],
  });

  const grouped = updates.reduce((acc, update) => {
    if (!acc[update.complaintId]) acc[update.complaintId] = [];
    if (acc[update.complaintId].length < take) acc[update.complaintId].push(update);
    return acc;
  }, {});

  return complaints.map((complaint) => ({
    ...complaint,
    updates: grouped[complaint.id] || [],
  }));
};

const withUpdatesForSingle = async (complaint, take = 20) => {
  if (!complaint) return complaint;
  const complaintUpdate = getComplaintUpdateDelegate();
  if (!complaintUpdate) return { ...complaint, updates: [] };

  const updates = await complaintUpdate.findMany({
    where: { complaintId: complaint.id },
    include: { updatedBy: true },
    orderBy: { createdAt: "desc" },
    take,
  });
  return { ...complaint, updates };
};

// ── Student: get their complaints ───────────────────────────
const getMyComplaints = async (userId, statusFilter) => {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw new AppError("Student not found", 404);

  const complaints = await prisma.complaint.findMany({
    where: {
      studentId: student.id,
      ...(statusFilter && { status: statusFilter }),
    },
    include: {
      student: { include: { user: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  return withUpdatesForList(complaints, 10);
};

// ── Student: get a single complaint ─────────────────────────
const getComplaintById = async (userId, complaintId) => {
  const student = await prisma.student.findUnique({ where: { userId } });
  const complaint = await prisma.complaint.findUnique({
    where: { id: Number(complaintId) },
    include: {
      student: { include: { user: true } },
    },
  });
  if (!complaint || complaint.studentId !== student.id)
    throw new AppError("Complaint not found", 404);
  return withUpdatesForSingle(complaint, 20);
};

// ── Student: raise a new complaint ──────────────────────────
const createComplaint = async (userId, {
  category,
  subject,
  description,
  roomNumber,
  floor,
  block,
  isAnonymous,
  attachment,
}) => {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw new AppError("Student not found", 404);

  if (!String(description || "").trim()) {
    throw new AppError("Description is required", 400);
  }
  if (!String(roomNumber || "").trim()) {
    throw new AppError("Room number is required", 400);
  }

  const normalizedCategory = CATEGORY_MAP[category] || category;
  if (!VALID_CATEGORIES.has(normalizedCategory)) {
    throw new AppError("Invalid complaint category", 400);
  }

  const created = await prisma.complaint.create({
    data: {
      studentId: student.id,
      category: normalizedCategory,
      subject: subject || (description || "").substring(0, 60) || "No subject",
      description,
      roomNumber,
      floor,
      block,
      isAnonymous: Boolean(isAnonymous),
      attachment: attachment || null,
      status: "PENDING",
    },
    include: { student: { include: { user: true } } },
  });

  const complaintUpdate = getComplaintUpdateDelegate();
  if (complaintUpdate && typeof complaintUpdate.create === "function") {
    await complaintUpdate.create({
      data: {
        complaintId: created.id,
        status: created.status,
        remarks: "Complaint submitted",
        updatedByUserId: userId,
      },
    });
  }

  return created;
};

// ── Student: delete (withdraw) a complaint ──────────────────
const deleteComplaint = async (userId, complaintId) => {
  const student = await prisma.student.findUnique({ where: { userId } });
  const complaint = await prisma.complaint.findUnique({ where: { id: Number(complaintId) } });
  if (!complaint || complaint.studentId !== student.id)
    throw new AppError("Complaint not found", 404);
  if (!["PENDING", "REOPENED"].includes(complaint.status))
    throw new AppError("Only pending/reopened complaints can be withdrawn", 400);

  return prisma.complaint.delete({ where: { id: Number(complaintId) } });
};

// ── Student: reopen a resolved complaint ────────────────────
const reopenComplaint = async (userId, complaintId) => {
  const student = await prisma.student.findUnique({ where: { userId } });
  const complaint = await prisma.complaint.findUnique({ where: { id: Number(complaintId) } });

  if (!student || !complaint || complaint.studentId !== student.id) {
    throw new AppError("Complaint not found", 404);
  }

  if (complaint.status !== "RESOLVED") {
    throw new AppError("Only resolved complaints can be reopened", 400);
  }

  const updated = await prisma.complaint.update({
    where: { id: Number(complaintId) },
    data: { status: "REOPENED" },
    include: { student: { include: { user: true } } },
  });

  const complaintUpdate = getComplaintUpdateDelegate();
  if (complaintUpdate && typeof complaintUpdate.create === "function") {
    await complaintUpdate.create({
      data: {
        complaintId: updated.id,
        status: "REOPENED",
        remarks: "Student reopened complaint",
        updatedByUserId: userId,
      },
    });
  }

  return updated;
};

// ── Admin: get all complaints ────────────────────────────────
const getAllComplaints = async (statusFilter) => {
  const complaints = await prisma.complaint.findMany({
    where: statusFilter ? { status: statusFilter } : {},
    include: {
      student: { include: { user: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  return withUpdatesForList(complaints, 20);
};

// ── Admin: update complaint status ───────────────────────────
const updateComplaint = async (complaintId, payload, updatedByUserId) => {
  const { status, assignedRole, assignedStaff, remarks } = payload;

  const resolvedStatus = status || (assignedRole ? "ASSIGNED" : undefined);

  const current = await prisma.complaint.findUnique({ where: { id: Number(complaintId) } });
  if (!current) throw new AppError("Complaint not found", 404);

  const TRANSITIONS = {
    PENDING: ["ASSIGNED", "IN_PROGRESS", "REJECTED"],
    OPEN: ["ASSIGNED", "IN_PROGRESS", "REJECTED"],
    ASSIGNED: ["IN_PROGRESS", "REJECTED"],
    IN_PROGRESS: ["RESOLVED", "REJECTED"],
    REOPENED: ["ASSIGNED", "IN_PROGRESS", "REJECTED"],
  };
  const allowed = TRANSITIONS[current.status] || [];
  if (resolvedStatus && !allowed.includes(resolvedStatus)) {
    throw new AppError(`Cannot transition from ${current.status} to ${resolvedStatus}`, 400);
  }
  if (resolvedStatus === "REJECTED" && !String(remarks || "").trim()) {
    throw new AppError("Remark is required when rejecting a complaint", 422);
  }

  const updated = await prisma.complaint.update({
    where: { id: Number(complaintId) },
    data: {
      ...(resolvedStatus ? { status: resolvedStatus } : {}),
      ...(assignedRole !== undefined ? { assignedRole } : {}),
      ...(assignedStaff !== undefined ? { assignedStaff } : {}),
    },
    include: {
      student: { include: { user: true } },
    },
  });

  const complaintUpdate = getComplaintUpdateDelegate();
  if (complaintUpdate && typeof complaintUpdate.create === "function") {
    await complaintUpdate.create({
      data: {
        complaintId: updated.id,
        status: resolvedStatus || updated.status,
        remarks: remarks || null,
        assignedRole: assignedRole || null,
        assignedStaff: assignedStaff || null,
        updatedByUserId,
      },
    });
  }

  return withUpdatesForSingle(updated, 20);
};

const exportComplaintsCsv = async (statusFilter) => {
  const list = await getAllComplaints(statusFilter);
  const header = [
    "Complaint ID",
    "Student",
    "ERP",
    "Category",
    "Description",
    "Location",
    "Status",
    "Assigned Role",
    "Assigned Staff",
    "Latest Remarks",
    "Submitted At",
    "Updated At",
  ];

  const rows = list.map((c) => [
    c.complaintId,
    c.student?.user?.fullName || "",
    c.student?.user?.erp || "",
    c.category,
    c.description,
    `Room ${c.roomNumber || "-"}, Floor ${c.floor || "-"}, Block ${c.block || "-"}`,
    c.status,
    c.assignedRole || "",
    c.assignedStaff || "",
    c.updates?.[0]?.remarks || "",
    c.submittedAt?.toISOString?.() || "",
    c.updatedAt?.toISOString?.() || "",
  ]);

  return [header, ...rows].map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
};

module.exports = {
  getMyComplaints: withAppError(getMyComplaints),
  getComplaintById: withAppError(getComplaintById),
  createComplaint: withAppError(createComplaint),
  deleteComplaint: withAppError(deleteComplaint),
  reopenComplaint: withAppError(reopenComplaint),
  getAllComplaints: withAppError(getAllComplaints),
  updateComplaint: withAppError(updateComplaint),
  exportComplaintsCsv: withAppError(exportComplaintsCsv),
};
