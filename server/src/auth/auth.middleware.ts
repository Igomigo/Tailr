import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "./auth.service.js";
import { AppError } from "../shared/errors.js";
import { isProduction } from "../config/env.js";

export const AUTH_COOKIE = "tailr_token";

const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;

/**
 * Stores the auth token in an httpOnly cookie.
 *
 * httpOnly keeps the token out of reach of JavaScript, so an XSS bug cannot
 * read it. SameSite=lax lets the cookie ride along on normal navigation while
 * blocking it on cross-site form posts.
 */
export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: THIRTY_DAYS_MS,
    path: "/",
  });
}

/** Removes the auth cookie on sign out. */
export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  });
}

/**
 * Rejects requests without a valid token, and attaches the user id.
 *
 * @throws AppError 401 when no valid token is present.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = (req.cookies as Record<string, string> | undefined)?.[AUTH_COOKIE];

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
