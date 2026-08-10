import { PDFParse } from "pdf-parse";

/**
 * Extracts plain text from a PDF.
 *
 * Resumes are linear text documents and the consumer is a language model, so
 * layout fidelity does not matter; readable text does.
 *
 * @param buffer - PDF bytes.
 * @returns Extracted text, trimmed.
 */
export async function parsePdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text.trim();
  } finally {
    // Releases the underlying pdf.js document and its worker.
    await parser.destroy();
  }
}
