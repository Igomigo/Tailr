import type { Resume, ResumeCustomSection } from "./resume.types.js";
import { escapeHtml, hasContent } from "./template.utils.js";

/**
 * Classy Pink: an editorial two-column resume with rose accents, a soft
 * sidebar wash, serif display type, compact skill bars, and delicate icons.
 */

type ContactIcon = "email" | "phone" | "location" | "linkedin" | "web";

const CONTACT_ICONS: Record<ContactIcon, string> = {
  email: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="m4 7 8 6 8-6"/>',
  phone: '<path d="M7.2 3.6 4.8 4.8c-.8.4-1.1 1.3-.8 2.1 1.9 6.1 7 11.2 13.1 13.1.8.3 1.7 0 2.1-.8l1.2-2.3c.4-.8.2-1.7-.6-2.2l-3-1.9a1.7 1.7 0 0 0-2.1.2l-1.3 1.3A13 13 0 0 1 9.7 10.6l1.3-1.3c.6-.6.7-1.4.2-2.1l-1.9-3c-.5-.8-1.4-1-2.2-.6Z"/>',
  location: '<path d="M20 10c0 5.2-8 11-8 11S4 15.2 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.4"/>',
  linkedin: '<rect class="filled" x="3" y="3" width="18" height="18" rx="2"/><path class="knockout" d="M7.3 10v7M7.3 7v.1M11.4 17v-4.1a3.1 3.1 0 0 1 6.2 0V17M11.4 10v7"/>',
  web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
};

const INTEREST_ICONS: Record<string, string> = {
  travel: '<path d="m3 12 8 2 3 7 2-1-1-7 6-5c1-.8 1-2.1.5-2.6-.6-.6-1.8-.6-2.6.5l-5 6-7-1-1 2Z"/>',
  reading: '<path d="M4 5.5c3.2-.8 5.9-.2 8 2.2v11c-2.1-2.4-4.8-3-8-2.2v-11Zm16 0c-3.2-.8-5.9-.2-8 2.2v11c2.1-2.4 4.8-3 8-2.2v-11Z"/>',
  yoga: '<path d="M12 20c-4-2-6-5.2-6-9 3.3.2 5.4 1.7 6 4.6.6-2.9 2.7-4.4 6-4.6 0 3.8-2 7-6 9Zm0-5.5C9.7 12.7 9 10 12 5c3 5 2.3 7.7 0 9.5Z"/>',
  photography: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="m8 7 1.5-3h5L16 7"/><circle cx="12" cy="13.5" r="3.5"/>',
  coffee: '<path d="M4 8h12v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Zm12 2h2a3 3 0 0 1 0 6h-2M7 3c-1 1-.3 2 .5 3M11 3c-1 1-.3 2 .5 3"/>',
  community: '<circle cx="8" cy="8" r="3"/><circle cx="17" cy="8" r="3"/><path d="M2.5 20v-2a5.5 5.5 0 0 1 11 0v2M13 13.5a5.5 5.5 0 0 1 8.5 4.5v2"/>',
};

function svgIcon(paths: string, className: string): string {
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
}

function contactItem(name: ContactIcon, value?: string): string {
  return value
    ? `<li>${svgIcon(CONTACT_ICONS[name], "contact-icon")}<span>${escapeHtml(value)}</span></li>`
    : "";
}

function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return { first: fullName, last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts.at(-1) ?? "" };
}

function dateRange(start?: string, end?: string): string {
  return [start, end].filter(Boolean).map((value) => escapeHtml(value as string)).join(" - ");
}

function bulletList(values?: string[]): string {
  if (!values?.length) return "";
  return `<ul class="bullets${values.length >= 15 ? " long-bullets" : ""}">${values.map((value) => `<li>${escapeHtml(value)}</li>`).join("")}</ul>`;
}

function section(title: string, body: string, className = ""): string {
  if (!body.trim()) return "";
  return `<section class="section ${className}">
      <h2>${escapeHtml(title)}</h2>
      <div class="section-body">${body}</div>
    </section>`;
}

function findSection(
  sections: ResumeCustomSection[] | undefined,
  title: string,
): ResumeCustomSection | undefined {
  return sections?.find((item) => item.title.trim().toLowerCase() === title);
}

function labels(sectionData?: ResumeCustomSection): string[] {
  if (!sectionData) return [];
  return sectionData.items
    .filter(hasContent)
    .flatMap((item) => [item.heading, item.subheading, ...(item.bullets ?? [])])
    .filter(Boolean) as string[];
}

