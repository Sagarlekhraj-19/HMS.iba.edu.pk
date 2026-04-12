// server/routes/admin.routes.js
const express = require("express");
const router  = express.Router();
const prisma  = require("../services/prisma");
const { Prisma } = require("@prisma/client");
const { protect, adminOnly } = require("../middleware/auth.middleware");

const DASHBOARD_CACHE_TTL_MS = 60 * 1000;
let dashboardCache = null;
let dashboardCacheAt = 0;

const invalidateDashboardCache = () => {
  dashboardCache = null;
  dashboardCacheAt = 0;
};

const getModelFields = (modelName) => {
  try {
    const models = Prisma?.dmmf?.datamodel?.models || [];
    const model = models.find((m) => m.name === modelName);
    return Array.isArray(model?.fields) ? model.fields.map((f) => f.name) : [];
  } catch {
    return [];
  }
};

// GET /api/admin/dashboard  — quick stats for admin dashboard
router.get("/dashboard", protect, adminOnly, async (req, res, next) => {
  try {
    const now = Date.now();
    if (dashboardCache && now - dashboardCacheAt < DASHBOARD_CACHE_TTL_MS) {
      return res.json(dashboardCache);
    }

    const [
      totalStudents,
      pendingApps,
      activeComplaints,
      activeOrders,
      allocatedRooms,
      availableRooms,
      unpaidSubscriptions,
    ] = await Promise.all([
      prisma.student.count(),
      prisma.roomApplication.count({ where: { status: { in: ["PENDING", "UNDER_REVIEW", "APPROVED"] } } }),
      prisma.complaint.count({ where: { status: { in: ["OPEN", "PENDING", "ASSIGNED", "IN_PROGRESS", "REOPENED"] } } }),
      prisma.messOrder.count({ where: { status: "ACTIVE" } }),
      prisma.roomApplication.count({ where: { status: "ALLOCATED" } }),
      prisma.room.count({ where: { isAvailable: true } }),
      prisma.messOrder.count({ where: { status: "ACTIVE", isPaid: false } }),
    ]);

    dashboardCache = {
      totalStudents,
      allocatedRooms,
      availableRooms,
      pendingApps,
      activeComplaints,
      activeOrders,
      unpaidSubscriptions,
    };
    dashboardCacheAt = now;

    res.json(dashboardCache);
  } catch (err) { next(err); }
});

// GET /api/admin/students  — list all students
router.get("/students", protect, adminOnly, async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize || 10), 1), 100);
    const search = String(req.query.search || "").trim();
    const allocation = String(req.query.allocation || "ALL").toUpperCase();

    const searchWhere = search
      ? {
          OR: [
            { user: { fullName: { contains: search, mode: "insensitive" } } },
            { user: { erp: { contains: search, mode: "insensitive" } } },
            { user: { email: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {};

    const allocationWhere = allocation === "ALLOCATED"
      ? { roomApplications: { some: { status: "ALLOCATED" } } }
      : allocation === "UNALLOCATED"
        ? { roomApplications: { none: { status: "ALLOCATED" } } }
        : {};

    const where = {
      ...searchWhere,
      ...allocationWhere,
    };

    const [total, students] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              erp: true,
              email: true,
              program: true,
              createdAt: true,
              isActive: true,
            },
          },
          roomApplications: {
            where: { status: "ALLOCATED" },
            include: { room: true },
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
        },
        orderBy: { id: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const rows = students.map((s) => {
      const currentAllocated = s.roomApplications?.[0] || null;
      const room = currentAllocated?.room || null;
      return {
        id: s.id,
        user: s.user,
        room: room ? room.roomNumber : null,
        block: room ? room.block : null,
        allocationStatus: room ? "ALLOCATED" : "UNALLOCATED",
      };
    });

    res.json({
      page,
      pageSize,
      total,
      totalPages: Math.max(Math.ceil(total / pageSize), 1),
      students: rows,
    });
  } catch (err) { next(err); }
});

