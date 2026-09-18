import type {
  Resume,
  ResumeCertification,
  ResumeCustomSection,
} from "./resume.types.js";
import {
  escapeHtml,
  hasContent,
  joinParts,
} from "./template.utils.js";

/**
 * Editorial template: high-contrast serif display type, restrained rules, and
 * a mostly single-column reading order. The HTML order remains meaningful even
 * where the last two compact sections share a visual row.
 */

type IconName =
  | "email"
  | "phone"
  | "location"
  | "linkedin"
  | "web"
  | "travel"
  | "reading"
  | "nature"
  | "photography"
  | "coffee"
  | "interest";

const ICON_PATHS: Record<IconName, string> = {
  email:
    '<rect x="2.5" y="4.5" width="19" height="15" rx="1.5"/><path d="m3.5 6 8.5 7 8.5-7"/>',
  phone:
    '<path class="icon-fill" d="M7.2 3.2 4.6 4.5c-.8.4-1.2 1.3-.9 2.2 2 6.5 7.1 11.6 13.6 13.6.9.3 1.8-.1 2.2-.9l1.3-2.6c.4-.8.2-1.8-.6-2.3l-3.1-2a1.8 1.8 0 0 0-2.2.2l-1.3 1.3A13.7 13.7 0 0 1 10 10.4l1.3-1.3c.6-.6.7-1.5.2-2.2l-2-3.1c-.5-.8-1.5-1-2.3-.6Z"/>',
  location:
    '<path class="icon-fill" d="M20 10c0 5.4-8 11-8 11S4 15.4 4 10a8 8 0 1 1 16 0Z"/><circle class="icon-hole" cx="12" cy="10" r="2.35"/>',
  linkedin:
    '<rect class="icon-fill" x="2" y="2" width="20" height="20" rx="2.5"/><path class="icon-knockout" d="M7.3 10v7M7.3 7v.1M11.3 17v-4.1a3.2 3.2 0 0 1 6.4 0V17M11.3 10v7"/>',
  web:
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  travel:
    '<path d="M17.8 19 15 10l4.9-4.9c1.1-1.1 1.4-2.4.8-3-.6-.6-1.9-.3-3 .8L13 7.7 4 5 2 7l7 4-4 4-3 1 4 3 1-3 4-4 4 7 2.8-2Z"/>',
  reading:
    '<path d="M3 5.5c3.6-.9 6.6 0 9 2.1v12c-2.4-2.1-5.4-3-9-2.1v-12ZM21 5.5c-3.6-.9-6.6 0-9 2.1v12c2.4-2.1 5.4-3 9-2.1v-12Z"/>',
  nature:
    '<path d="M12 21v-8M12 14C8 14 5 11 5 6c4 0 7 2 7 6M12 16c4 0 7-3 7-8-4 0-7 2-7 6"/>',
  photography:
    '<path d="M4 7h4l1.5-2h5L16 7h4a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="4"/>',
  coffee:
    '<path d="M4 8h13v6a6 6 0 0 1-6 6H10a6 6 0 0 1-6-6V8ZM17 10h2a3 3 0 0 1 0 6h-3M7 3v2M11 2v3M15 3v2"/>',
  interest: '<circle cx="12" cy="12" r="7"/><path d="M12 9v6M9 12h6"/>',
};

function icon(name: IconName): string {
  return `<svg class="icon icon-${name}" viewBox="0 0 24 24" aria-hidden="true">${ICON_PATHS[name]}</svg>`;
}

function contactItem(iconName: IconName, value?: string): string {
  if (!value) return "";
  return `<li>${icon(iconName)}<span>${escapeHtml(value)}</span></li>`;
}

function bulletList(bullets?: string[]): string {
  if (!bullets?.length) return "";
  return `<ul class="bullets">${bullets
    .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
    .join("")}</ul>`;
}

function editorialDateRange(start?: string, end?: string): string {
  return [start, end]
    .filter(Boolean)
    .map((value) => escapeHtml(value as string))
    .join(" - ");
}

