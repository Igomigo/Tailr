import { Schema, model, Types, type InferSchemaType, type HydratedDocument } from "mongoose";

/** Message roles, mirroring the OpenAI chat format so history replays directly. */
export const MESSAGE_ROLES = ["user", "assistant", "tool"] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];

/**
 * One message in a chat session.
 *
 * Tool calls and tool results are stored as their own messages rather than
 * folded into the assistant's text. The AI provider requires that exact
 * sequence when replaying history — an assistant message carrying `toolCalls`,
 * followed by a `tool` message per result — and without it the model loses
 * track of work it already performed, such as an already-generated PDF.
 */
const chatMessageSchema = new Schema(
  {
    chatSessionId: {
      type: Types.ObjectId,
      ref: "ChatSession",
      required: true,
      index: true,
    },

    role: { type: String, enum: MESSAGE_ROLES, required: true },

    /** Null on an assistant message that only requests tool calls. */
    content: { type: String, default: null },

    /** Tool invocations requested by the assistant on this turn. */
    toolCalls: {
      type: [
        {
          _id: false,
          id: { type: String, required: true },
          name: { type: String, required: true },
          arguments: { type: Schema.Types.Mixed, required: true },
          /** Opaque provider data replayed verbatim (e.g. Gemini thoughtSignature). */
          providerMetadata: { type: Schema.Types.Mixed, default: undefined },
        },
      ],
      default: undefined,
    },

    /** Links a `tool` message back to the toolCalls entry it answers. */
    toolCallId: { type: String, default: null },

    /** Name of the tool a `tool` message answers; Gemini matches by name. */
    toolName: { type: String, default: null },

    /** Set on the assistant message that announces a generated resume. */
    documentUrl: { type: String, default: null },

    /**
     * Files attached to a user message.
     *
     * Name and size are copied here rather than only referenced, so the chat
     * can show what was attached without loading each file document.
     */
    attachments: {
      type: [
        {
          _id: false,
          fileId: { type: Types.ObjectId, ref: "UploadedFile", required: true },
          fileName: { type: String, required: true },
          mimeType: { type: String, required: true },
          sizeBytes: { type: Number, required: true },
        },
      ],
      default: undefined,
    },
  },
  { timestamps: true },
);

// History is always read as "this session, in order".
chatMessageSchema.index({ chatSessionId: 1, createdAt: 1 });

export type ChatMessage = InferSchemaType<typeof chatMessageSchema>;
export type ChatMessageDocument = HydratedDocument<ChatMessage>;

export const ChatMessageModel = model("ChatMessage", chatMessageSchema);
