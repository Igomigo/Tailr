import { Schema, model, Types, type InferSchemaType, type HydratedDocument } from "mongoose";

/** A file the user attached to a chat message. */
const uploadedFileSchema = new Schema(
  {
    chatSessionId: {
      type: Types.ObjectId,
      ref: "ChatSession",
      required: true,
      index: true,
    },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileUrl: { type: String, required: true },
    /** Cloudinary public_id. */
    storageId: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    /** Text extracted at upload time, reused as AI context on later turns. */
    parsedText: { type: String, default: null },
  },
  { timestamps: true },
);

export type UploadedFile = InferSchemaType<typeof uploadedFileSchema>;
export type UploadedFileDocument = HydratedDocument<UploadedFile>;

export const UploadedFileModel = model("UploadedFile", uploadedFileSchema);
