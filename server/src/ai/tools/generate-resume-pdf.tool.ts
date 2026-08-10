import { generateResumePdfInputSchema } from "./resume.schema.js";
import { renderResume } from "../../pdf/templates/template.service.js";
import { convertHtmlToPdf } from "../../pdf/gotenberg.service.js";
import { storePdf } from "../../files/file.service.js";
import { saveGeneratedDocument } from "../../documents/document.service.js";
import { badRequest } from "../../shared/errors.js";
import type { Resume } from "../../pdf/templates/resume.types.js";

export interface GenerateResumePdfResult {
  documentUrl: string;
  documentId: string;
}

/** Turns a person's name into a safe, readable download filename. */
function toFileName(fullName: string): string {
  const slug = fullName
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${slug || "resume"}-resume.pdf`;
}

/**
 * Generates the final resume PDF and records it.
 *
 * Runs the full pipeline: validate the model's JSON, render HTML, convert via
 * Gotenberg, store the file, and save a document record.
 *
 * @param rawInput - Unvalidated tool arguments from the model.
 * @param chatSessionId - Session the document belongs to.
 * @returns The download URL and document id, returned to the model.
 * @throws AppError 400 when the model's resume JSON is invalid.
 */
export async function generateResumePdf(
  rawInput: unknown,
  chatSessionId: string,
): Promise<GenerateResumePdfResult> {
  const parsed = generateResumePdfInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "resume"}: ${issue.message}`)
      .join("; ");
    throw badRequest(`Invalid resume data: ${issues}`);
  }

  const { template, resume } = parsed.data;

  const html = renderResume(template, resume as Resume);
  const pdf = await convertHtmlToPdf(html);

  const fileName = toFileName(resume.fullName);
  const stored = await storePdf(pdf, fileName);

  const document = await saveGeneratedDocument({
    chatSessionId,
    fileName,
    template,
    stored,
    resume: resume as Resume,
  });

  return {
    documentUrl: stored.url,
    documentId: String(document._id),
  };
}