function section(title: string, body: string, className = ""): string {
  if (!body.trim()) return "";
  return `<section class="section ${className}">
      <h2 class="section-title">${escapeHtml(title)}</h2>
      <div class="section-content">${body}</div>
    </section>`;
}

function renderHeader(resume: Resume): string {
  const { contact } = resume;
  return `<header class="header">
      <div class="identity">
        <h1>${escapeHtml(resume.fullName)}</h1>
        ${resume.headline ? `<p>${escapeHtml(resume.headline)}</p>` : ""}
      </div>
      <ul class="contact-list">
        ${contactItem("email", contact.email)}
        ${contactItem("phone", contact.phone)}
        ${contactItem("location", contact.location)}
        ${contactItem("linkedin", contact.linkedin)}
        ${contactItem("web", contact.portfolio)}
      </ul>
    </header>`;
}

function renderExperience(resume: Resume): string {
  if (!resume.experience?.length) return "";
  const body = resume.experience
    .map((job) => {
      const dates = editorialDateRange(job.startDate, job.endDate);
      return `<article class="entry">
          <div class="entry-heading">
            <div>
              <h3>${escapeHtml(job.company)}</h3>
              <p class="entry-subtitle">${escapeHtml(job.role)}</p>
            </div>
            <div class="entry-meta">
              ${dates ? `<span>${dates}</span>` : ""}
              ${job.location ? `<span>${escapeHtml(job.location)}</span>` : ""}
            </div>
          </div>
          ${bulletList(job.bullets)}
        </article>`;
    })
    .join("");
  return section("Experience", body);
}

function renderProjects(resume: Resume): string {
  if (!resume.projects?.length) return "";
  const body = resume.projects
    .map(
      (project) => `<article class="entry">
        <div class="entry-heading">
          <div>
            <h3>${escapeHtml(project.name)}</h3>
            ${project.technologies?.length ? `<p class="entry-subtitle">${escapeHtml(project.technologies.join(" | "))}</p>` : ""}
          </div>
        </div>
        ${project.description ? `<p class="entry-description">${escapeHtml(project.description)}</p>` : ""}
        ${bulletList(project.bullets)}
      </article>`,
    )
    .join("");
  return section("Projects", body);
}

function renderEducation(resume: Resume): string {
  if (!resume.education?.length) return "";
  const body = resume.education
    .map((education) => {
      const dates = editorialDateRange(education.startDate, education.endDate);
      return `<article class="entry education-entry">
          <div class="entry-heading">
            <div>
              <h3>${escapeHtml(education.school)}</h3>
              ${education.degree ? `<p class="entry-subtitle">${escapeHtml(education.degree)}</p>` : ""}
            </div>
            <div class="entry-meta">
              ${dates ? `<span>${dates}</span>` : ""}
              ${education.location ? `<span>${escapeHtml(education.location)}</span>` : ""}
            </div>
          </div>
        </article>`;
    })
    .join("");
  return section("Education", body);
}

function renderSkills(resume: Resume): string {
  if (!resume.skills?.length) return "";
  const skills = resume.skills
    .map((skill) => `<li>${escapeHtml(skill)}</li>`)
    .join("");
  return section("Skills", `<ul class="skills-list">${skills}</ul>`);
}

function renderCertifications(certifications?: ResumeCertification[]): string {
  if (!certifications?.length) return "";
  const body = certifications
    .map(
      (certification) => `<article class="compact-entry">
        <div>
          <span>${escapeHtml(certification.name)}</span>
          ${certification.issuer ? `<small>${escapeHtml(certification.issuer)}</small>` : ""}
        </div>
        ${certification.date ? `<time>${escapeHtml(certification.date)}</time>` : ""}
      </article>`,
    )
    .join("");
  return section("Certifications", body, "compact-section certifications");
}

