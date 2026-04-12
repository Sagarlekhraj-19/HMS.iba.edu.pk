// server/routes/auth.routes.js
const express  = require("express");
const router   = express.Router();
const authSvc  = require("../services/auth.service");
const { protect } = require("../middleware/auth.middleware");

const buildSessionCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
});

const attachSessionCookie = (res, token) => {
  res.cookie("hms_session", token, buildSessionCookieOptions());
};

// POST /api/auth/register
router.post("/register", async (req, res, next) => {
  try {
    const result = await authSvc.register(req.body);
    attachSessionCookie(res, result.token);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

// POST /api/auth/login
router.post("/login", async (req, res, next) => {
  try {
    const result = await authSvc.login(req.body);
    attachSessionCookie(res, result.token);
    res.json(result);
  } catch (err) { next(err); }
});

// POST /api/auth/admin-login  — dedicated admin portal login
router.post("/admin-login", async (req, res, next) => {
  try {
    const result = await authSvc.login({ ...req.body, portal: "ADMIN" });
    attachSessionCookie(res, result.token);
    res.json(result);
  } catch (err) { next(err); }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  res.clearCookie("hms_session", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  res.json({ message: "Logged out" });
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res, next) => {
  try {
    const result = await authSvc.forgotPassword(req.body);
    res.json(result);
  } catch (err) { next(err); }
});

// GET /api/auth/me  (protected)
router.get("/me", protect, async (req, res, next) => {
  try {
    const user = await authSvc.getProfile(req.user.id);
    res.json(user);
  } catch (err) { next(err); }
});

// GET /api/auth/notifications  (protected)
router.get("/notifications", protect, async (req, res, next) => {
  try {
    const list = await authSvc.getNotifications(req.user.id);
    res.json(list);
  } catch (err) { next(err); }
});

module.exports = router;
