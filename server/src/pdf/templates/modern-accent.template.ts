import type { Resume } from "./resume.types.js";
import { escapeHtml, dateRange, joinParts, hasContent } from "./template.utils.js";

/**
 * Modern accent template: a single accent colour, generous spacing, and a
 * left rule marking each section.
 *
 * Still single-column with real text and no tables or images, so it remains
 * ATS-safe. The colour is decoration only, never a carrier of meaning.
 */

const ACCENT = "#1f4e79";

function bulletList(bullets?: string[]): string {
  if (!bullets?.length) return "";
  return `<ul class="bullets">${bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>`;
}

function section(title: string, body: string): string {
  if (!body.trim()) return "";
  return `<section class="section">
      <h2 class="section-title">${escapeHtml(title)}</h2>
      <div class="section-body">${body}</div>
    </section>`;
}

function renderHeader(resume: Resume): string {
  const { contact } = resume;
  const line = joinParts(
    [contact.email, contact.phone, contact.location, contact.linkedin, contact.portfolio],
    ' <span class="sep">|</span> ',
  );
  return `<header class="header">
      <h1 class="name">${escapeHtml(resume.fullName)}</h1>
      ${resume.headline ? `<p class="headline">${escapeHtml(resume.headline)}</p>` : ""}
      ${line ? `<p class="contact">${line}</p>` : ""}
    </header>`;
}

function renderExperience(resume: Resume): string {
  if (!resume.experience?.length) return "";
  const items = resume.experience
    .map((job) => {
      const dates = dateRange(job.startDate, job.endDate);
      return `<article class="entry">
          <div class="entry-head">
            <span class="entry-title">${escapeHtml(job.role)}</span>
            ${dates ? `<span class="entry-dates">${dates}</span>` : ""}
          </div>
          <div class="entry-sub">${joinParts([job.company, job.location], ", ")}</div>
          ${bulletList(job.bullets)}
        </article>`;
    })
    .join("");
  return section("Experience", items);
}

function renderProjects(resume: Resume): string {
  if (!resume.projects?.length) return "";
  const items = resume.projects
    .map(
      (project) => `<article class="entry">
          <div class="entry-head">
            <span class="entry-title">${escapeHtml(project.name)}</span>
          </div>
          ${project.technologies?.length ? `<div class="entry-sub">${escapeHtml(project.technologies.join(", "))}</div>` : ""}
          ${project.description ? `<p class="entry-text">${escapeHtml(project.description)}</p>` : ""}
          ${bulletList(project.bullets)}
        </article>`,
    )
    .join("");
  return section("Projects", items);
}

function renderEducation(resume: Resume): string {
  if (!resume.education?.length) return "";
  const items = resume.education
    .map((edu) => {
      const dates = dateRange(edu.startDate, edu.endDate);
      return `<article class="entry">
          <div class="entry-head">
            <span class="entry-title">${escapeHtml(edu.degree ?? edu.school)}</span>
            ${dates ? `<span class="entry-dates">${dates}</span>` : ""}
          </div>
          <div class="entry-sub">${joinParts([edu.school, edu.location], ", ")}</div>
        </article>`;
    })
    .join("");
  return section("Education", items);
}

function renderCertifications(resume: Resume): string {
  if (!resume.certifications?.length) return "";
  const items = resume.certifications
    .map(
      (cert) => `<article class="entry entry-tight">
          <div class="entry-head"><span class="entry-title">${escapeHtml(cert.name)}</span></div>
          <div class="entry-sub">${joinParts([cert.issuer, cert.date], ", ")}</div>
        </article>`,
    )
    .join("");
  return section("Certifications", items);
}

function renderCustomSections(resume: Resume): string {
  if (!resume.customSections?.length) return "";
  return resume.customSections
    .map((custom) =>
      section(
        custom.title,
        custom.items
          .filter(hasContent)
          .map(
            (item) => `<article class="entry">
              ${
                item.heading || item.dates
                  ? `<div class="entry-head">
                      ${item.heading ? `<span class="entry-title">${escapeHtml(item.heading)}</span>` : ""}
                      ${item.dates ? `<span class="entry-dates">${escapeHtml(item.dates)}</span>` : ""}
                    </div>`
                  : ""
              }
              ${item.subheading ? `<div class="entry-sub">${escapeHtml(item.subheading)}</div>` : ""}
              ${bulletList(item.bullets)}
            </article>`,
          )
          .join(""),
      ),
    )
    .join("");
}

const STYLES = `
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }

  body {
    margin: 0;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 10.5pt;
    line-height: 1.45;
    color: #22252a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .header { border-bottom: 2.5px solid ${ACCENT}; padding-bottom: 10px; margin-bottom: 4px; }

  .name {
    margin: 0;
    font-size: 23pt;
    font-weight: 700;
    color: ${ACCENT};
    letter-spacing: -0.2px;
  }

  .headline { margin: 4px 0 0; font-size: 11pt; color: #4a5058; font-weight: 500; }
  .contact { margin: 7px 0 0; font-size: 9.5pt; color: #4a5058; }
  .contact .sep { color: #b9c0c8; padding: 0 3px; }

  /* Sections flow across pages: a section taller than one page would
     otherwise be pushed wholesale to the next page, leaving a large gap.
     Individual entries still avoid splitting, and the heading stays with
     the content that follows it. */
  .section { margin-top: 20px; }

  .section-title {
    margin: 0 0 9px;
    break-after: avoid;
    font-size: 10pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.4px;
    color: ${ACCENT};
  }

  /* Left rule ties each section to the header colour without using a table. */
  .section-body { border-left: 2px solid #dde3ea; padding-left: 11px; }

  .summary { margin: 0; }
  .skills { margin: 0; }

  .entry { margin-bottom: 13px; break-inside: avoid; }
  .entry:last-child { margin-bottom: 0; }
  .entry-tight { margin-bottom: 7px; }

  .entry-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
  .entry-title { font-weight: 700; font-size: 11pt; color: #14171a; }
  .entry-dates { font-size: 9pt; color: #6b727b; white-space: nowrap; }
  .entry-sub { font-size: 9.5pt; color: #565d66; margin-top: 1px; }
  .entry-text { margin: 4px 0 0; }

  .bullets { margin: 5px 0 0; padding-left: 16px; }
  .bullets li { margin-bottom: 3px; }
  .bullets li::marker { color: ${ACCENT}; }
  .bullets li:last-child { margin-bottom: 0; }
`;

/**
 * Renders a resume using the modern-accent template.
 *
 * @param resume - Structured resume content.
 * @returns A complete HTML document string.
 */
export function renderModernAccent(resume: Resume): string {
  const summary = resume.summary
    ? section("Summary", `<p class="summary">${escapeHtml(resume.summary)}</p>`)
    : "";
  const skills = resume.skills?.length
    ? section("Skills", `<p class="skills">${escapeHtml(resume.skills.join(" • "))}</p>`)
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(resume.fullName)} Resume</title>
  <style>${STYLES}</style>
</head>
<body>
  ${renderHeader(resume)}
  ${summary}
  ${skills}
  ${renderExperience(resume)}
  ${renderProjects(resume)}
  ${renderEducation(resume)}
  ${renderCertifications(resume)}
  ${renderCustomSections(resume)}
</body>
</html>`;
}
