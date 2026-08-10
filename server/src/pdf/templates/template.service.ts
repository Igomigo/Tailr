import type { Resume, TemplateName } from "./resume.types.js";
import { renderClassicAts } from "./classic-ats.template.js";
import { renderModernAccent } from "./modern-accent.template.js";
import { renderCompactProfessional } from "./compact-professional.template.js";

/** Template renderers by name. */
const TEMPLATES: Record<TemplateName, (resume: Resume) => string> = {
  "classic-ats": renderClassicAts,
  "modern-accent": renderModernAccent,
  "compact-professional": renderCompactProfessional,
};

/** Used when no template is given, or the requested name is not recognised. */
export const DEFAULT_TEMPLATE: TemplateName = "modern-accent";

/**
 * Renders resume JSON into a complete HTML document.
 *
 * @param templateName - Template to use; unknown names fall back to the default.
 * @param resume - Structured resume content.
 * @returns A standalone HTML string ready for PDF conversion.
 */
export function renderResume(templateName: TemplateName, resume: Resume): string {
  const render = TEMPLATES[templateName] ?? TEMPLATES[DEFAULT_TEMPLATE];
  return render(resume);
}
