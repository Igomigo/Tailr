import type { Resume, ResumeCustomSection } from "./resume.types.js";
import { escapeHtml, hasContent } from "./template.utils.js";

/**
 * Mono: a restrained black-and-white engineering resume with a persistent
 * two-column structure, fine rules, compact type, and a print-style footer.
 */

type ContactIcon = "email" | "phone" | "location" | "linkedin" | "github" | "web";

const CONTACT_ICONS: Record<ContactIcon, string> = {
  email: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="m4 7 8 6 8-6"/>',
  phone: '<path d="M7.1 3.6 4.8 4.8c-.8.4-1.1 1.3-.8 2.1 1.9 6.1 7 11.2 13.1 13.1.8.3 1.7 0 2.1-.8l1.2-2.3c.4-.8.2-1.7-.6-2.2l-3-1.9a1.7 1.7 0 0 0-2.1.2l-1.3 1.3A13 13 0 0 1 9.7 10.6l1.3-1.3c.6-.6.7-1.4.2-2.1l-1.9-3c-.5-.8-1.4-1-2.2-.6Z"/>',
  location: '<path d="M20 10c0 5.2-8 11-8 11S4 15.2 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.4"/>',
  linkedin: '<rect class="filled" x="3" y="3" width="18" height="18" rx="1.8"/><path class="knockout" d="M7.4 10v7M7.4 7v.1M11.4 17v-4.2a3.1 3.1 0 0 1 6.2 0V17M11.4 10v7"/>',
  github: '<path class="filled" d="M12 2.4a9.6 9.6 0 0 0-3 18.7c.5.1.7-.2.7-.5v-1.9c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 0 1.6 1.1 1.6 1.1.9 1.6 2.4 1.1 2.9.9.1-.7.4-1.1.7-1.4-2.3-.3-4.7-1.1-4.7-5.1 0-1.1.4-2.1 1.1-2.8-.1-.3-.5-1.3.1-2.7 0 0 .9-.3 2.9 1.1a10 10 0 0 1 5.2 0c2-1.4 2.9-1.1 2.9-1.1.6 1.4.2 2.4.1 2.7.7.7 1.1 1.7 1.1 2.8 0 4-2.4 4.8-4.7 5.1.4.3.7 1 .7 1.9v2.7c0 .3.2.6.7.5A9.6 9.6 0 0 0 12 2.4Z"/>',
  web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
};

function icon(name: ContactIcon): string {
  return `<svg class="contact-icon" viewBox="0 0 24 24" aria-hidden="true">${CONTACT_ICONS[name]}</svg>`;
}

function contactItem(name: ContactIcon, value?: string): string {
  return value ? `<li>${icon(name)}<span>${escapeHtml(value)}</span></li>` : "";
}

function dateRange(start?: string, end?: string): string {
  return [start, end].filter(Boolean).map((value) => escapeHtml(value as string)).join(" - ");
}

function bullets(values?: string[]): string {
  if (!values?.length) return "";
  return `<ul class="bullets">${values.map((value) => `<li>${escapeHtml(value)}</li>`).join("")}</ul>`;
}

function section(title: string, body: string, className = ""): string {
  if (!body.trim()) return "";
  return `<section class="section ${className}">
      <h2>${escapeHtml(title)}</h2>
      <div class="section-body">${body}</div>
    </section>`;
}

function specialSection(
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
  const { contact } = resume;
  return `<header class="header">
      <div class="intro">
        <h1>${escapeHtml(resume.fullName)}</h1>
        ${resume.headline ? `<p class="headline">${escapeHtml(resume.headline)}</p>` : ""}
        ${resume.summary ? `<p class="summary">${escapeHtml(resume.summary)}</p>` : ""}
      </div>
      <ul class="contact-list">
        ${contactItem("email", contact.email)}
        ${contactItem("phone", contact.phone)}
        ${contactItem("location", contact.location)}
        ${contactItem("linkedin", contact.linkedin)}
        ${contactItem(contact.portfolio?.toLowerCase().includes("github") ? "github" : "web", contact.portfolio)}
      </ul>
    </header>`;
}

function renderExperience(resume: Resume): string {
  if (!resume.experience?.length) return "";
  return section(
    "Experience",
    resume.experience
      .map((job) => `<article class="entry">
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
          ${bullets(job.bullets)}
        </article>`)
      .join(""),
  );
}

