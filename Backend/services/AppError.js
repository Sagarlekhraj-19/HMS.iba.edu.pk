class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = "AppError";
    this.status = Number(status) || 500;
  }
}

module.exports = AppError;