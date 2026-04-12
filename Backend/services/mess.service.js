// server/services/mess.service.js
const prisma = require("./prisma");
const AppError = require("./AppError");
const withAppError = require("./withAppError");

// Meal pricing map (PKR per day)
const MEAL_RATES = {
  Breakfast: 170,
  Dinner:    270,
  Sehri:     200,
  Lunch:     220,
};

const calcTotal = (mealTypes, startDate, endDate) => {
  const days = Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000) + 1;
  const dailyRate = mealTypes.reduce((sum, meal) => sum + (MEAL_RATES[meal] || 200), 0);
  return dailyRate * days;
};

const normalizeDateOnly = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const toMonthRange = (month, year) => {
  const start = new Date(Number(year), Number(month) - 1, 1);
  const end = new Date(Number(year), Number(month), 1);
  return { start, end };
};

// ── Student: get their active and past orders ────────────────
const getMyOrders = async (userId) => {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw new AppError("Student not found", 404);

  return prisma.messOrder.findMany({
    where: { studentId: student.id },
    orderBy: { createdAt: "desc" },
  });
};

// ── Student: create a new mess order ────────────────────────
const createOrder = async (userId, { mealTypes, startDate, endDate }) => {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw new AppError("Student not found", 404);

  if (!Array.isArray(mealTypes) || mealTypes.length === 0) {
    throw new AppError("At least one meal type is required", 400);
  }

  const normalizedMeals = [...new Set(mealTypes.map((m) => String(m || "").trim()))].filter(Boolean);
  const invalidMeals = normalizedMeals.filter((m) => !Object.prototype.hasOwnProperty.call(MEAL_RATES, m));
  if (normalizedMeals.length === 0 || invalidMeals.length > 0) {
    throw new AppError("Invalid meal types provided", 400);
  }

  const start = normalizeDateOnly(startDate);
  const end = normalizeDateOnly(endDate);
  if (!start || !end) {
    throw new AppError("Valid startDate and endDate are required", 400);
  }

  const today = normalizeDateOnly(new Date());
  if (start < today) {
    throw new AppError("startDate cannot be in the past", 400);
  }
  if (end < start) {
    throw new AppError("endDate must be on or after startDate", 400);
  }

  const days = Math.ceil((end - start) / 86400000) + 1;
  if (days > 180) {
    throw new AppError("Date range is too long", 400);
  }

  // Check for overlapping active order
  const overlap = await prisma.messOrder.findFirst({
    where: {
      studentId: student.id,
      status: "ACTIVE",
      startDate: { lte: end },
      endDate:   { gte: start },
    },
  });
  if (overlap) throw new AppError("You already have an active order in this period", 409);

  const totalAmount = calcTotal(normalizedMeals, start, end);

  return prisma.messOrder.create({
    data: {
      studentId: student.id,
      mealTypes: normalizedMeals,
      startDate: start,
      endDate: end,
      totalAmount,
      status: "ACTIVE",
    },
  });
};

// ── Student: cancel an order ─────────────────────────────────
const cancelOrder = async (userId, orderId) => {
  const student = await prisma.student.findUnique({ where: { userId } });
  const order = await prisma.messOrder.findUnique({ where: { id: Number(orderId) } });

  if (!order || order.studentId !== student.id) throw new AppError("Order not found", 404);
  if (order.status !== "ACTIVE") throw new AppError("Only active orders can be cancelled", 400);

  return prisma.messOrder.update({
    where: { id: Number(orderId) },
    data: { status: "CANCELLED" },
  });
};