function renderEducation(resume: Resume): string {
  if (!resume.education?.length) return "";
  return section(
    "Education",
    resume.education
      .map((item) => `<article class="entry compact-entry">
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
        </article>`)
      .join(""),
  );
}

function renderProjects(resume: Resume): string {
  if (!resume.projects?.length) return "";
  return section(
    "Projects",
    resume.projects
      .map((project) => `<article class="entry project-entry">
          <div class="entry-heading">
            <h3>${escapeHtml(project.name)}</h3>
            ${project.technologies?.length ? `<p class="project-link">${escapeHtml(project.technologies.join(" | "))}</p>` : ""}
          </div>
          ${project.description ? `<p class="description">${escapeHtml(project.description)}</p>` : ""}
          ${bullets(project.bullets)}
        </article>`)
      .join(""),
  );
}

const SIDEBAR_TITLES = new Set(["languages", "frameworks", "tools", "interests"]);

function renderSkillGroups(resume: Resume): string {
  const groups: Array<[string, string[]]> = [
    ["Languages", labels(specialSection(resume.customSections, "languages"))],
    ["Frameworks", labels(specialSection(resume.customSections, "frameworks"))],
    ["Tools", labels(specialSection(resume.customSections, "tools"))],
  ];
  const populated = groups.filter(([, values]) => values.length);
  if (!populated.length && resume.skills?.length) populated.push(["Core", resume.skills]);
  if (!populated.length) return "";

  return section(
    "Skills",
    populated
      .map(([title, values]) => `<div class="sidebar-group"><h3>${title}</h3><ul>${values
        .map((value) => `<li>${escapeHtml(value)}</li>`)
        .join("")}</ul></div>`)
      .join(""),
    "sidebar-section",
  );
}

function renderCertifications(resume: Resume): string {
  if (!resume.certifications?.length) return "";
  return section(
    "Certifications",
    resume.certifications
      .map((item) => `<article class="sidebar-entry">
          <div>
            <h3>${escapeHtml(item.name)}</h3>
            ${item.issuer ? `<p>${escapeHtml(item.issuer)}</p>` : ""}
          </div>
          ${item.date ? `<span>${escapeHtml(item.date)}</span>` : ""}
        </article>`)
      .join(""),
    "sidebar-section",
  );
}

function renderInterests(resume: Resume): string {
  const interests = labels(specialSection(resume.customSections, "interests"));
  if (!interests.length) return "";
  return section(
    "Interests",
    `<ul class="plain-list">${interests.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`,
    "sidebar-section",
  );
}

function renderOtherSections(resume: Resume): string {
  return (resume.customSections ?? [])
    .filter((custom) => !SIDEBAR_TITLES.has(custom.title.trim().toLowerCase()))
    .map((custom) => section(
      custom.title,
      custom.items.filter(hasContent).map((item) => `<article class="entry">
          ${item.heading || item.dates ? `<div class="entry-heading">${item.heading ? `<h3>${escapeHtml(item.heading)}</h3>` : "<span></span>"}${item.dates ? `<div class="meta"><span>${escapeHtml(item.dates)}</span></div>` : ""}</div>` : ""}
          ${item.subheading ? `<p class="subtitle">${escapeHtml(item.subheading)}</p>` : ""}
          ${bullets(item.bullets)}
        </article>`).join(""),
    ))
    .join("");
}

