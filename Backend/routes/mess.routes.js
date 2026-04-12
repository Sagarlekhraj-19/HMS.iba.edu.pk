// server/routes/mess.routes.js
const express  = require("express");
const router   = express.Router();
const messSvc  = require("../services/mess.service");
const { protect, allowRoles } = require("../middleware/auth.middleware");

// GET /api/mess/my-orders
router.get("/my-orders", protect, allowRoles("STUDENT"), async (req, res, next) => {
  try {
    const orders = await messSvc.getMyOrders(req.user.id);
    res.json(orders);
  } catch (err) { next(err); }
});

// GET /api/mess/menu — student/staff menu view (supports ?date=YYYY-MM-DD or ?weekStart&weekEnd)
router.get("/menu", protect, async (req, res, next) => {
  try {
    const menu = await messSvc.getMenu(req.query.date, req.query.weekStart, req.query.weekEnd);
    res.json(menu);
  } catch (err) { next(err); }
});

// POST /api/mess/order  — place a new order
router.post("/order", protect, allowRoles("STUDENT"), async (req, res, next) => {
  try {
    const order = await messSvc.createOrder(req.user.id, req.body);
    res.status(201).json(order);
  } catch (err) { next(err); }
});

// DELETE /api/mess/order/:id  — cancel an order
router.delete("/order/:id", protect, allowRoles("STUDENT"), async (req, res, next) => {
  try {
    const order = await messSvc.cancelOrder(req.user.id, req.params.id);
    res.json(order);
  } catch (err) { next(err); }
});

// ── Admin ────────────────────────────────────────────────────

// GET /api/mess/admin/orders  (optional ?status=ACTIVE)
router.get("/admin/orders", protect, allowRoles("ADMIN", "MESS_MANAGER"), async (req, res, next) => {
  try {
    const orders = await messSvc.getAllOrders(req.query.status);
    res.json(orders);
  } catch (err) { next(err); }
});

// PUT /api/mess/admin/orders/:id/pay  — mark as paid
router.put("/admin/orders/:id/pay", protect, allowRoles("ADMIN", "MESS_MANAGER"), async (req, res, next) => {
  try {
    const order = await messSvc.markPaid(req.params.id);
    res.json(order);
  } catch (err) { next(err); }
});

// PUT /api/mess/admin/orders/:id/unpay  — flag as unpaid
router.put("/admin/orders/:id/unpay", protect, allowRoles("ADMIN", "MESS_MANAGER"), async (req, res, next) => {
  try {
    const order = await messSvc.markUnpaid(req.params.id);
    res.json(order);
  } catch (err) { next(err); }
});

// PUT /api/mess/order/:id/pay  — student confirms payment for own order
router.put("/order/:id/pay", protect, allowRoles("STUDENT"), async (req, res, next) => {
  try {
    const order = await messSvc.markPaidByStudent(req.user.id, req.params.id);
    res.json(order);
  } catch (err) { next(err); }
});

// POST /api/mess/request  — student join/cancel request
router.post("/request", protect, allowRoles("STUDENT"), async (req, res, next) => {
  try {
    const request = await messSvc.createMessRequest(req.user.id, req.body);
    res.status(201).json(request);
  } catch (err) { next(err); }
});

// POST /api/mess/pause-request — student pause request
router.post("/pause-request", protect, allowRoles("STUDENT"), async (req, res, next) => {
  try {
    const request = await messSvc.createPauseRequest(req.user.id, req.body);
    res.status(201).json(request);
  } catch (err) { next(err); }
});

// GET /api/mess/my-requests
router.get("/my-requests", protect, allowRoles("STUDENT"), async (req, res, next) => {
  try {
    const requests = await messSvc.getMyMessRequests(req.user.id);
    res.json(requests);
  } catch (err) { next(err); }
});

// ── Mess Manager ─────────────────────────────────────────────

// GET /api/mess/manager/dashboard
router.get("/manager/dashboard", protect, allowRoles("ADMIN", "MESS_MANAGER"), async (req, res, next) => {
  try {
    const dashboard = await messSvc.getManagerDashboard();
    res.json(dashboard);
  } catch (err) { next(err); }
});

// GET /api/mess/manager/requests
router.get("/manager/requests", protect, allowRoles("ADMIN", "MESS_MANAGER"), async (req, res, next) => {
  try {
    const requests = await messSvc.getManagerRequests(req.query.status);
    res.json(requests);
  } catch (err) { next(err); }
});

// PUT /api/mess/manager/requests/:id/review
router.put("/manager/requests/:id/review", protect, allowRoles("ADMIN", "MESS_MANAGER"), async (req, res, next) => {
  try {
    const result = await messSvc.reviewMessRequest(req.params.id, req.user.id, req.body);
    res.json(result);
  } catch (err) { next(err); }
});

// GET /api/mess/manager/members
router.get("/manager/members", protect, allowRoles("ADMIN", "MESS_MANAGER"), async (req, res, next) => {
  try {
    const members = await messSvc.getMembers(req.query.status);
    res.json(members);
  } catch (err) { next(err); }
});

