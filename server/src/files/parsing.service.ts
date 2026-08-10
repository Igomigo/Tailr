import { parsePdf } from "./pdf.parser.js";
import { parseDocx } from "./docx.parser.js";
import { badRequest } from "../shared/errors.js";

const PDF_MIME = "application/pdf";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** File types accepted for upload. */
export const ACCEPTED_MIME_TYPES = [PDF_MIME, DOCX_MIME] as const;

/**
 * Extracts text from an uploaded resume, choosing a parser by file type.
 *
 * Callers receive plain text regardless of the source format, so the AI layer
 * never needs to know which parser ran.
 *
 * @param buffer - File bytes.
 * @param mimeType - MIME type reported by the upload.
 * @param fileName - Original filename, used as a fallback signal and in errors.
 * @returns Extracted text.
 * @throws AppError 400 for unsupported types or unreadable files.
 */
export async function parseFile(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<string> {
  const lowerName = fileName.toLowerCase();

  // Mammoth cannot read the legacy binary .doc format, so it is rejected with
  // an actionable message rather than failing deep inside the parser.
  if (lowerName.endsWith(".doc")) {
    throw badRequest(
      `"${fileName}" uses the older .doc format. Please save it as .docx or PDF and upload again.`,
    );
  }

  let text: string;

  try {
    if (mimeType === PDF_MIME || lowerName.endsWith(".pdf")) {
      text = await parsePdf(buffer);
    } else if (mimeType === DOCX_MIME || lowerName.endsWith(".docx")) {
      text = await parseDocx(buffer);
    } else {
      throw badRequest(
        `"${fileName}" is not a supported file type. Please upload a PDF or DOCX.`,
      );
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AppError") throw error;
    throw badRequest(
      `Could not read "${fileName}". The file may be corrupted or password protected.`,
    );
  }

  if (!text) {
    throw badRequest(
      `No text could be extracted from "${fileName}". If it is a scanned document, please upload a text-based PDF instead.`,
    );
  }

  return text;
}
