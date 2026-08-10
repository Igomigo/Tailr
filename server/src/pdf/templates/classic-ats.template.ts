import type { Resume } from "./resume.types.js";
import { escapeHtml, dateRange, joinParts, hasContent } from "./template.utils.js";

/** Renders a `<ul>` of achievement bullets, or nothing when there are none. */
function bulletList(bullets?: string[]): string {
  if (!bullets?.length) return "";
  const items = bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("");
  return `<ul class="bullets">${items}</ul>`;
}

/** Wraps section content in a titled section, or returns "" when body is empty. */
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
    ' <span class="dot">•</span> ',
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
      const place = joinParts([job.company, job.location], ", ");
      return `<article class="entry">
          <div class="entry-head">
            <span class="entry-title">${escapeHtml(job.role)}</span>
            ${dates ? `<span class="entry-dates">${dates}</span>` : ""}
          </div>
          ${place ? `<div class="entry-sub">${place}</div>` : ""}
          ${bulletList(job.bullets)}
        </article>`;
    })
    .join("");
  return section("Experience", items);
}

function renderProjects(resume: Resume): string {
  if (!resume.projects?.length) return "";
  const items = resume.projects
    .map((project) => {
      const tech = project.technologies?.length
        ? `<div class="entry-sub">${escapeHtml(project.technologies.join(", "))}</div>`
        : "";
      return `<article class="entry">
          <div class="entry-head">
            <span class="entry-title">${escapeHtml(project.name)}</span>
          </div>
          ${project.description ? `<p class="entry-text">${escapeHtml(project.description)}</p>` : ""}
          ${tech}
          ${bulletList(project.bullets)}
        </article>`;
    })
    .join("");
  return section("Projects", items);
}

function renderEducation(resume: Resume): string {
  if (!resume.education?.length) return "";
  const items = resume.education
    .map((edu) => {
      const dates = dateRange(edu.startDate, edu.endDate);
      const place = joinParts([edu.school, edu.location], ", ");
      return `<article class="entry">
          <div class="entry-head">
            <span class="entry-title">${escapeHtml(edu.degree ?? edu.school)}</span>
            ${dates ? `<span class="entry-dates">${dates}</span>` : ""}
          </div>
          ${edu.degree ? `<div class="entry-sub">${place}</div>` : ""}
        </article>`;
    })
    .join("");
  return section("Education", items);
}

function renderCertifications(resume: Resume): string {
  if (!resume.certifications?.length) return "";
  const items = resume.certifications
    .map((cert) => {
      const meta = joinParts([cert.issuer, cert.date], " • ");
      return `<article class="entry entry-tight">
          <div class="entry-head">
            <span class="entry-title">${escapeHtml(cert.name)}</span>
          </div>
          ${meta ? `<div class="entry-sub">${meta}</div>` : ""}
        </article>`;
    })
    .join("");
  return section("Certifications", items);
}

/** Renders user-defined sections using the same entry styling as the standard ones. */
function renderCustomSections(resume: Resume): string {
  if (!resume.customSections?.length) return "";
  return resume.customSections
    .map((custom) => {
      const items = custom.items
        .filter(hasContent)
        .map((item) => {
          const heading = item.heading
            ? `<span class="entry-title">${escapeHtml(item.heading)}</span>`
            : "";
          const dates = item.dates ? `<span class="entry-dates">${escapeHtml(item.dates)}</span>` : "";
          return `<article class="entry">
              ${heading || dates ? `<div class="entry-head">${heading}${dates}</div>` : ""}
              ${item.subheading ? `<div class="entry-sub">${escapeHtml(item.subheading)}</div>` : ""}
              ${bulletList(item.bullets)}
            </article>`;
        })
        .join("");
      return section(custom.title, items);
    })
    .join("");
}

const STYLES = `
  /* Page size and margins are set by Gotenberg form fields, which override
     @page rules. This declaration only affects direct browser printing of the
     standalone HTML, and is kept in sync with gotenberg.service.ts. */
  @page { size: A4; margin: 16mm; }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 10.5pt;
    line-height: 1.42;
    color: #1a1a1a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .header { margin-bottom: 14px; }

  .name {
    margin: 0;
    font-size: 21pt;
    font-weight: 700;
    letter-spacing: 0.3px;
  }

  .headline {
    margin: 3px 0 0;
    font-size: 11pt;
    color: #444;
  }

  .contact {
    margin: 6px 0 0;
    font-size: 9.5pt;
    color: #444;
  }

  .contact .dot { color: #999; padding: 0 2px; }

  /* Sections flow across pages: a section taller than one page would
     otherwise be pushed wholesale to the next page, leaving a large gap.
     Individual entries still avoid splitting, and the heading stays with
     the content that follows it. */
  .section { margin-top: 21px; }

  .section-title {
    margin: 0 0 10px;
    padding-bottom: 4px;
    break-after: avoid;
    font-size: 10.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    border-bottom: 1px solid #c8c8c8;
  }

  .summary { margin: 0; text-align: justify; }

  .skills { margin: 0; }

  .entry { margin-bottom: 13px; break-inside: avoid; }
  .entry:last-child { margin-bottom: 0; }
  .entry-tight { margin-bottom: 7px; }

  .entry-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
  }

  .entry-title { font-weight: 700; font-size: 11pt; }

  .entry-dates {
    font-size: 9.5pt;
    color: #555;
    white-space: nowrap;
  }

  .entry-sub {
    font-size: 10pt;
    color: #444;
    margin-top: 1px;
  }

  .entry-text { margin: 4px 0 0; }

  .bullets { margin: 5px 0 0; padding-left: 17px; }
  .bullets li { margin-bottom: 3px; }
  .bullets li:last-child { margin-bottom: 0; }
`;

/**
 * Renders a resume into standalone, ATS-friendly HTML for Gotenberg.
 *
 * Layout is single-column with real text (no tables, no columns, no images) so
 * applicant tracking systems parse it reliably. Page count is unconstrained;
 * `break-inside: avoid` keeps individual entries from splitting across pages.
 *
 * @param resume - Structured resume content.
 * @returns A complete HTML document string.
 */
export function renderClassicAts(resume: Resume): string {
  const skills = resume.skills?.length
    ? section("Skills", `<p class="skills">${escapeHtml(resume.skills.join(" • "))}</p>`)
    : "";

  const summary = resume.summary
    ? section("Summary", `<p class="summary">${escapeHtml(resume.summary)}</p>`)
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
