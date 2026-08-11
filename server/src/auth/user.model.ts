import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

/**
 * An account.
 *
 * `passwordHash` is excluded from queries by default so it cannot reach a
 * response by accident; the login flow selects it explicitly.
 */
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true },
);

export type User = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<User>;

export const UserModel = model("User", userSchema);
