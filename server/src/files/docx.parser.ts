import mammoth from "mammoth";

/**
 * Extracts plain text from a DOCX file.
 *
 * Only the modern `.docx` zip format is supported; the legacy binary `.doc`
 * format is rejected earlier, in parsing.service.
 *
 * @param buffer - DOCX bytes.
 * @returns Extracted text, trimmed.
 */
export async function parseDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value.trim();
}
