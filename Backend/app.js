require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth.routes");
const roomRoutes = require("./routes/room.routes");
const messRoutes = require("./routes/mess.routes");
const complaintRoutes = require("./routes/complaint.routes");
const adminRoutes = require("./routes/admin.routes");
const feedbackRoutes = require("./routes/feedback.routes");

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
];

const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  if (allowedOrigins.includes(origin)) return true;

  // Allow local dev origins even when Vite auto-increments ports (e.g. 5176+).
  const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
  return localhostPattern.test(origin);
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again later" },
});

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/admin-login", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);

app.get("/", (req, res) => res.json({ message: "HMS API running" }));

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/mess", messRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/admin", adminRoutes);

app.use((err, req, res, next) => {
  console.error(err?.stack || err);
  const status = Number(err?.status || err?.statusCode || 500);
  const message = err?.message || "Internal server error";
  res.status(status).json({ error: message });
});

module.exports = app;