function interestIcon(label: string): IconName {
  const normalized = label.toLowerCase();
  if (/travel|flight|aviation/.test(normalized)) return "travel";
  if (/read|book|literature/.test(normalized)) return "reading";
  if (/yoga|garden|nature|plant/.test(normalized)) return "nature";
  if (/photo|camera/.test(normalized)) return "photography";
  if (/coffee|tea/.test(normalized)) return "coffee";
  return "interest";
}

function renderInterests(sectionData?: ResumeCustomSection): string {
  if (!sectionData) return "";
  const labels = sectionData.items
    .filter(hasContent)
    .flatMap((item) => [item.heading, ...(item.bullets ?? [])])
    .filter(Boolean) as string[];
  if (!labels.length) return "";
  const items = labels
    .map(
      (label) => `<li>${icon(interestIcon(label))}<span>${escapeHtml(label)}</span></li>`,
    )
    .join("");
  return section("Interests", `<ul class="interests-list">${items}</ul>`, "compact-section interests");
}

function renderCustomSections(sections?: ResumeCustomSection[]): string {
  if (!sections?.length) return "";
  return sections
    .filter((custom) => custom.title.toLowerCase() !== "interests")
    .map((custom) => {
      const items = custom.items
        .filter(hasContent)
        .map(
          (item) => `<article class="entry">
            ${
              item.heading || item.dates
                ? `<div class="entry-heading">
                    ${item.heading ? `<h3>${escapeHtml(item.heading)}</h3>` : "<span></span>"}
                    ${item.dates ? `<div class="entry-meta"><span>${escapeHtml(item.dates)}</span></div>` : ""}
                  </div>`
                : ""
            }
            ${item.subheading ? `<p class="entry-subtitle">${escapeHtml(item.subheading)}</p>` : ""}
            ${bulletList(item.bullets)}
          </article>`,
        )
        .join("");
      return section(custom.title, items);
    })
    .join("");
}