function renderHeader(resume: Resume): string {
  const name = splitName(resume.fullName);
  const { contact } = resume;
  return `<header class="header">
      <div class="intro">
        <h1><span>${escapeHtml(name.first)}</span>${name.last ? ` <em>${escapeHtml(name.last)}</em>` : ""}</h1>
        ${resume.headline ? `<p class="headline">${escapeHtml(resume.headline)}</p>` : ""}
        ${resume.summary ? `<p class="summary">${escapeHtml(resume.summary)}</p>` : ""}
      </div>
      <div class="contact-panel">
        <ul class="contact-list">
          ${contactItem("email", contact.email)}
          ${contactItem("phone", contact.phone)}
          ${contactItem("location", contact.location)}
          ${contactItem("linkedin", contact.linkedin)}
          ${contactItem("web", contact.portfolio)}
        </ul>
      </div>
    </header>`;
}

function renderExperience(resume: Resume): string {
  if (!resume.experience?.length) return "";
  return section(
    "Experience",
    resume.experience.map((job) => `<article class="entry">
        <div class="entry-heading">
          <div>
            <h3>${escapeHtml(job.company)}</h3>
            <p class="subtitle">${escapeHtml(job.role)}</p>
          </div>
          <div class="meta">
            ${dateRange(job.startDate, job.endDate) ? `<span>${dateRange(job.startDate, job.endDate)}</span>` : ""}
            ${job.location ? `<span>${escapeHtml(job.location)}</span>` : ""}
          </div>
        </div>
        ${bulletList(job.bullets)}
      </article>`).join(""),
  );
}

function renderEducation(resume: Resume): string {
  if (!resume.education?.length) return "";
  return section(
    "Education",
    resume.education.map((item) => `<article class="entry compact-entry">
        <div class="entry-heading">
          <div>
            <h3>${escapeHtml(item.school)}</h3>
            ${item.degree ? `<p class="subtitle">${escapeHtml(item.degree)}</p>` : ""}
          </div>
          <div class="meta">
            ${dateRange(item.startDate, item.endDate) ? `<span>${dateRange(item.startDate, item.endDate)}</span>` : ""}
            ${item.location ? `<span>${escapeHtml(item.location)}</span>` : ""}
          </div>
        </div>
      </article>`).join(""),
  );
}

function renderProjects(resume: Resume): string {
  if (!resume.projects?.length) return "";
  return section(
    "Projects",
    resume.projects.map((project) => `<article class="entry project-entry">
        <div class="entry-heading">
          <h3>${escapeHtml(project.name)}</h3>
          ${project.technologies?.length ? `<p class="project-link">${escapeHtml(project.technologies.join(" | "))}</p>` : ""}
        </div>
        ${project.description ? `<p class="description">${escapeHtml(project.description)}</p>` : ""}
        ${bulletList(project.bullets)}
      </article>`).join(""),
  );
}

function renderSkills(skills?: string[]): string {
  if (!skills?.length) return "";
  const levels = [86, 75, 77, 79, 66, 72, 82, 69];
  return section(
    "Skills",
    `<ul class="skill-list">${skills.map((skill, index) => `<li>
        <span>${escapeHtml(skill)}</span>
        <i><b style="width:${levels[index % levels.length]}%"></b></i>
      </li>`).join("")}</ul>`,
    "sidebar-section",
  );
}

function renderTools(resume: Resume): string {
  const tools = labels(findSection(resume.customSections, "tools"));
  if (!tools.length) return "";
  return section(
    "Tools",
    `<ul class="tool-list">${tools.map((tool) => `<li>${escapeHtml(tool)}</li>`).join("")}</ul>`,
    "sidebar-section",
  );
}

function renderCertifications(resume: Resume): string {
  if (!resume.certifications?.length) return "";
  return section(
    "Certifications",
    resume.certifications.map((item) => `<article class="certification">
        <span>${escapeHtml(item.name)}</span>
        ${item.date ? `<time>${escapeHtml(item.date)}</time>` : ""}
      </article>`).join(""),
    "sidebar-section",
  );
}

function interestIcon(label: string): string {
  const key = Object.keys(INTEREST_ICONS).find((name) => label.toLowerCase().includes(name));
  const paths = key ? INTEREST_ICONS[key] : '<circle cx="12" cy="12" r="7"/><path d="m9 12 2 2 4-5"/>';
  return svgIcon(paths, "interest-icon");
}

