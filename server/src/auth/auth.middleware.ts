import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "./auth.service.js";
import { AppError } from "../shared/errors.js";

/**
 * Reads the bearer token from the Authorization header.
 *
 * The token is sent as a header rather than a cookie because the client and
 * this API are served from different domains. Safari, and therefore every
 * browser on iOS, blocks cross-site cookies outright, so a cookie-based
 * session signs the user out on those devices.
 */
function bearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return undefined;

  return header.slice("Bearer ".length).trim() || undefined;
}

/**
 * Rejects requests without a valid token, and attaches the user id.
 *
 * @throws AppError 401 when no valid token is present.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = bearerToken(req);

  if (!token) {
    next(new AppError(401, "Please sign in to continue."));
    return;
  }

  try {
    req.userId = verifyToken(token);
    next();
  } catch (error) {
    next(error);
  }
}
