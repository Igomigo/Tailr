import multer from "multer";
import { ACCEPTED_MIME_TYPES } from "./parsing.service.js";
import { badRequest } from "../shared/errors.js";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 3;

/**
 * Accepts resume attachments on a chat message.
 *
 * Files are kept in memory rather than written to disk: they are immediately
 * uploaded to Cloudinary and parsed, so there is nothing to clean up.
 */
export const uploadResumeFiles = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: MAX_FILES },
  fileFilter: (_req, file, callback) => {
    const isAccepted =
      (ACCEPTED_MIME_TYPES as readonly string[]).includes(file.mimetype) ||
      /\.(pdf|docx)$/i.test(file.originalname);

    if (isAccepted) {
      callback(null, true);
      return;
    }

    callback(badRequest(`"${file.originalname}" must be a PDF or DOCX file.`));
  },
}).array("files", MAX_FILES);