const STYLES = `
  @page { size: A4; margin: 13mm; }
  * { box-sizing: border-box; }

  html { background: #fff; }
  body {
    margin: 0;
    color: #17161c;
    font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
    font-size: 10.2pt;
    line-height: 1.34;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .header {
    display: grid;
    grid-template-columns: minmax(0, 1.92fr) minmax(0, 1fr);
    min-height: 34mm;
    padding: 0 0 6.3mm;
    border-bottom: 0.35mm solid #7c7471;
    break-inside: avoid;
  }

  .identity {
    display: flex;
    min-width: 0;
    flex-direction: column;
    justify-content: center;
    padding-right: 8mm;
  }

  .identity h1 {
    margin: -1.5mm 0 0;
    color: #050507;
    font-family: Didot, "Bodoni 72", "Bodoni MT", Georgia, serif;
    font-size: 44pt;
    font-weight: 500;
    line-height: 0.96;
    letter-spacing: -1.8pt;
  }

  .identity p {
    margin: 2.3mm 0 0;
    font-family: Didot, "Bodoni 72", "Bodoni MT", Georgia, serif;
    font-size: 21pt;
    line-height: 1;
  }

  .contact-list {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 3.1mm;
    margin: 0;
    padding: 1mm 0 1mm 8mm;
    border-left: 0.25mm solid #9b9491;
    list-style: none;
    font-size: 9.1pt;
  }

  .contact-list li {
    display: flex;
    align-items: center;
    gap: 4.2mm;
    min-width: 0;
  }

  .contact-list span { overflow-wrap: anywhere; }

  .icon {
    width: 4.4mm;
    height: 4.4mm;
    flex: 0 0 auto;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .icon .icon-fill {
    fill: currentColor;
    stroke: none;
  }

  .icon .icon-hole {
    fill: #fff;
    stroke: none;
  }

  .icon .icon-knockout {
    fill: none;
    stroke: #fff;
    stroke-width: 1.8;
  }

  .contact-list .icon,
  .interests-list .icon {
    color: #000;
  }

  .section {
    margin-top: 4.8mm;
    padding-bottom: 4.6mm;
    border-bottom: 0.25mm solid #8c8581;
  }

  .section-title {
    margin: 0 0 2.4mm;
    break-after: avoid;
    font-size: 9.4pt;
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: 2.6pt;
    text-transform: uppercase;
  }

  .summary p { margin: 0; }
  p { orphans: 3; widows: 3; }

  .entry {
    margin: 0 0 4.4mm;
    break-inside: auto;
  }
  .entry:last-child { margin-bottom: 0; }

  .entry-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8mm;
  }

  .entry-heading > div:first-child { min-width: 0; }

  .entry h3 {
    margin: 0;
    font-family: Didot, "Bodoni 72", "Bodoni MT", Georgia, serif;
    font-size: 14pt;
    font-weight: 700;
    line-height: 1.08;
  }

  .entry-subtitle,
  .entry-description {
    margin: 0.8mm 0 0;
  }

  .entry-meta {
    display: flex;
    min-width: 31mm;
    flex-direction: column;
    align-items: flex-end;
    flex: 0 0 auto;
    font-size: 9.8pt;
    line-height: 1.35;
    text-align: right;
    white-space: nowrap;
  }

  .bullets {
    margin: 2.1mm 0 0;
    padding-left: 6.1mm;
  }

  .bullets li {
    margin-bottom: 0.7mm;
    padding-left: 1mm;
    break-inside: avoid;
  }
  .bullets li:last-child { margin-bottom: 0; }
  .bullets li::marker { color: #827975; font-size: 0.8em; }

  .education-entry {
    margin-bottom: 3mm;
    break-inside: avoid;
  }

  .skills-list {
    display: flex;
    flex-wrap: wrap;
    row-gap: 2.5mm;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .skills-list li {
    display: flex;
    align-items: center;
    white-space: nowrap;
  }

  .skills-list li:not(:last-child)::after {
    width: 0.25mm;
    height: 5mm;
    margin: 0 8mm;
    background: #988f8b;
    content: "";
  }

  .closing-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.12fr) minmax(0, 1fr);
    border-bottom: 0.25mm solid #8c8581;
    break-inside: avoid;
  }

  .closing-grid.single { grid-template-columns: 1fr; }

  .compact-section {
    margin-top: 4.8mm;
    padding-bottom: 1.5mm;
    border-bottom: 0;
  }

  .compact-section + .compact-section {
    margin-left: 9mm;
    padding-left: 9mm;
    border-left: 0.25mm solid #a39c99;
  }

  .compact-entry {
    display: flex;
    justify-content: space-between;
    gap: 5mm;
    margin-bottom: 2mm;
    break-inside: avoid;
  }

  .compact-entry > div {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .compact-entry small { color: #615b59; font-size: 8.5pt; }
  .compact-entry time { flex: 0 0 auto; }

  .interests-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4mm 6mm;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .interests-list li {
    display: flex;
    align-items: center;
    gap: 2.6mm;
    white-space: nowrap;
  }

  .interests-list .icon {
    width: 5.5mm;
    height: 5.5mm;
    stroke-width: 1.4;
  }

  @media print {
    .section-title { break-after: avoid-page; }
    .entry-heading { break-after: avoid-page; }
  }
`;

/** Renders Editorial as a complete, print-ready HTML document. */
export function renderEditorial(resume: Resume): string {
  const interests = resume.customSections?.find(
    (custom) => custom.title.toLowerCase() === "interests",
  );
  const certifications = renderCertifications(resume.certifications);
  const interestSection = renderInterests(interests);
  const closing = certifications || interestSection
    ? `<div class="closing-grid ${certifications && interestSection ? "" : "single"}">${certifications}${interestSection}</div>`
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
  ${resume.summary ? section("Summary", `<div class="summary"><p>${escapeHtml(resume.summary)}</p></div>`) : ""}
  ${renderExperience(resume)}
  ${renderProjects(resume)}
  ${renderEducation(resume)}
  ${renderSkills(resume)}
  ${renderCustomSections(resume.customSections)}
  ${closing}
</body>
</html>`;
}