// ── Admin: get all orders ─────────────────────────────────────
const getAllOrders = async (statusFilter) => {
  return prisma.messOrder.findMany({
    where: statusFilter ? { status: statusFilter } : {},
    include: { student: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });
};

// ── Admin: mark an order as paid ─────────────────────────────
const markPaid = async (orderId) => {
  return prisma.messOrder.update({
    where: { id: Number(orderId) },
    data: { isPaid: true },
  });
};

const markUnpaid = async (orderId) => {
  return prisma.messOrder.update({
    where: { id: Number(orderId) },
    data: { isPaid: false },
  });
};

// ── Student: mark own order as paid (payment confirmation hook) ──
const markPaidByStudent = async (userId, orderId) => {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw new AppError("Student not found", 404);

  const order = await prisma.messOrder.findUnique({ where: { id: Number(orderId) } });
  if (!order || order.studentId !== student.id) throw new AppError("Order not found", 404);

  return prisma.messOrder.update({
    where: { id: Number(orderId) },
    data: { isPaid: true },
  });
};

const createMessRequest = async (userId, { type, dietaryPreference, note }) => {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw new AppError("Student not found", 404);

  if (!["JOIN", "CANCEL"].includes(type)) {
    throw new AppError("Type must be JOIN or CANCEL", 400);
  }

  return prisma.messRequest.create({
    data: {
      studentId: student.id,
      type,
      dietaryPreference,
      note,
      status: "PENDING",
    },
  });
};

const createPauseRequest = async (userId, { pauseStartDate, pauseEndDate, reason }) => {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw new AppError("Student not found", 404);

  if (!pauseStartDate || !pauseEndDate || !reason) {
    throw new AppError("pauseStartDate, pauseEndDate and reason are required", 400);
  }

  const start = new Date(pauseStartDate);
  const end = new Date(pauseEndDate);
  const days = Math.ceil((end - start) / 86400000) + 1;

  if (Number.isNaN(days) || days <= 0) {
    throw new AppError("Invalid pause date range", 400);
  }
  if (days < 5) {
    throw new AppError("Pause request must be for at least 5 days", 400);
  }

  const pauseNote = `[PAUSE REQUEST] ${pauseStartDate} to ${pauseEndDate}: ${reason}`;

  try {
    return await prisma.messRequest.create({
      data: {
        studentId: student.id,
        type: "PAUSE",
        pauseStartDate: start,
        pauseEndDate: end,
        note: reason,
        status: "PENDING",
      },
    });
  } catch (err) {
    const msg = String(err?.message || "");

    if (msg.includes("Expected MessRequestType") || msg.includes("Invalid value for argument `type`")) {
      try {
        return await prisma.messRequest.create({
          data: {
            studentId: student.id,
            type: "CANCEL",
            pauseStartDate: start,
            pauseEndDate: end,
            note: pauseNote,
            status: "PENDING",
          },
        });
      } catch (fallbackErr) {
        const fallbackMsg = String(fallbackErr?.message || "");
        if (fallbackMsg.includes("Unknown argument `pauseStartDate`") || fallbackMsg.includes("Unknown argument `pauseEndDate`")) {
          return prisma.messRequest.create({
            data: {
              studentId: student.id,
              type: "CANCEL",
              note: pauseNote,
              status: "PENDING",
            },
          });
        }
        throw fallbackErr;
      }
    }

    if (msg.includes("Unknown argument `pauseStartDate`") || msg.includes("Unknown argument `pauseEndDate`")) {
      return prisma.messRequest.create({
        data: {
          studentId: student.id,
          type: "PAUSE",
          note: pauseNote,
          status: "PENDING",
        },
      });
    }

    throw err;
  }
};

const getMyMessRequests = async (userId) => {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw new AppError("Student not found", 404);

  return prisma.messRequest.findMany({
    where: { studentId: student.id },
    orderBy: { createdAt: "desc" },
  });
};

const getManagerDashboard = async () => {
  const [
    activeMembers,
    inactiveMembers,
    pendingRequests,
    thisMonthBills,
    unpaidBills,
    announcements,
  ] = await Promise.all([
    prisma.messMembership.count({ where: { status: "ACTIVE" } }),
    prisma.messMembership.count({ where: { status: "INACTIVE" } }),
    prisma.messRequest.count({ where: { status: "PENDING" } }),
    prisma.messBill.aggregate({ _sum: { totalAmount: true } }),
    prisma.messBill.count({ where: { paymentStatus: { in: ["UNPAID", "PARTIAL"] } } }),
    prisma.messAnnouncement.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  return {
    stats: {
      activeMembers,
      inactiveMembers,
      pendingRequests,
      monthlyBillingTotal: thisMonthBills._sum.totalAmount || 0,
      unpaidBills,
    },
    latestAnnouncements: announcements,
  };
};

const getManagerRequests = async (status) => {
  return prisma.messRequest.findMany({
    where: status ? { status } : {},
    include: {
      student: {
        include: {
          user: true,
          roomApplications: {
            where: { status: "ALLOCATED" },
            include: { room: true },
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

const reviewMessRequest = async (requestId, userId, { status }) => {
  if (!["APPROVED", "REJECTED"].includes(status)) {
    throw new AppError("Status must be APPROVED or REJECTED", 400);
  }

  const request = await prisma.messRequest.findUnique({
    where: { id: Number(requestId) },
    include: { student: true },
  });

  if (!request) throw new AppError("Request not found", 404);
  if (request.status !== "PENDING") throw new AppError("Request already reviewed", 400);

  const reviewed = await prisma.messRequest.update({
    where: { id: Number(requestId) },
    data: {
      status,
      reviewedByUserId: userId,
      reviewedAt: new Date(),
    },
  });

  if (status === "APPROVED") {
    if (request.type === "JOIN") {
      const existingActive = await prisma.messMembership.findFirst({
        where: { studentId: request.studentId, status: "ACTIVE" },
      });

      if (!existingActive) {
        await prisma.messMembership.create({
          data: {
            studentId: request.studentId,
            status: "ACTIVE",
            dietaryPreference: request.dietaryPreference,
            startDate: new Date(),
          },
        });
      }

      await prisma.student.update({
        where: { id: request.studentId },
        data: { dietaryPreference: request.dietaryPreference || undefined },
      });
    }

    if (request.type === "CANCEL") {
      await prisma.messMembership.updateMany({
        where: { studentId: request.studentId, status: "ACTIVE" },
        data: { status: "INACTIVE", endDate: new Date() },
      });
    }
  }

  return reviewed;
};

const getMembers = async (status) => {
  return prisma.messMembership.findMany({
    where: status ? { status } : {},
    include: {
      student: {
        include: {
          user: true,
          roomApplications: {
            where: { status: "ALLOCATED" },
            include: { room: true },
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
};

const updateMember = async (membershipId, payload) => {
  const { dietaryPreference, roomNumber, status } = payload;

  return prisma.messMembership.update({
    where: { id: Number(membershipId) },
    data: {
      dietaryPreference,
      roomNumber,
      status,
      ...(status === "INACTIVE" ? { endDate: new Date() } : {}),
    },
    include: { student: { include: { user: true } } },
  });
};

const getStudentProfile = async (studentId) => {
  const student = await prisma.student.findUnique({
    where: { id: Number(studentId) },
    include: {
      user: true,
      messMemberships: { orderBy: { updatedAt: "desc" }, take: 1 },
      messOrders: { orderBy: { createdAt: "desc" }, take: 5 },
      messBills: { orderBy: { createdAt: "desc" }, take: 6 },
      roomApplications: {
        where: { status: "ALLOCATED" },
        include: { room: true },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!student) throw new AppError("Student profile not found", 404);
  return student;
};

const getMenu = async (date, weekStart, weekEnd) => {
  let where = {};

  if (weekStart && weekEnd) {
    where = {
      date: {
        gte: new Date(`${weekStart}T00:00:00.000Z`),
        lt: new Date(`${weekEnd}T23:59:59.999Z`),
      },
    };
  } else if (date) {
    where = {
      date: {
        gte: new Date(`${date}T00:00:00.000Z`),
        lt: new Date(`${date}T23:59:59.999Z`),
      },
    };
  }

  return prisma.messMenuItem.findMany({ where, orderBy: [{ date: "desc" }, { mealType: "asc" }] });
};

const upsertMenuItem = async (userId, payload) => {
  const { date, mealType, itemName, isHoliday, notes } = payload;
  if (!date || !mealType || !itemName) throw new AppError("date, mealType and itemName are required", 400);

  return prisma.messMenuItem.create({
    data: {
      date: new Date(date),
      mealType,
      itemName,
      isHoliday: Boolean(isHoliday),
      notes,
      updatedByUserId: userId,
    },
  });
};

const deleteMenuItem = async (id) => {
  return prisma.messMenuItem.delete({ where: { id: Number(id) } });
};

const generateMonthlyBills = async (userId, { month, year, fixedCharge = 0, perMealCharge = 0, dueDate }) => {
  if (!month || !year) throw new AppError("month and year are required", 400);

  const activeMembers = await prisma.messMembership.findMany({
    where: { status: "ACTIVE" },
    include: { student: true },
  });

  const { start, end } = toMonthRange(month, year);
  const result = [];

  for (const member of activeMembers) {
    const orderCount = await prisma.messOrder.count({
      where: {
        studentId: member.studentId,
        status: { in: ["ACTIVE", "EXPIRED"] },
        startDate: { lt: end },
        endDate: { gte: start },
      },
    });

    const perMealComponent = Number(perMealCharge) * orderCount;
    const totalAmount = Number(fixedCharge) + perMealComponent;

    const bill = await prisma.messBill.upsert({
      where: {
        studentId_month_year: {
          studentId: member.studentId,
          month: Number(month),
          year: Number(year),
        },
      },
      create: {
        studentId: member.studentId,
        month: Number(month),
        year: Number(year),
        fixedCharge: Number(fixedCharge),
        perMealCharge: perMealComponent,
        totalAmount,
        dueDate: dueDate ? new Date(dueDate) : null,
        createdByUserId: userId,
      },
      update: {
        fixedCharge: Number(fixedCharge),
        perMealCharge: perMealComponent,
        totalAmount,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    result.push(bill);
  }

  return result;
};

const getBills = async ({ month, year, paymentStatus }) => {
  return prisma.messBill.findMany({
    where: {
      ...(month ? { month: Number(month) } : {}),
      ...(year ? { year: Number(year) } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
    },
    include: { student: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });
};

const updateBill = async (id, payload) => {
  const { fine = 0, extraCharge = 0, paidAmount = 0, paymentStatus } = payload;

  const existing = await prisma.messBill.findUnique({ where: { id: Number(id) } });
  if (!existing) throw new AppError("Bill not found", 404);

  const newFine = Number(fine);
  const newExtra = Number(extraCharge);
  const recalculatedTotal = Number(existing.fixedCharge) + Number(existing.perMealCharge) + newFine + newExtra;
  const paid = Number(paidAmount);
  const resolvedStatus = paymentStatus || (paid >= recalculatedTotal ? "PAID" : paid > 0 ? "PARTIAL" : "UNPAID");

  return prisma.messBill.update({
    where: { id: Number(id) },
    data: {
      fine: newFine,
      extraCharge: newExtra,
      totalAmount: recalculatedTotal,
      paidAmount: paid,
      paymentStatus: resolvedStatus,
    },
    include: { student: { include: { user: true } } },
  });
};

const exportBillsCsv = async (query) => {
  const bills = await getBills(query);
  const header = [
    "Bill ID",
    "Student Name",
    "ERP",
    "Month",
    "Year",
    "Fixed Charge",
    "Per Meal Charge",
    "Fine",
    "Extra Charge",
    "Total",
    "Paid",
    "Status",
  ];

  const rows = bills.map((b) => [
    b.billId,
    b.student?.user?.fullName || "",
    b.student?.user?.erp || "",
    b.month,
    b.year,
    b.fixedCharge,
    b.perMealCharge,
    b.fine,
    b.extraCharge,
    b.totalAmount,
    b.paidAmount,
    b.paymentStatus,
  ]);

  return [header, ...rows].map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
};

const getAnnouncements = async () => {
  return prisma.messAnnouncement.findMany({ orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }] });
};

const createAnnouncement = async (userId, payload) => {
  const { title, message, type, isPinned } = payload;
  if (!title || !message || !type) throw new AppError("title, message and type are required", 400);

  return prisma.messAnnouncement.create({
    data: {
      title,
      message,
      type,
      isPinned: Boolean(isPinned),
      createdByUserId: userId,
    },
  });
};

const deleteAnnouncement = async (id) => {
  return prisma.messAnnouncement.delete({ where: { id: Number(id) } });
};

const listUsers = async () => {
  return prisma.user.findMany({
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
};

const updateUserAccess = async (id, payload) => {
  const { role, isActive } = payload;

  return prisma.user.update({
    where: { id: Number(id) },
    data: {
      ...(role ? { role } : {}),
      ...(typeof isActive === "boolean" ? { isActive } : {}),
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
    },
  });
};

const removeUser = async (id) => {
  return prisma.user.delete({ where: { id: Number(id) } });
};

module.exports = {
  getMyOrders: withAppError(getMyOrders),
  createOrder: withAppError(createOrder),
  cancelOrder: withAppError(cancelOrder),
  getAllOrders: withAppError(getAllOrders),
  markPaid: withAppError(markPaid),
  markUnpaid: withAppError(markUnpaid),
  markPaidByStudent: withAppError(markPaidByStudent),
  createMessRequest: withAppError(createMessRequest),
  createPauseRequest: withAppError(createPauseRequest),
  getMyMessRequests: withAppError(getMyMessRequests),
  getManagerDashboard: withAppError(getManagerDashboard),
  getManagerRequests: withAppError(getManagerRequests),
  reviewMessRequest: withAppError(reviewMessRequest),
  getMembers: withAppError(getMembers),
  updateMember: withAppError(updateMember),
  getStudentProfile: withAppError(getStudentProfile),
  getMenu: withAppError(getMenu),
  upsertMenuItem: withAppError(upsertMenuItem),
  deleteMenuItem: withAppError(deleteMenuItem),
  generateMonthlyBills: withAppError(generateMonthlyBills),
  getBills: withAppError(getBills),
  updateBill: withAppError(updateBill),
  exportBillsCsv: withAppError(exportBillsCsv),
  getAnnouncements: withAppError(getAnnouncements),
  createAnnouncement: withAppError(createAnnouncement),
  deleteAnnouncement: withAppError(deleteAnnouncement),
  listUsers: withAppError(listUsers),
  updateUserAccess: withAppError(updateUserAccess),
  removeUser: withAppError(removeUser),
};
