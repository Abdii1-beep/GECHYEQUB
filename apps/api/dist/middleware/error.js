export class AppError extends Error {
    statusCode;
    status;
    isOperational;
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
export const globalErrorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const status = err.status || "error";
    if (process.env.NODE_ENV === "development") {
        res.status(statusCode).json({
            status,
            error: err,
            message: err.message,
            stack: err.stack,
        });
    }
    else {
        if (err.isOperational) {
            res.status(statusCode).json({
                status,
                message: err.message,
            });
        }
        else {
            res.status(500).json({
                status: "error",
                message: "Something went wrong!",
            });
        }
    }
};
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
