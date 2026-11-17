import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { AppError } from "../utils/appError";

export const notFound = (req: Request, res: Response) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

export const errorHandler = async (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const isMulterError = err instanceof multer.MulterError;
  const statusCode = err instanceof AppError
    ? err.statusCode
    : isMulterError
      ? err.code === "LIMIT_FILE_SIZE" ? 413 : 400
      : 500;
  const message = err instanceof AppError || isMulterError
    ? err.message
    : "Internal server Error";

  if (statusCode === 500) console.error(err);

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};