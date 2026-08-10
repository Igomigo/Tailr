import type { Resume } from "./resume.types.js";
import { escapeHtml, dateRange, joinParts, hasContent } from "./template.utils.js";

/**
 * Compact professional template: tighter type and spacing so a long career
 * fits in fewer pages, without dropping below readable print sizes.
 *
 * Company and dates share a line with the role to save vertical space, and
 * skills render as one wrapped line rather than a list.
 */

function bulletList(bullets?: string[]): string {
  if (!bullets?.length) return "";
  return `<ul class="bullets">${bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>`;
}

function section(title: string, body: string): string {
  if (!body.trim()) return "";
  return `<section class="section">
      <h2 class="section-title">${escapeHtml(title)}</h2>
      ${body}
    </section>`;
}

function renderHeader(resume: Resume): string {
  const { contact } = resume;
  const line = joinParts(
    [contact.email, contact.phone, contact.location, contact.linkedin, contact.portfolio],
    " · ",
  );
  return `<header class="header">
      <div class="header-row">
        <h1 class="name">${escapeHtml(resume.fullName)}</h1>
        ${resume.headline ? `<span class="headline">${escapeHtml(resume.headline)}</span>` : ""}
      </div>
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
            <span class="entry-line">
              <span class="entry-title">${escapeHtml(job.role)}</span><span class="at">, ${joinParts([job.company, job.location], ", ")}</span>
            </span>
            ${dates ? `<span class="entry-dates">${dates}</span>` : ""}
          </div>
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
            <span class="entry-line">
              <span class="entry-title">${escapeHtml(project.name)}</span>${
                project.technologies?.length
                  ? `<span class="at">, ${escapeHtml(project.technologies.join(", "))}</span>`
                  : ""
              }
            </span>
          </div>
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
      return `<article class="entry entry-tight">
          <div class="entry-head">
            <span class="entry-line">
              <span class="entry-title">${escapeHtml(edu.degree ?? edu.school)}</span>${
                edu.degree ? `<span class="at">, ${joinParts([edu.school, edu.location], ", ")}</span>` : ""
              }
            </span>
            ${dates ? `<span class="entry-dates">${dates}</span>` : ""}
          </div>
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
          <div class="entry-head">
            <span class="entry-line">
              <span class="entry-title">${escapeHtml(cert.name)}</span>${
                cert.issuer ? `<span class="at">, ${escapeHtml(cert.issuer)}</span>` : ""
              }
            </span>
            ${cert.date ? `<span class="entry-dates">${escapeHtml(cert.date)}</span>` : ""}
          </div>
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
            (item) => `<article class="entry entry-tight">
              ${
                item.heading || item.dates
                  ? `<div class="entry-head">
                      <span class="entry-line">
                        ${item.heading ? `<span class="entry-title">${escapeHtml(item.heading)}</span>` : ""}
                        ${item.subheading ? `<span class="at">, ${escapeHtml(item.subheading)}</span>` : ""}
                      </span>
                      ${item.dates ? `<span class="entry-dates">${escapeHtml(item.dates)}</span>` : ""}
                    </div>`
                  : ""
              }
              ${bulletList(item.bullets)}
            </article>`,
          )
          .join(""),
      ),
    )
    .join("");
}

const STYLES = `
  @page { size: A4; margin: 13mm 15mm; }
  * { box-sizing: border-box; }

  body {
    margin: 0;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 9.6pt;
    line-height: 1.4;
    color: #1c1c1c;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .header { margin-bottom: 13px; }

  .header-row { display: flex; align-items: baseline; gap: 9px; flex-wrap: wrap; }

  .name { margin: 0; font-size: 17pt; font-weight: 700; letter-spacing: -0.2px; }
  .headline { font-size: 9.6pt; color: #5a5a5a; }
  .contact { margin: 3px 0 0; font-size: 8.8pt; color: #4d4d4d; }

  /* Sections flow across pages: a section taller than one page would
     otherwise be pushed wholesale to the next page, leaving a large gap.
     Individual entries still avoid splitting, and the heading stays with
     the content that follows it. */
  .section { margin-top: 16px; }

  .section-title {
    margin: 0 0 7px;
    padding-bottom: 3px;
    break-after: avoid;
    font-size: 9.2pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.9px;
    border-bottom: 0.8px solid #b5b5b5;
  }

  .summary { margin: 0; }
  .skills { margin: 0; }

  .entry { margin-bottom: 10px; break-inside: avoid; }
  .entry:last-child { margin-bottom: 0; }
  .entry-tight { margin-bottom: 5px; }

  .entry-head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
  .entry-line { flex: 1; }
  .entry-title { font-weight: 700; font-size: 10pt; }
  .at { color: #4d4d4d; }
  .entry-dates { font-size: 8.8pt; color: #616161; white-space: nowrap; }
  .entry-text { margin: 2px 0 0; }

  .bullets { margin: 4px 0 0; padding-left: 14px; }
  .bullets li { margin-bottom: 3px; }
  .bullets li:last-child { margin-bottom: 0; }
`;

/**
 * Renders a resume using the compact-professional template.
 *
 * @param resume - Structured resume content.
 * @returns A complete HTML document string.
 */
export function renderCompactProfessional(resume: Resume): string {
  const summary = resume.summary
    ? section("Summary", `<p class="summary">${escapeHtml(resume.summary)}</p>`)
    : "";
  const skills = resume.skills?.length
    ? section("Skills", `<p class="skills">${escapeHtml(resume.skills.join(" · "))}</p>`)
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
