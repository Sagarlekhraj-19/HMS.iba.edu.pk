// server/routes/complaint.routes.js
const express       = require("express");
const router        = express.Router();
const complaintSvc  = require("../services/complaint.service");
const { protect, allowRoles } = require("../middleware/auth.middleware");

// GET /api/complaints              — student's complaints (optional ?status=OPEN)
router.get("/", protect, allowRoles("STUDENT"), async (req, res, next) => {
  try {
    const list = await complaintSvc.getMyComplaints(req.user.id, req.query.status);
    res.json(list);
  } catch (err) { next(err); }
});

// POST /api/complaints             — raise a new complaint
router.post("/", protect, allowRoles("STUDENT"), async (req, res, next) => {
  try {
    const c = await complaintSvc.createComplaint(req.user.id, req.body);
    res.status(201).json(c);
  } catch (err) { next(err); }
});

// ── Admin ────────────────────────────────────────────────────

// GET /api/complaints/admin/all    — all complaints
router.get("/admin/all", protect, allowRoles("ADMIN", "COMPLAINT_MANAGER", "CLEANING_MANAGER"), async (req, res, next) => {
  try {
    const list = await complaintSvc.getAllComplaints(req.query.status);
    res.json(list);
  } catch (err) { next(err); }
});

// GET /api/complaints/admin/export  — export complaints CSV
router.get("/admin/export", protect, allowRoles("ADMIN", "COMPLAINT_MANAGER", "CLEANING_MANAGER"), async (req, res, next) => {
  try {
    const csv = await complaintSvc.exportComplaintsCsv(req.query.status);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=complaints-${Date.now()}.csv`);
    res.send(csv);
  } catch (err) { next(err); }
});

// PUT /api/complaints/admin/:id    — update status
router.put("/admin/:id", protect, allowRoles("ADMIN", "COMPLAINT_MANAGER", "CLEANING_MANAGER"), async (req, res, next) => {
  try {
    const c = await complaintSvc.updateComplaint(req.params.id, req.body, req.user.id);
    res.json(c);
  } catch (err) { next(err); }
});

// PUT /api/complaints/:id/reopen   — student reopens resolved complaint
router.put("/:id/reopen", protect, allowRoles("STUDENT"), async (req, res, next) => {
  try {
    const c = await complaintSvc.reopenComplaint(req.user.id, req.params.id);
    res.json(c);
  } catch (err) { next(err); }
});

// GET /api/complaints/:id          — single complaint view
router.get("/:id", protect, allowRoles("STUDENT"), async (req, res, next) => {
  try {
    const c = await complaintSvc.getComplaintById(req.user.id, req.params.id);
    res.json(c);
  } catch (err) { next(err); }
});

// DELETE /api/complaints/:id       — withdraw (delete) a complaint
router.delete("/:id", protect, allowRoles("STUDENT"), async (req, res, next) => {
  try {
    const result = await complaintSvc.deleteComplaint(req.user.id, req.params.id);
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
