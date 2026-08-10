/**
 * An error with an associated HTTP status code.
 *
 * Anything thrown that is not an AppError is treated as an unexpected failure
 * and reported as a 500 with a generic message, so internal details never leak.
 */
export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/** 400 — the request was malformed or failed validation. */
export const badRequest = (message: string, details?: unknown): AppError =>
  new AppError(400, message, details);

/** 404 — the requested resource does not exist. */
export const notFound = (message: string): AppError => new AppError(404, message);

/** 502 — an upstream dependency (AI, Gotenberg, Cloudinary) failed. */
export const upstreamError = (message: string): AppError => new AppError(502, message);
