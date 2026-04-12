// server/middleware/auth.middleware.js
const jwt = require("jsonwebtoken");

// Verifies JWT from Authorization header and attaches decoded user to req.user
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const headerToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  const cookieToken = req.cookies?.hms_session;
  const token = headerToken || cookieToken;

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, erp, role }
    next();
  } catch (err) {
    const message = err?.name === "TokenExpiredError"
      ? "Token expired, please log in again"
      : "Invalid token";
    return res.status(401).json({ error: message });
  }
};

const allowRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ error: "Access denied for this role" });
  }
  next();
};

// Only allows ADMIN role through
const adminOnly = allowRoles("ADMIN");

module.exports = { protect, adminOnly, allowRoles };
