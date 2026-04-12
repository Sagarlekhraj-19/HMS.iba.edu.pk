// server/services/auth.service.js
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");
const prisma  = require("./prisma");
const AppError = require("./AppError");
const withAppError = require("./withAppError");

const generateToken = (user) =>
  jwt.sign(
    { id: user.id, erp: user.erp, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

// ── Register ────────────────────────────────────────────────
const register = async ({
  fullName,
  username,
  erp,
  email,
  password,
  program,
  isNTHP,
}) => {
  // Public self-registration is student-only to prevent privilege escalation.
  const resolvedRole = "STUDENT";
  const isStudent = resolvedRole === "STUDENT";

  if (isStudent && (!fullName || !erp || !program)) {
    throw new AppError("Student registration requires full name, ERP, and program", 400);
  }
  if (!isStudent && !username) {
    throw new AppError("Staff registration requires username", 400);
  }

  const uniqueChecks = [{ email }];
  if (erp) uniqueChecks.push({ erp });

  const existing = await prisma.user.findFirst({ where: { OR: uniqueChecks } });
  if (existing) throw new AppError("ERP or email already registered", 409);

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      fullName: isStudent ? fullName : username,
      erp: isStudent ? erp : null,
      email,
      password: hashed,
      program: isStudent ? program : null,
      isNTHP: isStudent ? Boolean(isNTHP) : false,
      role: resolvedRole,
    },
  });

  // Create linked profile
  if (user.role === "STUDENT") {
    await prisma.student.create({ data: { userId: user.id } });
  } else {
    await prisma.admin.create({ data: { userId: user.id } });
  }

  return { token: generateToken(user), user: sanitize(user) };
};

// ── Login ────────────────────────────────────────────────────
const login = async (body) => {
  const { erp, email, identifier: ident, password, portal } = body;
  const identifier = (erp || email || ident || "").trim();
  const targetPortal = String(portal || "STUDENT").toUpperCase();
  if (!identifier) throw new AppError("ERP or email is required", 400);
  if (!["STUDENT", "ADMIN"].includes(targetPortal)) {
    throw new AppError("Invalid login portal", 400);
  }

  const user = await prisma.user.findFirst({
    where: { OR: [{ erp: identifier }, { email: identifier }] },
  });
  if (!user) throw new AppError("Invalid credentials", 401);
  if (user.isActive === false) throw new AppError("This account is inactive. Please contact administration.", 403);

  if (targetPortal === "STUDENT" && user.role !== "STUDENT") {
    throw new AppError("Staff accounts must sign in from the admin login page", 403);
  }

  if (targetPortal === "ADMIN" && user.role === "STUDENT") {
    throw new AppError("Student credentials are not allowed on admin login", 403);
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new AppError("Invalid credentials", 401);

  return { token: generateToken(user), user: sanitize(user) };
};

// ── Forgot password (self-service reset) ───────────────────
const forgotPassword = async ({ identifier, oldPassword, newPassword }) => {
  const normalizedIdentifier = (identifier || "").trim();
  if (!normalizedIdentifier) throw new AppError("ERP or email is required", 400);
  if (!oldPassword) throw new AppError("Current password is required", 400);
  if (!newPassword || String(newPassword).length < 8) {
    throw new AppError("New password must be at least 8 characters", 400);
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ erp: normalizedIdentifier }, { email: normalizedIdentifier }],
    },
  });

  if (!user) {
    throw new AppError("No account found with this ERP/email", 404);
  }

  const match = await bcrypt.compare(oldPassword, user.password);
  if (!match) {
    throw new AppError("Current password is incorrect", 401);
  }

  const hashed = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashed,
    },
  });

  return { message: "Password reset successful. You can now sign in." };
};

// ── Get current user profile ─────────────────────────────────
const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      student: {
        include: { roomApplications: { include: { room: true }, orderBy: { submittedAt: "desc" }, take: 1 } },
      },
    },
  });
  if (!user) throw new AppError("User not found", 404);
  return sanitize(user);
};

