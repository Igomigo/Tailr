import { Schema, model, Types, type InferSchemaType, type HydratedDocument } from "mongoose";

/** A resume PDF generated for a chat session. */
const generatedDocumentSchema = new Schema(
  {
    chatSessionId: {
      type: Types.ObjectId,
      ref: "ChatSession",
      required: true,
      index: true,
    },
    fileName: { type: String, required: true },
    template: { type: String, required: true },
    documentUrl: { type: String, required: true },
    /** Storage identifier — a Cloudinary public_id, or a local filename for now. */
    storageId: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    /** The exact resume JSON rendered, so a document can be reproduced later. */
    resumeSnapshot: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

export type GeneratedDocument = InferSchemaType<typeof generatedDocumentSchema>;
export type GeneratedDocumentDoc = HydratedDocument<GeneratedDocument>;

export const GeneratedDocumentModel = model("GeneratedDocument", generatedDocumentSchema);