// PUT /api/mess/manager/members/:id
router.put("/manager/members/:id", protect, allowRoles("ADMIN", "MESS_MANAGER"), async (req, res, next) => {
  try {
    const member = await messSvc.updateMember(req.params.id, req.body);
    res.json(member);
  } catch (err) { next(err); }
});

// GET /api/mess/manager/students/:studentId
router.get("/manager/students/:studentId", protect, allowRoles("ADMIN", "MESS_MANAGER"), async (req, res, next) => {
  try {
    const profile = await messSvc.getStudentProfile(req.params.studentId);
    res.json(profile);
  } catch (err) { next(err); }
});

// GET /api/mess/manager/menu
router.get("/manager/menu", protect, allowRoles("ADMIN", "MESS_MANAGER"), async (req, res, next) => {
  try {
    const menu = await messSvc.getMenu(req.query.date, req.query.weekStart, req.query.weekEnd);
    res.json(menu);
  } catch (err) { next(err); }
});

// POST /api/mess/manager/menu
router.post("/manager/menu", protect, allowRoles("ADMIN", "MESS_MANAGER"), async (req, res, next) => {
  try {
    const item = await messSvc.upsertMenuItem(req.user.id, req.body);
    res.status(201).json(item);
  } catch (err) { next(err); }
});

// DELETE /api/mess/manager/menu/:id
router.delete("/manager/menu/:id", protect, allowRoles("ADMIN", "MESS_MANAGER"), async (req, res, next) => {
  try {
    await messSvc.deleteMenuItem(req.params.id);
    res.json({ message: "Menu item deleted" });
  } catch (err) { next(err); }
});

// POST /api/mess/manager/bills/generate
router.post("/manager/bills/generate", protect, allowRoles("ADMIN", "MESS_MANAGER"), async (req, res, next) => {
  try {
    const bills = await messSvc.generateMonthlyBills(req.user.id, req.body);
    res.status(201).json(bills);
  } catch (err) { next(err); }
});

// GET /api/mess/manager/bills
router.get("/manager/bills", protect, allowRoles("ADMIN", "MESS_MANAGER"), async (req, res, next) => {
  try {
    const bills = await messSvc.getBills(req.query);
    res.json(bills);
  } catch (err) { next(err); }
});

// PUT /api/mess/manager/bills/:id
router.put("/manager/bills/:id", protect, allowRoles("ADMIN", "MESS_MANAGER"), async (req, res, next) => {
  try {
    const bill = await messSvc.updateBill(req.params.id, req.body);
    res.json(bill);
  } catch (err) { next(err); }
});

// GET /api/mess/manager/bills/export
router.get("/manager/bills/export", protect, allowRoles("ADMIN", "MESS_MANAGER"), async (req, res, next) => {
  try {
    const csv = await messSvc.exportBillsCsv(req.query);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=mess-bills-${Date.now()}.csv`);
    res.send(csv);
  } catch (err) { next(err); }
});

// GET /api/mess/manager/announcements
router.get("/manager/announcements", protect, allowRoles("ADMIN", "MESS_MANAGER"), async (req, res, next) => {
  try {
    const list = await messSvc.getAnnouncements();
    res.json(list);
  } catch (err) { next(err); }
});

// POST /api/mess/manager/announcements
router.post("/manager/announcements", protect, allowRoles("ADMIN", "MESS_MANAGER"), async (req, res, next) => {
  try {
    const item = await messSvc.createAnnouncement(req.user.id, req.body);
    res.status(201).json(item);
  } catch (err) { next(err); }
});

// DELETE /api/mess/manager/announcements/:id
router.delete("/manager/announcements/:id", protect, allowRoles("ADMIN", "MESS_MANAGER"), async (req, res, next) => {
  try {
    await messSvc.deleteAnnouncement(req.params.id);
    res.json({ message: "Announcement deleted" });
  } catch (err) { next(err); }
});

// GET /api/mess/manager/users
router.get("/manager/users", protect, allowRoles("ADMIN", "MESS_MANAGER"), async (req, res, next) => {
  try {
    const users = await messSvc.listUsers();
    res.json(users);
  } catch (err) { next(err); }
});

// PUT /api/mess/manager/users/:id
router.put("/manager/users/:id", protect, allowRoles("ADMIN", "MESS_MANAGER"), async (req, res, next) => {
  try {
    const user = await messSvc.updateUserAccess(req.params.id, req.body);
    res.json(user);
  } catch (err) { next(err); }
});

// DELETE /api/mess/manager/users/:id
router.delete("/manager/users/:id", protect, allowRoles("ADMIN", "MESS_MANAGER"), async (req, res, next) => {
  try {
    await messSvc.removeUser(req.params.id);
    res.json({ message: "User removed" });
  } catch (err) { next(err); }
});

module.exports = router;
