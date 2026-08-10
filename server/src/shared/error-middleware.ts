import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import mongoose from "mongoose";
import { MulterError } from "multer";
import { AppError } from "./errors.js";
import { isProduction } from "../config/env.js";

/** Handles requests that matched no route. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Converts any error thrown in a route into a consistent JSON response.
 *
 * Known error types are mapped to meaningful status codes; anything else is a
 * 500 whose message is hidden in production so internals are never exposed.
 * Express 5 forwards rejected promises here automatically.
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: "Validation failed",
      details: error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  // Upload limits (file too large, too many files) are client errors.
  if (error instanceof MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "File is too large. The maximum size is 10MB."
        : error.code === "LIMIT_FILE_COUNT"
          ? "Too many files. You can attach up to 3."
          : `Upload failed: ${error.message}`;
    res.status(400).json({ success: false, error: message });
    return;
  }

  // Malformed ObjectId in a path parameter is a client error, not a server one.
  if (error instanceof mongoose.Error.CastError) {
    res.status(400).json({ success: false, error: `Invalid ${error.path}` });
    return;
  }

  console.error("Unhandled error:", error);

  res.status(500).json({
    success: false,
    error: isProduction
      ? "Internal server error"
      : error instanceof Error
        ? error.message
        : "Internal server error",
  });
}