const getNotifications = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);

  if (user.role === "STUDENT") {
    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) return [];

    const [apps, complaintUpdates, announcements] = await Promise.all([
      prisma.roomApplication.findMany({
        where: { studentId: student.id },
        include: {
          room: {
            select: {
              roomNumber: true,
              block: true,
            },
          },
          student: {
            include: {
              user: {
                select: {
                  erp: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 3,
      }),
      prisma.complaintUpdate.findMany({
        where: { complaint: { studentId: student.id } },
        include: { complaint: true, updatedBy: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.messAnnouncement.findMany({
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        take: 4,
      }),
    ]);

    return [
      ...apps.map((a) => ({
        id: `APP-${a.id}`,
        title: `Room Application ${a.status}`,
        message:
          a.status === "ALLOCATED"
            ? `Application ${a.appId} is ALLOCATED to ERP ${a.student?.user?.erp || "N/A"}${a.student?.user?.email ? ` (${a.student.user.email})` : ""}${a.room?.roomNumber ? ` in room ${a.room.roomNumber}${a.room.block ? ` (${a.room.block})` : ""}` : ""}.`
            : a.status === "APPROVED"
              ? `Application ${a.appId} for ${a.term} is APPROVED for ERP ${a.student?.user?.erp || "N/A"}. Waiting for final room allocation.`
              : `Application ${a.appId} for ${a.term} is now ${a.status}.`,
        at: a.updatedAt,
      })),
      ...complaintUpdates.map((u) => ({
        id: `CMPU-${u.id}`,
        title: `Complaint ${u.status || "Updated"}`,
        message: `${u.complaint?.subject || "Complaint"} (${u.complaint?.complaintId || ""})${u.remarks ? `: ${u.remarks}` : ""}`,
        at: u.createdAt,
      })),
      ...announcements.map((n) => ({
        id: `ANN-${n.id}`,
        title: `Mess Update: ${n.title}`,
        message: n.message,
        at: n.createdAt,
      })),
    ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 10);
  }

  const isAdmin = user.role === "ADMIN";
  const isMessManager = user.role === "MESS_MANAGER";
  const isComplaintManager = user.role === "COMPLAINT_MANAGER" || user.role === "CLEANING_MANAGER";

  const [pendingApps, pendingComplaints, pendingMessRequests, unpaidOrders] = await Promise.all([
    isAdmin ? prisma.roomApplication.findMany({ where: { status: "PENDING" }, orderBy: { submittedAt: "desc" }, take: 4 }) : [],
    (isAdmin || isComplaintManager) ? prisma.complaint.findMany({ where: { status: { in: ["OPEN", "PENDING", "REOPENED", "ASSIGNED", "IN_PROGRESS"] } }, orderBy: { updatedAt: "desc" }, take: 4 }) : [],
    (isAdmin || isMessManager) ? prisma.messRequest.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 4 }) : [],
    (isAdmin || isMessManager) ? prisma.messOrder.findMany({ where: { status: "ACTIVE", isPaid: false }, orderBy: { updatedAt: "desc" }, take: 4 }) : [],
  ]);

  const notifications = [
    ...(isAdmin ? pendingApps.map((a) => ({
      id: `RAPP-${a.id}`,
      title: "Pending Room Application",
      message: `${a.appId} needs review.`,
      at: a.submittedAt,
    })) : []),
    ...((isAdmin || isComplaintManager) ? pendingComplaints.map((c) => ({
      id: `RCMP-${c.id}`,
      title: "Pending Complaint",
      message: `${c.complaintId} (${c.category}) requires action.`,
      at: c.updatedAt,
    })) : []),
    ...((isAdmin || isMessManager) ? pendingMessRequests.map((m) => ({
      id: `MRQ-${m.id}`,
      title: "Pending Mess Request",
      message: `${m.requestId} is waiting for review.`,
      at: m.createdAt,
    })) : []),
    ...((isAdmin || isMessManager) ? unpaidOrders.map((o) => ({
      id: `ORD-${o.id}`,
      title: "Unpaid Mess Subscription",
      message: `${o.orderId} is unpaid and needs follow-up.`,
      at: o.updatedAt,
    })) : []),
  ];

  return notifications.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 10);
};

const sanitize = (user) => {
  const { password, ...safe } = user;
  return safe;
};

module.exports = {
  register: withAppError(register),
  login: withAppError(login),
  forgotPassword: withAppError(forgotPassword),
  getProfile: withAppError(getProfile),
  getNotifications: withAppError(getNotifications),
};
