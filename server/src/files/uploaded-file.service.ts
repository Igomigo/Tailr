import { storeUpload } from "./file.service.js";
import { parseFile } from "./parsing.service.js";
import {
  UploadedFileModel,
  type UploadedFileDocument,
} from "./uploaded-file.model.js";

/** A file received from multer's memory storage. */
export interface IncomingFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

/**
 * Uploads attachments to Cloudinary, extracts their text, and records them.
 *
 * Parsed text is stored on each file document so it can be re-injected as AI
 * context on later turns, long after the original message has scrolled out of
 * the history window.
 *
 * @param files - Attachments from the request.
 * @param chatSessionId - Session the files belong to.
 * @returns The persisted file documents.
 */
export async function processUploadedFiles(
  files: IncomingFile[],
  chatSessionId: string,
): Promise<UploadedFileDocument[]> {
  return Promise.all(
    files.map(async (file) => {
      const [stored, parsedText] = await Promise.all([
        storeUpload(file.buffer, file.originalname),
        parseFile(file.buffer, file.mimetype, file.originalname),
      ]);

      return UploadedFileModel.create({
        chatSessionId,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileUrl: stored.url,
        storageId: stored.storageId,
        sizeBytes: stored.sizeBytes,
        parsedText,
      });
    }),
  );
}

/** Combines extracted text from several files into one context block. */
export function combineParsedText(files: UploadedFileDocument[]): string {
  return files
    .filter((file) => file.parsedText)
    .map((file) => `--- ${file.fileName} ---\n${file.parsedText}`)
    .join("\n\n");
}
