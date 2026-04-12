const AppError = require("./AppError");

const normalizeToAppError = (err) => {
  if (err instanceof Error) return err;

  if (err && typeof err === "object") {
    const status = Number(err.status || err.statusCode || 500);
    const message = String(err.message || "Internal server error");
    return new AppError(message, status, { cause: err });
  }

  return new AppError(String(err || "Internal server error"), 500);
};

const withAppError = (fn) => async (...args) => {
  try {
    return await fn(...args);
  } catch (err) {
    throw normalizeToAppError(err);
  }
};

module.exports = withAppError;