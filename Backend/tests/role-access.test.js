const jwt = require("jsonwebtoken");
const request = require("supertest");

jest.mock("../services/room.service", () => ({
  getAllRooms: jest.fn().mockResolvedValue([]),
  getMyApplications: jest.fn().mockResolvedValue([]),
  applyForRoom: jest.fn().mockResolvedValue({ id: 1 }),
  getAllApplications: jest.fn().mockResolvedValue([]),
  exportApplicationsCsv: jest.fn().mockResolvedValue(""),
  updateApplicationStatus: jest.fn().mockResolvedValue({ id: 1 }),
  createRoom: jest.fn().mockResolvedValue({ id: 1 }),
  updateRoom: jest.fn().mockResolvedValue({ id: 1 }),
  deleteRoom: jest.fn().mockResolvedValue({}),
  getRoomById: jest.fn().mockResolvedValue({ id: 1 }),
}));

jest.mock("../services/mess.service", () => ({
  getMyOrders: jest.fn().mockResolvedValue([]),
  getMenu: jest.fn().mockResolvedValue([]),
  createOrder: jest.fn().mockResolvedValue({ id: 1 }),
  cancelOrder: jest.fn().mockResolvedValue({ id: 1 }),
  getAllOrders: jest.fn().mockResolvedValue([]),
  markPaid: jest.fn().mockResolvedValue({ id: 1 }),
  markUnpaid: jest.fn().mockResolvedValue({ id: 1 }),
  markPaidByStudent: jest.fn().mockResolvedValue({ id: 1 }),
  createMessRequest: jest.fn().mockResolvedValue({ id: 1 }),
  createPauseRequest: jest.fn().mockResolvedValue({ id: 1 }),
  getMyMessRequests: jest.fn().mockResolvedValue([]),
  getManagerDashboard: jest.fn().mockResolvedValue({}),
  getManagerRequests: jest.fn().mockResolvedValue([]),
  reviewMessRequest: jest.fn().mockResolvedValue({}),
  getMembers: jest.fn().mockResolvedValue([]),
  updateMember: jest.fn().mockResolvedValue({}),
  getStudentProfile: jest.fn().mockResolvedValue({}),
  upsertMenuItem: jest.fn().mockResolvedValue({}),
  deleteMenuItem: jest.fn().mockResolvedValue({}),
  generateMonthlyBills: jest.fn().mockResolvedValue([]),
  getBills: jest.fn().mockResolvedValue([]),
  updateBill: jest.fn().mockResolvedValue({}),
  exportBillsCsv: jest.fn().mockResolvedValue(""),
  getAnnouncements: jest.fn().mockResolvedValue([]),
  createAnnouncement: jest.fn().mockResolvedValue({}),
  deleteAnnouncement: jest.fn().mockResolvedValue({}),
  listUsers: jest.fn().mockResolvedValue([]),
  updateUserAccess: jest.fn().mockResolvedValue({}),
  removeUser: jest.fn().mockResolvedValue({}),
}));

jest.mock("../services/complaint.service", () => ({
  getMyComplaints: jest.fn().mockResolvedValue([]),
  createComplaint: jest.fn().mockResolvedValue({ id: 1 }),
  getAllComplaints: jest.fn().mockResolvedValue([]),
  exportComplaintsCsv: jest.fn().mockResolvedValue(""),
  updateComplaint: jest.fn().mockResolvedValue({ id: 1 }),
  reopenComplaint: jest.fn().mockResolvedValue({ id: 1 }),
  getComplaintById: jest.fn().mockResolvedValue({ id: 1 }),
  deleteComplaint: jest.fn().mockResolvedValue({}),
}));

jest.mock("../services/auth.service", () => ({
  register: jest.fn().mockResolvedValue({ token: "t", user: { role: "STUDENT" } }),
  login: jest.fn().mockResolvedValue({ token: "t", user: { role: "STUDENT" } }),
  forgotPassword: jest.fn().mockResolvedValue({ message: "ok" }),
  getProfile: jest.fn().mockResolvedValue({ id: 1, role: "STUDENT" }),
  getNotifications: jest.fn().mockResolvedValue([]),
}));

