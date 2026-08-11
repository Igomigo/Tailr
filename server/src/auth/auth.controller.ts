import type { Request, Response } from "express";
import * as authService from "./auth.service.js";
import { signupSchema, loginSchema } from "./auth.validation.js";
import { setAuthCookie, clearAuthCookie } from "./auth.middleware.js";
import { AppError } from "../shared/errors.js";

/** POST /auth/signup — creates an account and signs the user in. */
export async function signup(req: Request, res: Response): Promise<void> {
  const { name, email, password } = signupSchema.parse(req.body ?? {});
  const user = await authService.signup(name, email, password);

  setAuthCookie(res, authService.signToken(user.id));
  res.status(201).json({ success: true, user });
}

/** POST /auth/login — signs an existing user in. */
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = loginSchema.parse(req.body ?? {});
  const user = await authService.login(email, password);

  setAuthCookie(res, authService.signToken(user.id));
  res.json({ success: true, user });
}

/** POST /auth/logout — clears the session cookie. */
export function logout(_req: Request, res: Response): void {
  clearAuthCookie(res);
  res.json({ success: true });
}

/** GET /auth/me — returns the signed-in user. */
export async function me(req: Request, res: Response): Promise<void> {
  if (!req.userId) throw new AppError(401, "Please sign in to continue.");
  res.json({ success: true, user: await authService.getUser(req.userId) });
}