const STYLES = `
  @page { size: A4; margin: 12mm 12mm 18mm; }
  * { box-sizing: border-box; }
  html { background: #fff; }
  body {
    margin: 0;
    color: #292934;
    font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
    font-size: 9.35pt;
    line-height: 1.38;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page-divider {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 123mm;
    width: 0.2mm;
    background: #d8d8da;
  }

  .header,
  .content-grid {
    display: grid;
    grid-template-columns: minmax(0, 115mm) minmax(0, 1fr);
    column-gap: 13mm;
  }

  .header { min-height: 50mm; break-inside: avoid; }
  .intro { padding-right: 1mm; }
  .intro h1 {
    margin: 0;
    color: #050505;
    font-size: 37pt;
    font-weight: 800;
    line-height: 0.95;
    letter-spacing: -1.7pt;
  }
  .headline {
    margin: 3mm 0 0;
    color: #252530;
    font-size: 10pt;
    font-weight: 500;
    letter-spacing: 3.1pt;
    text-transform: uppercase;
  }
  .summary {
    max-width: 104mm;
    margin: 7mm 0 0;
    font-size: 9.5pt;
    line-height: 1.45;
  }

  .contact-list {
    display: flex;
    flex-direction: column;
    gap: 3.1mm;
    margin: 1.2mm 0 0;
    padding: 0;
    list-style: none;
    font-size: 8.7pt;
  }
  .contact-list li { display: flex; align-items: center; gap: 4mm; min-width: 0; }
  .contact-list span { overflow-wrap: anywhere; }
  .contact-icon {
    width: 4mm;
    height: 4mm;
    flex: 0 0 auto;
    fill: none;
    stroke: #090909;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .contact-icon .filled { fill: #090909; stroke: none; }
  .contact-icon .knockout { fill: none; stroke: #fff; stroke-width: 1.8; }

  .content-grid { margin-top: 7.5mm; align-items: start; }
  main, aside { min-width: 0; }
  .section { margin-top: 8mm; }
  .section:first-child { margin-top: 0; }
  .section h2 {
    margin: 0 0 3.8mm;
    padding-bottom: 2.1mm;
    border-bottom: 0.25mm solid #6c6c72;
    color: #080808;
    font-size: 10pt;
    font-weight: 750;
    line-height: 1;
    letter-spacing: 2.35pt;
    text-transform: uppercase;
    break-after: avoid;
  }

  .entry { margin-bottom: 7mm; break-inside: auto; }
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
  h3 { margin: 0; color: #090909; font-size: 10.2pt; line-height: 1.25; }
  .subtitle, .description { margin: 0.6mm 0 0; }
  .meta {
    display: flex;
    min-width: 30mm;
    flex: 0 0 auto;
    flex-direction: column;
    align-items: flex-end;
    text-align: right;
    white-space: nowrap;
  }
  .project-link { max-width: 56mm; margin: 0; text-align: right; overflow-wrap: anywhere; }
  .bullets { margin: 2.2mm 0 0; padding-left: 5mm; }
  .bullets li { margin-bottom: 0.6mm; padding-left: 0.7mm; break-inside: avoid; }
  .bullets li:last-child { margin-bottom: 0; }

  .sidebar-section { margin-top: 10mm; break-inside: avoid; }
  .sidebar-section:first-child { margin-top: 0; }
  .sidebar-section h2 { margin-bottom: 4mm; }
  .sidebar-group { margin-bottom: 5.5mm; break-inside: avoid; }
  .sidebar-group:last-child { margin-bottom: 0; }
  .sidebar-group h3 { margin-bottom: 1.2mm; font-size: 9.5pt; }
  .sidebar-group ul, .plain-list { margin: 0; padding: 0; list-style: none; }
  .sidebar-group li, .plain-list li { margin-bottom: 0.7mm; }
  .sidebar-entry {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 3mm;
    margin-bottom: 5mm;
    break-inside: avoid;
  }
  .sidebar-entry:last-child { margin-bottom: 0; }
  .sidebar-entry h3 { font-size: 9.2pt; font-weight: 400; }
  .sidebar-entry p { margin: 0; }
  .sidebar-entry > span { flex: 0 0 auto; }

  .footer {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    justify-content: space-between;
    padding-top: 1.2mm;
    border-top: 0.2mm solid #aaaab0;
    color: #3d3d47;
    font-size: 5.5pt;
    letter-spacing: 2.5pt;
    text-transform: uppercase;
  }
  p { orphans: 3; widows: 3; }

  @media print {
    .section h2, .entry-heading { break-after: avoid-page; }
  }
`;

/** Renders Mono as a complete, print-ready HTML document. */
export function renderMono(resume: Resume): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(resume.fullName)} Resume</title>
  <style>${STYLES}</style>
</head>
<body>
  <div class="page-divider" aria-hidden="true"></div>
  ${renderHeader(resume)}
  <div class="content-grid">
    <main>
      ${renderExperience(resume)}
      ${renderEducation(resume)}
      ${renderProjects(resume)}
      ${renderOtherSections(resume)}
    </main>
    <aside>
      ${renderSkillGroups(resume)}
      ${renderCertifications(resume)}
      ${renderInterests(resume)}
    </aside>
  </div>
  <footer class="footer">
    <span>Build a brighter next step</span>
    <span>${escapeHtml(resume.fullName)}</span>
  </footer>
</body>
</html>`;
}