// GET /api/admin/students/:id/details — full student detail profile
router.get("/students/:id/details", protect, adminOnly, async (req, res, next) => {
  try {
    const studentId = Number(req.params.id);
    if (!Number.isFinite(studentId)) return res.status(400).json({ error: "Invalid student id" });

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            erp: true,
            email: true,
            program: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
        roomApplications: {
          include: { room: true },
          orderBy: { submittedAt: "desc" },
        },
        messOrders: {
          orderBy: { createdAt: "desc" },
        },
        complaints: {
          orderBy: { submittedAt: "desc" },
        },
      },
    });

    if (!student) return res.status(404).json({ error: "Student not found" });

    const currentRoom = student.roomApplications.find((a) => a.status === "ALLOCATED") || null;

    res.json({
      student: {
        id: student.id,
        batch: student.batch,
        semester: student.semester,
        balance: student.balance,
        dietaryPreference: student.dietaryPreference,
        user: student.user,
      },
      currentRoom: currentRoom
        ? {
            roomNumber: currentRoom.room?.roomNumber,
            block: currentRoom.room?.block,
            floor: currentRoom.room?.floor,
            type: currentRoom.room?.type,
          }
        : null,
      roomApplications: student.roomApplications,
      messSubscriptions: student.messOrders,
      complaints: student.complaints,
    });
  } catch (err) { next(err); }
});

// GET /api/admin/feedback  — list all feedback
router.get("/feedback", protect, adminOnly, async (req, res, next) => {
  try {
    const list = await prisma.feedback.findMany({
      include: { student: { include: { user: { select: { fullName: true, erp: true } } } } },
      orderBy: { submittedAt: "desc" },
    });
    res.json(list);
  } catch (err) { next(err); }
});

// GET /api/admin/users  — list all users for access control
router.get("/users", protect, adminOnly, async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        erp: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch (err) { next(err); }
});

// PUT /api/admin/users/:id  — update role/active state
router.put("/users/:id", protect, adminOnly, async (req, res, next) => {
  try {
    const targetId = Number(req.params.id);
    const { role, isActive } = req.body;

    if (!Number.isFinite(targetId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    if (targetId === req.user.id && isActive === false) {
      return res.status(400).json({ error: "You cannot deactivate your own account" });
    }

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: {
        ...(role ? { role } : {}),
        ...(typeof isActive === "boolean" ? { isActive } : {}),
      },
      select: {
        id: true,
        fullName: true,
        erp: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    invalidateDashboardCache();
    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE /api/admin/users/:id  — remove user
router.delete("/users/:id", protect, adminOnly, async (req, res, next) => {
  try {
    const targetId = Number(req.params.id);
    if (!Number.isFinite(targetId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }
    if (targetId === req.user.id) {
      return res.status(400).json({ error: "You cannot delete your own account" });
    }

    await prisma.user.delete({ where: { id: targetId } });
    invalidateDashboardCache();
    res.json({ message: "User removed" });
  } catch (err) { next(err); }
});

// GET /api/admin/dev/prisma-health  — runtime Prisma client shape check
router.get("/dev/prisma-health", protect, adminOnly, async (req, res) => {
  const roomApplicationFields = getModelFields("RoomApplication");
  const complaintUpdateFields = getModelFields("ComplaintUpdate");

  res.json({
    generatedAt: new Date().toISOString(),
    delegates: {
      complaintUpdate: Boolean(prisma.complaintUpdate && typeof prisma.complaintUpdate.findMany === "function"),
      roomApplication: Boolean(prisma.roomApplication && typeof prisma.roomApplication.findMany === "function"),
      complaint: Boolean(prisma.complaint && typeof prisma.complaint.findMany === "function"),
    },
    modelFields: {
      RoomApplication: roomApplicationFields,
      ComplaintUpdate: complaintUpdateFields,
      roomApplicationHasRemarks: roomApplicationFields.includes("remarks"),
      complaintUpdateHasRemarks: complaintUpdateFields.includes("remarks"),
    },
  });
});

module.exports = router;
