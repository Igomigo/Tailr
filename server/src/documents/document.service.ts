import {
  GeneratedDocumentModel,
  type GeneratedDocumentDoc,
} from "./generated-document.model.js";
import type { Resume } from "../pdf/templates/resume.types.js";
import type { StoredFile } from "../files/file.service.js";

/**
 * Records a generated resume PDF.
 *
 * @param params.chatSessionId - Session the document belongs to.
 * @param params.fileName - Download filename shown to the user.
 * @param params.template - Template used to render it.
 * @param params.stored - Storage result (url, id, size).
 * @param params.resume - Resume JSON rendered, kept so it can be reproduced.
 */
export async function saveGeneratedDocument(params: {
  chatSessionId: string;
  fileName: string;
  template: string;
  stored: StoredFile;
  resume: Resume;
}): Promise<GeneratedDocumentDoc> {
  return GeneratedDocumentModel.create({
    chatSessionId: params.chatSessionId,
    fileName: params.fileName,
    template: params.template,
    documentUrl: params.stored.url,
    storageId: params.stored.storageId,
    sizeBytes: params.stored.sizeBytes,
    resumeSnapshot: params.resume,
  });
}

/** Lists generated documents for a chat session, newest first. */
export async function listDocumentsForSession(
  chatSessionId: string,
): Promise<GeneratedDocumentDoc[]> {
  return GeneratedDocumentModel.find({ chatSessionId }).sort({ createdAt: -1 });
}
