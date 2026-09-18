import type {
  Resume,
  ResumeCustomSection,
} from "./resume.types.js";
import { escapeHtml, hasContent } from "./template.utils.js";

/**
 * Atlas: a crisp blue-accented resume with a soft header panel, an experience
 * timeline, and compact skill pills. Content remains in semantic reading order
 * and is allowed to continue naturally across A4 pages.
 */

type ContactIcon = "email" | "phone" | "location" | "linkedin" | "web";

const CONTACT_ICONS: Record<ContactIcon, string> = {
  email:
    '<rect x="2.5" y="4.5" width="19" height="15" rx="1.5"/><path d="m3.5 6 8.5 7 8.5-7"/>',
  phone:
    '<path class="icon-fill" d="M7.2 3.2 4.6 4.5c-.8.4-1.2 1.3-.9 2.2 2 6.5 7.1 11.6 13.6 13.6.9.3 1.8-.1 2.2-.9l1.3-2.6c.4-.8.2-1.8-.6-2.3l-3.1-2a1.8 1.8 0 0 0-2.2.2l-1.3 1.3A13.7 13.7 0 0 1 10 10.4l1.3-1.3c.6-.6.7-1.5.2-2.2l-2-3.1c-.5-.8-1.5-1-2.3-.6Z"/>',
  location:
    '<path class="icon-fill" d="M20 10c0 5.4-8 11-8 11S4 15.4 4 10a8 8 0 1 1 16 0Z"/><circle class="icon-hole" cx="12" cy="10" r="2.3"/>',
  linkedin:
    '<rect class="icon-fill" x="2" y="2" width="20" height="20" rx="2.4"/><path class="icon-knockout" d="M7.2 10v7M7.2 7v.1M11.3 17v-4.1a3.2 3.2 0 0 1 6.4 0V17M11.3 10v7"/>',
  web:
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
};

function contactIcon(name: ContactIcon): string {
  return `<svg class="contact-icon icon-${name}" viewBox="0 0 24 24" aria-hidden="true">${CONTACT_ICONS[name]}</svg>`;
}

function contactItem(name: ContactIcon, value?: string): string {
  if (!value) return "";
  return `<li>${contactIcon(name)}<span>${escapeHtml(value)}</span></li>`;
}

function atlasDateRange(start?: string, end?: string): string {
  return [start, end]
    .filter(Boolean)
    .map((value) => escapeHtml(value as string))
    .join(" - ");
}

function bulletList(bullets?: string[]): string {
  if (!bullets?.length) return "";
  return `<ul class="bullets">${bullets
    .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
    .join("")}</ul>`;
}

function section(title: string, body: string, className = ""): string {
  if (!body.trim()) return "";
  return `<section class="section ${className}">
      <div class="section-heading">
        <h2>${escapeHtml(title)}</h2>
        <span aria-hidden="true"></span>
      </div>
      <div class="section-content">${body}</div>
    </section>`;
}

function findSpecialSection(
  sections: ResumeCustomSection[] | undefined,
  title: string,
): ResumeCustomSection | undefined {
  return sections?.find(
    (sectionData) => sectionData.title.trim().toLowerCase() === title,
  );
}

function sectionLabels(sectionData?: ResumeCustomSection): string[] {
  if (!sectionData) return [];
  return sectionData.items
    .filter(hasContent)
    .flatMap((item) => [item.heading, item.subheading, ...(item.bullets ?? [])])
    .filter(Boolean) as string[];
}

