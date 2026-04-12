// server/routes/room.routes.js
const express   = require("express");
const router    = express.Router();
const jwt = require("jsonwebtoken");
const roomSvc   = require("../services/room.service");
const { protect, adminOnly, allowRoles } = require("../middleware/auth.middleware");
const { subscribeRoomUpdates } = require("../services/realtime");

// ── Public / Student routes ──────────────────────────────────

// GET /api/rooms/stream?token=...  — realtime SSE stream for room updates
router.get("/stream", (req, res) => {
  const token = req.query.token;
  if (!token || typeof token !== "string") {
    return res.status(401).json({ error: "Token is required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const unsubscribe = subscribeRoomUpdates(decoded.id, res);
    req.on("close", unsubscribe);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
});

// GET /api/rooms  — list all rooms (with optional ?block=A&type=SINGLE&available=true)
router.get("/", protect, async (req, res, next) => {
  try {
    const { block, type, available } = req.query;
    const rooms = await roomSvc.getAllRooms({
      block, type,
      available: available !== undefined ? available === "true" : undefined,
    });
    res.json(rooms);
  } catch (err) { next(err); }
});

// GET /api/rooms/my-applications  — student's own applications
router.get("/my-applications", protect, allowRoles("STUDENT"), async (req, res, next) => {
  try {
    const apps = await roomSvc.getMyApplications(req.user.id);
    res.json(apps);
  } catch (err) { next(err); }
});

// POST /api/rooms/apply  — student submits an application
router.post("/apply", protect, allowRoles("STUDENT"), async (req, res, next) => {
  try {
    const app = await roomSvc.applyForRoom(req.user.id, req.body);
    res.status(201).json(app);
  } catch (err) { next(err); }
});

// ── Admin-only routes ────────────────────────────────────────

// GET /api/rooms/admin/applications  — all applications (with optional ?status=PENDING)
router.get("/admin/applications", protect, adminOnly, async (req, res, next) => {
  try {
    const apps = await roomSvc.getAllApplications(req.query.status, req.query.term);
    res.json(apps);
  } catch (err) { next(err); }
});

// GET /api/rooms/admin/applications/export  — export applications CSV
router.get("/admin/applications/export", protect, adminOnly, async (req, res, next) => {
  try {
    const csv = await roomSvc.exportApplicationsCsv(req.query.status, req.query.term);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=room-applications-${Date.now()}.csv`);
    res.send(csv);
  } catch (err) { next(err); }
});

// PUT /api/rooms/admin/applications/:id  — update status, assign room
router.put("/admin/applications/:id", protect, adminOnly, async (req, res, next) => {
  try {
    if (req.body.status === "REJECTED" && !String(req.body.remarks || "").trim()) {
      return res.status(400).json({ error: "Remarks are required when rejecting an application" });
    }

    const updated = await roomSvc.updateApplicationStatus(req.params.id, {
      ...req.body,
      adminUserId: req.user.id,
    });
    res.json(updated);
  } catch (err) { next(err); }
});

// POST /api/rooms/admin/applications/:id/mark-reviewed  — mark as reviewed when admin opens modal
router.post("/admin/applications/:id/mark-reviewed", protect, adminOnly, async (req, res, next) => {
  try {
    const result = await roomSvc.markApplicationAsReviewed(req.params.id, req.user.id);
    res.json(result);
  } catch (err) { next(err); }
});

// POST /api/rooms/admin/create  — admin creates a room
router.post("/admin/create", protect, adminOnly, async (req, res, next) => {
  try {
    const room = await roomSvc.createRoom(req.body);
    res.status(201).json(room);
  } catch (err) { next(err); }
});

// PUT /api/rooms/admin/:id  — admin updates a room
router.put("/admin/:id", protect, adminOnly, async (req, res, next) => {
  try {
    const room = await roomSvc.updateRoom(req.params.id, req.body);
    res.json(room);
  } catch (err) { next(err); }
});

// DELETE /api/rooms/admin/:id  — admin deletes a room
router.delete("/admin/:id", protect, adminOnly, async (req, res, next) => {
  try {
    await roomSvc.deleteRoom(req.params.id);
    res.json({ message: "Room deleted" });
  } catch (err) { next(err); }
});

// GET /api/rooms/:id
router.get("/:id", protect, async (req, res, next) => {
  try {
    const room = await roomSvc.getRoomById(req.params.id);
    res.json(room);
  } catch (err) { next(err); }
});

module.exports = router;