jest.mock("../services/prisma", () => ({
  student: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn().mockResolvedValue(null) },
  roomApplication: { count: jest.fn().mockResolvedValue(0) },
  complaint: { count: jest.fn().mockResolvedValue(0) },
  messOrder: { count: jest.fn().mockResolvedValue(0) },
  room: { count: jest.fn().mockResolvedValue(0) },
  feedback: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn().mockResolvedValue({}) },
  user: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn().mockResolvedValue({}), delete: jest.fn().mockResolvedValue({}) },
}));

const app = require("../app");
const roomSvc = require("../services/room.service");
const messSvc = require("../services/mess.service");
const complaintSvc = require("../services/complaint.service");
const prisma = require("../services/prisma");
const authSvc = require("../services/auth.service");

const tokenForRole = (role) =>
  jwt.sign({ id: 999, role, email: `${role.toLowerCase()}@test.com` }, process.env.JWT_SECRET);

describe("Role access matrix", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
  });

  it("denies student token on admin-only route", async () => {
    const res = await request(app)
      .get("/api/rooms/admin/applications")
      .set("Authorization", `Bearer ${tokenForRole("STUDENT")}`);

    expect(res.status).toBe(403);
  });

  it("allows admin token on admin-only route", async () => {
    const res = await request(app)
      .get("/api/rooms/admin/applications")
      .set("Authorization", `Bearer ${tokenForRole("ADMIN")}`);

    expect(res.status).toBe(200);
  });

  it("denies missing token on protected admin route", async () => {
    const res = await request(app).get("/api/admin/dashboard");
    expect(res.status).toBe(401);
  });

  it("allows admin session cookie on admin-only route", async () => {
    const cookieToken = tokenForRole("ADMIN");
    const res = await request(app)
      .get("/api/rooms/admin/applications")
      .set("Cookie", `hms_session=${cookieToken}`);

    expect(res.status).toBe(200);
  });

  it("clears session cookie on logout", async () => {
    const res = await request(app).post("/api/auth/logout");

    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"]?.join(";")).toMatch(/hms_session=;/);
  });

  it("allows student token on student mess route", async () => {
    const res = await request(app)
      .get("/api/mess/my-orders")
      .set("Authorization", `Bearer ${tokenForRole("STUDENT")}`);

    expect(res.status).toBe(200);
  });

  it("denies admin token on student mess route", async () => {
    const res = await request(app)
      .get("/api/mess/my-orders")
      .set("Authorization", `Bearer ${tokenForRole("ADMIN")}`);

    expect(res.status).toBe(403);
  });

  it("allows complaint manager token on complaint admin route", async () => {
    const res = await request(app)
      .get("/api/complaints/admin/all")
      .set("Authorization", `Bearer ${tokenForRole("COMPLAINT_MANAGER")}`);

    expect(res.status).toBe(200);
  });

  it("denies student token on complaint admin route", async () => {
    const res = await request(app)
      .get("/api/complaints/admin/all")
      .set("Authorization", `Bearer ${tokenForRole("STUDENT")}`);

    expect(res.status).toBe(403);
  });

  it("forces ADMIN portal in dedicated admin login route", async () => {
    const res = await request(app)
      .post("/api/auth/admin-login")
      .send({ erp: "31331", password: "qwertyuiop12" });

    expect(res.status).toBe(200);
    expect(authSvc.login).toHaveBeenCalledWith(
      expect.objectContaining({ portal: "ADMIN" })
    );
  });

  it("returns admin dashboard cards payload", async () => {
    const res = await request(app)
      .get("/api/admin/dashboard")
      .set("Authorization", `Bearer ${tokenForRole("ADMIN")}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("totalStudents");
    expect(res.body).toHaveProperty("allocatedRooms");
    expect(res.body).toHaveProperty("availableRooms");
    expect(res.body).toHaveProperty("pendingApps");
    expect(res.body).toHaveProperty("activeComplaints");
    expect(res.body).toHaveProperty("activeOrders");
    expect(res.body).toHaveProperty("unpaidSubscriptions");
  });

  it("requires remarks when rejecting room application", async () => {
    const res = await request(app)
      .put("/api/rooms/admin/applications/5")
      .set("Authorization", `Bearer ${tokenForRole("ADMIN")}`)
      .send({ status: "REJECTED", remarks: "" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Remarks are required/i);
  });

  it("passes admin user id to room application status update", async () => {
    roomSvc.updateApplicationStatus.mockResolvedValueOnce({ id: 5, status: "ALLOCATED" });

    const payload = { status: "ALLOCATED", roomId: 2, remarks: "Approved and allocated" };
    const res = await request(app)
      .put("/api/rooms/admin/applications/5")
      .set("Authorization", `Bearer ${tokenForRole("ADMIN")}`)
      .send(payload);

    expect(res.status).toBe(200);
    expect(roomSvc.updateApplicationStatus).toHaveBeenCalledWith(
      "5",
      expect.objectContaining({
        status: "ALLOCATED",
        roomId: 2,
        remarks: "Approved and allocated",
        adminUserId: 999,
      })
    );
  });

  it("forwards complaint status filter in admin list endpoint", async () => {
    complaintSvc.getAllComplaints.mockResolvedValueOnce([]);

    const res = await request(app)
      .get("/api/complaints/admin/all?status=IN_PROGRESS")
      .set("Authorization", `Bearer ${tokenForRole("COMPLAINT_MANAGER")}`);

    expect(res.status).toBe(200);
    expect(complaintSvc.getAllComplaints).toHaveBeenCalledWith("IN_PROGRESS");
  });

  it("forwards complaint update payload and actor id", async () => {
    complaintSvc.updateComplaint.mockResolvedValueOnce({ id: 12, status: "RESOLVED" });

    const payload = { status: "RESOLVED", remarks: "Resolved after repair" };
    const res = await request(app)
      .put("/api/complaints/admin/12")
      .set("Authorization", `Bearer ${tokenForRole("COMPLAINT_MANAGER")}`)
      .send(payload);

    expect(res.status).toBe(200);
    expect(complaintSvc.updateComplaint).toHaveBeenCalledWith("12", payload, 999);
  });

  it("allows admin to flag active mess subscription as unpaid", async () => {
    messSvc.markUnpaid.mockResolvedValueOnce({ id: 17, isPaid: false });

    const res = await request(app)
      .put("/api/mess/admin/orders/17/unpay")
      .set("Authorization", `Bearer ${tokenForRole("ADMIN")}`);

    expect(res.status).toBe(200);
    expect(messSvc.markUnpaid).toHaveBeenCalledWith("17");
  });

  it("denies admin token on student order creation endpoint", async () => {
    const payload = { mealTypes: ["Breakfast"], startDate: "2026-04-05", endDate: "2026-04-12" };
    const res = await request(app)
      .post("/api/mess/order")
      .set("Authorization", `Bearer ${tokenForRole("ADMIN")}`)
      .send(payload);

    expect(res.status).toBe(403);
  });

  it("allows student complaint withdrawal route", async () => {
    const res = await request(app)
      .delete("/api/complaints/123")
      .set("Authorization", `Bearer ${tokenForRole("STUDENT")}`);

    expect(res.status).toBe(200);
    expect(complaintSvc.deleteComplaint).toHaveBeenCalledWith(999, "123");
  });

  it("applies ALLOCATED filter in admin students queries", async () => {
    prisma.student.count.mockResolvedValueOnce(1);
    prisma.student.findMany.mockResolvedValueOnce([]);

    const res = await request(app)
      .get("/api/admin/students?allocation=ALLOCATED")
      .set("Authorization", `Bearer ${tokenForRole("ADMIN")}`);

    expect(res.status).toBe(200);
    expect(prisma.student.count).toHaveBeenLastCalledWith({
      where: { roomApplications: { some: { status: "ALLOCATED" } } },
    });
    expect(prisma.student.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { roomApplications: { some: { status: "ALLOCATED" } } },
      })
    );
  });

  it("applies UNALLOCATED filter in admin students queries", async () => {
    prisma.student.count.mockResolvedValueOnce(2);
    prisma.student.findMany.mockResolvedValueOnce([]);

    const res = await request(app)
      .get("/api/admin/students?allocation=UNALLOCATED")
      .set("Authorization", `Bearer ${tokenForRole("ADMIN")}`);

    expect(res.status).toBe(200);
    expect(prisma.student.count).toHaveBeenLastCalledWith({
      where: { roomApplications: { none: { status: "ALLOCATED" } } },
    });
    expect(prisma.student.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { roomApplications: { none: { status: "ALLOCATED" } } },
      })
    );
  });
});
