import type { Request, Response } from "express";
import * as authService from "./auth.service.js";
import { signupSchema, loginSchema } from "./auth.validation.js";
import { AppError } from "../shared/errors.js";

/** POST /auth/signup — creates an account and signs the user in. */
export async function signup(req: Request, res: Response): Promise<void> {
  const { name, email, password } = signupSchema.parse(req.body ?? {});
  const user = await authService.signup(name, email, password);

  res.status(201).json({ success: true, user, token: authService.signToken(user.id) });
}

/** POST /auth/login — signs an existing user in. */
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = loginSchema.parse(req.body ?? {});
  const user = await authService.login(email, password);

  res.json({ success: true, user, token: authService.signToken(user.id) });
}

/**
 * POST /auth/logout — ends the session.
 *
 * Nothing is held server side: the token is stateless, so signing out is the
 * client discarding it. The endpoint remains so the client has one place to
 * call and so revocation can be added here later without a client change.
 */
export function logout(_req: Request, res: Response): void {
  res.json({ success: true });
}

/** GET /auth/me — returns the signed-in user. */
export async function me(req: Request, res: Response): Promise<void> {
  if (!req.userId) throw new AppError(401, "Please sign in to continue.");
  res.json({ success: true, user: await authService.getUser(req.userId) });
}