function renderInterests(resume: Resume): string {
  const interests = labels(findSection(resume.customSections, "interests"));
  if (!interests.length) return "";
  return section(
    "Interests",
    `<ul class="interest-list">${interests.map((item) => `<li>${interestIcon(item)}<span>${escapeHtml(item)}</span></li>`).join("")}</ul>`,
    "sidebar-section",
  );
}

const RESERVED_SECTIONS = new Set(["tools", "interests", "tagline"]);

function renderOtherSections(resume: Resume): string {
  return (resume.customSections ?? [])
    .filter((custom) => !RESERVED_SECTIONS.has(custom.title.trim().toLowerCase()))
    .map((custom) => section(
      custom.title,
      custom.items.filter(hasContent).map((item) => `<article class="entry">
        ${item.heading || item.dates ? `<div class="entry-heading">${item.heading ? `<h3>${escapeHtml(item.heading)}</h3>` : "<span></span>"}${item.dates ? `<div class="meta"><span>${escapeHtml(item.dates)}</span></div>` : ""}</div>` : ""}
        ${item.subheading ? `<p class="subtitle">${escapeHtml(item.subheading)}</p>` : ""}
        ${bulletList(item.bullets)}
      </article>`).join(""),
    ))
    .join("");
}

const STYLES = `
  @page {
    size: A4;
    margin: 0;
  }
  * { box-sizing: border-box; }
  html { background: #fff; }
  body {
    margin: 0;
    padding: 10mm 10mm 15mm;
    color: #222238;
    font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
    font-size: 8.7pt;
    line-height: 1.38;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
  }
  .sidebar-wash {
    position: fixed;
    z-index: -2;
    top: 0;
    right: 0;
    bottom: 0;
    width: 74mm;
    background: linear-gradient(145deg, #fffafa 0%, #fdf1f3 46%, #fff7f7 100%);
  }
  .corner-orb {
    position: fixed;
    z-index: -1;
    top: -34mm;
    left: -36mm;
    width: 103mm;
    height: 60mm;
    border-radius: 50%;
    background: radial-gradient(circle at 58% 72%, #fde9ec 0, #fff7f8 58%, #fff 75%);
  }
  .header,
  .content-grid {
    display: grid;
    grid-template-columns: minmax(0, 116mm) minmax(0, 1fr);
    column-gap: 12mm;
  }
  .header { min-height: 56mm; break-inside: avoid; }
  .intro { position: relative; padding-top: 15mm; }
  .intro h1 {
    margin: 0;
    color: #080712;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 35pt;
    font-weight: 600;
    line-height: 0.98;
    letter-spacing: -1.5pt;
  }
  .intro h1 em { color: #d76888; font-style: normal; font-weight: 500; }
  .headline {
    margin: 3mm 0 0;
    color: #242238;
    font-size: 8.6pt;
    letter-spacing: 3.2pt;
    text-transform: uppercase;
  }
  .summary { max-width: 108mm; margin: 4.2mm 0 0; line-height: 1.45; }

  .contact-panel { padding: 15mm 4mm 0 0; }
  .contact-list {
    display: flex;
    flex-direction: column;
    gap: 3.1mm;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .contact-list li { display: flex; align-items: center; gap: 4mm; min-width: 0; }
  .contact-list span { overflow-wrap: anywhere; }
  .contact-icon,
  .interest-icon {
    flex: 0 0 auto;
    fill: none;
    stroke: #d45478;
    stroke-width: 1.7;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .contact-icon { width: 4.2mm; height: 4.2mm; }
  .contact-icon .filled { fill: #d45478; stroke: none; }
  .contact-icon .knockout { fill: none; stroke: #fff; stroke-width: 1.8; }

  .content-grid { margin-top: 4mm; align-items: start; }
  main, aside { min-width: 0; }
  aside { padding-right: 4mm; }
  .section { margin-top: 6.5mm; }
  .section:first-child { margin-top: 0; }
  .section h2 {
    margin: 0 0 3.5mm;
    padding-bottom: 2.3mm;
    border-bottom: 0.25mm solid #df8ca3;
    color: #d05276;
    font-size: 9pt;
    font-weight: 500;
    line-height: 1;
    letter-spacing: 2.7pt;
    text-transform: uppercase;
    break-after: avoid;
  }
  .entry { margin-bottom: 5.5mm; break-inside: auto; }
  .entry:last-child { margin-bottom: 0; }
  .compact-entry { break-inside: avoid; }
  .entry-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 5mm;
    break-after: avoid;
  }
  .entry-heading > div:first-child { min-width: 0; }
  .entry h3 {
    margin: 0;
    color: #13111d;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 10.4pt;
    line-height: 1.22;
  }
  .subtitle, .description { margin: 0.5mm 0 0; }
  .meta {
    display: flex;
    min-width: 29mm;
    flex: 0 0 auto;
    flex-direction: column;
    align-items: flex-end;
    text-align: right;
    white-space: nowrap;
  }
  .project-link { max-width: 57mm; margin: 0; text-align: right; text-decoration: underline; overflow-wrap: anywhere; }
  .bullets { margin: 2.1mm 0 0; padding-left: 5mm; }
  .bullets li { margin-bottom: 0.55mm; padding-left: 0.8mm; break-inside: avoid; }
  .bullets li:last-child { margin-bottom: 0; }
  .bullets li::marker { color: #d45478; }
  .long-bullets li:nth-child(20) { break-before: page; }

  .sidebar-section { margin-top: 6.5mm; break-inside: avoid; }
  .sidebar-section h2 { margin-bottom: 3.5mm; }
  .sidebar-section:last-child { margin-top: 3.5mm; }
  .sidebar-section:last-child h2 { margin-bottom: 2mm; padding-bottom: 1.5mm; }
  .dense-sidebar .sidebar-section:last-child { break-before: page; }
  .skill-list, .tool-list, .interest-list { margin: 0; padding: 0; list-style: none; }
  .skill-list li { margin-bottom: 2.2mm; }
  .skill-list li:last-child { margin-bottom: 0; }
  .skill-list span { display: block; margin-bottom: 0.6mm; }
  .skill-list i { display: block; height: 1.7mm; overflow: hidden; border-radius: 10mm; background: #f3dce2; }
  .skill-list b { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #dc7993, #e49daf); }
  .tool-list { display: flex; flex-wrap: wrap; gap: 2mm; }
  .tool-list li { padding: 1.6mm 4mm; border-radius: 2.2mm; background: #f8e2e7; break-inside: avoid; }
  .certification { display: flex; justify-content: space-between; gap: 3mm; margin-bottom: 2mm; break-inside: avoid; }
  .certification:last-child { margin-bottom: 0; }
  .certification time { flex: 0 0 auto; }
  .interest-list { display: flex; flex-wrap: wrap; gap: 1.8mm 5mm; }
  .interest-list li { display: flex; align-items: center; gap: 2mm; width: calc(50% - 2.5mm); break-inside: avoid; }
  .interest-icon { width: 4.4mm; height: 4.4mm; }

  .footer {
    position: fixed;
    right: 10mm;
    bottom: 10mm;
    left: 10mm;
    display: flex;
    justify-content: flex-end;
    padding-top: 1.2mm;
    border-top: 0.2mm solid #df8ca3;
    color: #353148;
    font-size: 5.2pt;
    letter-spacing: 2.3pt;
    text-transform: uppercase;
  }
  p { orphans: 3; widows: 3; }
  @media print { .section h2, .entry-heading { break-after: avoid-page; } }
`;

/** Renders Classy Pink as a complete, print-ready HTML document. */
export function renderClassyPink(resume: Resume): string {
  const sidebarItemCount = (resume.skills?.length ?? 0)
    + labels(findSection(resume.customSections, "tools")).length
    + (resume.certifications?.length ?? 0)
    + labels(findSection(resume.customSections, "interests")).length;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(resume.fullName)} Resume</title>
  <style>${STYLES}</style>
</head>
<body>
  <div class="sidebar-wash" aria-hidden="true"></div>
  <div class="corner-orb" aria-hidden="true"></div>
  ${renderHeader(resume)}
  <div class="content-grid">
    <main>
      ${renderExperience(resume)}
      ${renderEducation(resume)}
      ${renderProjects(resume)}
      ${renderOtherSections(resume)}
    </main>
    <aside class="${sidebarItemCount > 21 ? "dense-sidebar" : ""}">
      ${renderSkills(resume.skills)}
      ${renderTools(resume)}
      ${renderCertifications(resume)}
      ${renderInterests(resume)}
    </aside>
  </div>
  <footer class="footer">
    <span>${escapeHtml(resume.fullName)}</span>
  </footer>
</body>
</html>`;
}