function renderHeader(resume: Resume): string {
  const tagline = sectionLabels(
    findSpecialSection(resume.customSections, "tagline"),
  )[0];
  const { contact } = resume;

  return `<header class="hero">
      <div class="identity">
        <h1>${escapeHtml(resume.fullName)}</h1>
        ${resume.headline ? `<p class="headline">${escapeHtml(resume.headline)}</p>` : ""}
        ${tagline ? `<p class="tagline">${escapeHtml(tagline)}</p>` : ""}
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
  const body = `<div class="timeline">${resume.experience
    .map((job, index) => {
      const dates = atlasDateRange(job.startDate, job.endDate);
      return `<article class="timeline-entry${index === resume.experience!.length - 1 ? " timeline-entry-last" : ""}">
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
    .join("")}</div>`;
  return section("Experience", body, "experience-section");
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
      const dates = atlasDateRange(education.startDate, education.endDate);
      return `<article class="entry compact-entry">
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

function renderPills(title: string, values?: string[]): string {
  if (!values?.length) return "";
  return section(
    title,
    `<ul class="pill-list">${values
      .map((value) => `<li>${escapeHtml(value)}</li>`)
      .join("")}</ul>`,
    "pill-section",
  );
}

function renderCertifications(resume: Resume): string {
  if (!resume.certifications?.length) return "";
  const body = resume.certifications
    .map(
      (certification) => `<article class="entry compact-entry">
        <div class="entry-heading">
          <div>
            <h3>${escapeHtml(certification.name)}</h3>
            ${certification.issuer ? `<p class="entry-subtitle">${escapeHtml(certification.issuer)}</p>` : ""}
          </div>
          ${certification.date ? `<div class="entry-meta"><span>${escapeHtml(certification.date)}</span></div>` : ""}
        </div>
      </article>`,
    )
    .join("");
  return section("Certifications", body);
}

function renderCustomSections(sections?: ResumeCustomSection[]): string {
  if (!sections?.length) return "";
  return sections
    .filter((custom) => {
      const title = custom.title.trim().toLowerCase();
      return title !== "tagline" && title !== "tools";
    })
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
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }

  html { background: #fff; }
  body {
    margin: 0;
    color: #405579;
    font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
    font-size: 9.8pt;
    line-height: 1.35;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .hero {
    display: grid;
    grid-template-columns: minmax(0, 1.9fr) minmax(0, 1fr);
    min-height: 45mm;
    padding: 6.5mm 7mm;
    border-radius: 2.2mm;
    background: #eaf4ff;
    break-inside: avoid;
  }

  .identity {
    display: flex;
    min-width: 0;
    flex-direction: column;
    justify-content: center;
    padding-right: 7mm;
  }

  .identity h1 {
    margin: 0;
    color: #060a18;
    font-size: 34pt;
    font-weight: 750;
    line-height: 0.98;
    letter-spacing: -1.5pt;
  }

  .headline {
    margin: 2.5mm 0 0;
    color: #465676;
    font-size: 15.5pt;
    font-weight: 700;
    line-height: 1;
  }

  .tagline {
    max-width: 96mm;
    margin: 4mm 0 0;
    color: #4b6288;
    font-size: 10.5pt;
    line-height: 1.35;
  }

  .contact-list {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 3.3mm;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 9.1pt;
  }

  .contact-list li {
    display: flex;
    align-items: center;
    gap: 4mm;
    min-width: 0;
  }

  .contact-list span { overflow-wrap: anywhere; }

  .contact-icon {
    width: 4.8mm;
    height: 4.8mm;
    flex: 0 0 auto;
    color: #0878f9;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .contact-icon .icon-fill {
    fill: currentColor;
    stroke: none;
  }

  .contact-icon .icon-hole {
    fill: #eaf4ff;
    stroke: none;
  }

  .contact-icon .icon-knockout {
    fill: none;
    stroke: #fff;
    stroke-width: 1.8;
  }

  .section { margin-top: 7.2mm; }

  .section-heading {
    display: flex;
    align-items: center;
    gap: 4.2mm;
    margin-bottom: 3.3mm;
    break-after: avoid;
  }

  .section-heading h2 {
    margin: 0;
    color: #070c1c;
    font-size: 10.3pt;
    font-weight: 750;
    line-height: 1;
    letter-spacing: 2.5pt;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .section-heading span {
    height: 0.25mm;
    flex: 1;
    background: #7bb4f5;
  }

  .summary { margin: 0; }
  p { orphans: 3; widows: 3; }

  .timeline { margin-top: 0.5mm; }

  .timeline-entry {
    position: relative;
    margin-left: 2.2mm;
    padding: 0 0 7mm 8.3mm;
    border-left: 0.3mm solid #7db7fa;
    break-inside: auto;
  }

  .timeline-entry::before {
    position: absolute;
    top: 0.5mm;
    left: -2mm;
    width: 3.7mm;
    height: 3.7mm;
    border-radius: 50%;
    background: #0878f9;
    content: "";
  }

  .timeline-entry-last {
    padding-bottom: 0;
    border-image: linear-gradient(to bottom, #7db7fa 0 82%, transparent 82%) 1;
  }

  .timeline-entry-last::before { background: #64a9f8; }

  .entry {
    margin-bottom: 4.2mm;
    break-inside: auto;
  }
  .entry:last-child { margin-bottom: 0; }
  .compact-entry { break-inside: avoid; }

  .entry-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8mm;
    break-after: avoid;
  }

  .entry-heading > div:first-child { min-width: 0; }

  .entry h3,
  .timeline-entry h3 {
    margin: 0;
    color: #090d1b;
    font-size: 11pt;
    font-weight: 750;
    line-height: 1.1;
  }

  .entry-subtitle,
  .entry-description {
    margin: 1mm 0 0;
  }

  .entry-meta {
    display: flex;
    min-width: 30mm;
    flex: 0 0 auto;
    flex-direction: column;
    align-items: flex-end;
    font-size: 9.5pt;
    line-height: 1.4;
    text-align: right;
    white-space: nowrap;
  }

  .bullets {
    margin: 2.2mm 0 0;
    padding-left: 5.5mm;
  }

  .bullets li {
    margin-bottom: 0.7mm;
    padding-left: 1mm;
    break-inside: avoid;
  }
  .bullets li:last-child { margin-bottom: 0; }
  .bullets li::marker { color: #0878f9; }

  .pill-section { margin-top: 6.4mm; }
  .pill-section .section-heading { margin-bottom: 3.5mm; }

  .pill-list {
    display: flex;
    flex-wrap: wrap;
    gap: 2.1mm;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .pill-list li {
    padding: 1.7mm 4.3mm;
    border-radius: 999px;
    background: #eaf4ff;
    color: #405779;
    font-size: 8.5pt;
    line-height: 1;
    white-space: nowrap;
    break-inside: avoid;
  }

  @media print {
    .section-heading,
    .entry-heading { break-after: avoid-page; }
  }
`;

/** Renders Atlas as a complete, print-ready HTML document. */
export function renderAtlas(resume: Resume): string {
  const tools = sectionLabels(findSpecialSection(resume.customSections, "tools"));

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(resume.fullName)} Resume</title>
  <style>${STYLES}</style>
</head>
<body>
  ${renderHeader(resume)}
  ${resume.summary ? section("Summary", `<p class="summary">${escapeHtml(resume.summary)}</p>`) : ""}
  ${renderExperience(resume)}
  ${renderProjects(resume)}
  ${renderEducation(resume)}
  ${renderPills("Skills", resume.skills)}
  ${renderPills("Tools", tools)}
  ${renderCertifications(resume)}
  ${renderCustomSections(resume.customSections)}
</body>
</html>`;
}
