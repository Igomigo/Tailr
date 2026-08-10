import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

/**
 * A single resume-building conversation.
 *
 * `jobDescription` and `resumeContext` are pinned here rather than left in the
 * message history: both are needed on every AI turn, and a long refinement
 * chat would otherwise push them out of the recent-history window.
 */
const chatSessionSchema = new Schema(
  {
    // Not a ref yet — auth lands later. Stored from the start so sessions
    // never need backfilling once real users exist.
    userId: { type: String, default: null, index: true },

    title: { type: String, required: true, trim: true, maxlength: 200 },

    jobDescription: { type: String, default: null },

    /** Text extracted from an uploaded resume, reusable on every AI turn. */
    resumeContext: { type: String, default: null },

    lastMessageAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

export type ChatSession = InferSchemaType<typeof chatSessionSchema>;
export type ChatSessionDocument = HydratedDocument<ChatSession>;

export const ChatSessionModel = model("ChatSession", chatSessionSchema);
