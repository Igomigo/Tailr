import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserModel, type UserDocument } from "./user.model.js";
import { badRequest, AppError } from "../shared/errors.js";
import { env } from "../config/env.js";

const SALT_ROUNDS = 12;
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

/** The user shape returned to clients: never includes the password hash. */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

/** Signs a token identifying the user for subsequent requests. */
export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, {
    expiresIn: TOKEN_TTL_SECONDS,
  });
}

/**
 * Verifies a token and returns the user id it identifies.
 *
 * @throws AppError 401 when the token is missing, malformed, or expired.
 */
export function verifyToken(token: string): string {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub?: string };
    if (!payload.sub) throw new Error("missing subject");
    return payload.sub;
  } catch {
    throw new AppError(401, "Your session has expired. Please sign in again.");
  }
}

/**
 * Creates an account.
 *
 * @throws AppError 400 when the email is already registered.
 */
export async function signup(
  name: string,
  email: string,
  password: string,
): Promise<PublicUser> {
  const existing = await UserModel.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw badRequest("An account with this email already exists. Try signing in.");
  }

  const user = await UserModel.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, SALT_ROUNDS),
  });

  return toPublicUser(user);
}

/**
 * Verifies credentials.
 *
 * The same message is returned whether the email is unknown or the password is
 * wrong, so the response cannot be used to discover which addresses exist.
 *
 * @throws AppError 401 when the credentials do not match.
 */
export async function login(email: string, password: string): Promise<PublicUser> {
  const user = await UserModel.findOne({ email: email.toLowerCase() }).select(
    "+passwordHash",
  );

  const matches = user
    ? await bcrypt.compare(password, user.passwordHash)
    : // Compare against a dummy hash so a missing account takes the same time
      // as a wrong password, leaving no timing signal.
      await bcrypt
        .compare(password, "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva")
        .then(() => false);

  if (!user || !matches) {
    throw new AppError(401, "That email or password is not correct.");
  }

  return toPublicUser(user);
}

/**
 * Loads the signed-in user.
 *
 * @throws AppError 401 when the account no longer exists.
 */
export async function getUser(userId: string): Promise<PublicUser> {
  const user = await UserModel.findById(userId);
  if (!user) throw new AppError(401, "Account not found. Please sign in again.");
  return toPublicUser(user);
}
