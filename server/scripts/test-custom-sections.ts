import { writeFile } from "node:fs/promises";
import path from "node:path";
import { renderResume } from "../src/pdf/templates/template.service.js";
import { convertHtmlToPdf } from "../src/pdf/gotenberg.service.js";
import type { Resume, TemplateName } from "../src/pdf/templates/resume.types.js";

/**
 * Stress-tests non-standard resume shapes across every template.
 *
 * Uses an academic/clinical profile rather than a software one: many custom
 * sections, some with no bullets, some with no headings, plus a resume that
 * omits most standard sections entirely.
 */

const academicResume: Resume = {
  fullName: "Dr. Amara Okonkwo",
  headline: "Clinical Researcher and Public Health Physician",
  contact: {
    email: "a.okonkwo@example.org",
    phone: "+234 802 555 0134",
    location: "Abuja, Nigeria",
    linkedin: "linkedin.com/in/example",
  },
  summary:
    "Public health physician with 11 years across clinical practice, field epidemiology, and health policy. Led vaccine rollout programmes reaching 400,000 people and published research on infectious disease surveillance in West Africa.",
  skills: ["Epidemiology", "Stata", "R", "Grant Writing", "Clinical Trials", "Health Policy"],
  experience: [
    {
      company: "Nigeria Centre for Disease Control",
      role: "Senior Epidemiologist",
      location: "Abuja",
      startDate: "2019",
      endDate: "Present",
      bullets: [
        "Directed outbreak response for 3 national cholera events covering 14 states.",
        "Built the surveillance data pipeline now used across 36 state offices.",
      ],
    },
  ],
  education: [
    { school: "London School of Hygiene and Tropical Medicine", degree: "MSc Epidemiology", endDate: "2016" },
    { school: "University of Ibadan", degree: "MBBS", endDate: "2013" },
  ],
  customSections: [
    {
      title: "Publications",
      items: [
        {
          heading: "Spatial patterns of cholera transmission in Northern Nigeria",
          subheading: "The Lancet Global Health, vol. 12",
          dates: "2024",
        },
        {
          heading: "Vaccine hesitancy and community trust: a mixed-methods study",
          subheading: "BMJ Global Health",
          dates: "2022",
        },
        {
          heading: "Surveillance capacity in low-resource settings",
          subheading: "Journal of Public Health Africa",
          dates: "2021",
        },
      ],
    },
    {
      title: "Grants and Funding",
      items: [
        {
          heading: "Wellcome Trust Research Fellowship",
          subheading: "GBP 340,000 over 3 years",
          dates: "2022 to 2025",
          bullets: ["Principal investigator on a study of antimicrobial resistance in rural clinics."],
        },
        { heading: "WHO Rapid Response Grant", subheading: "USD 75,000", dates: "2020" },
      ],
    },
    {
      // No headings on items at all: only bullets. Tests the "bare list" shape.
      title: "Languages",
      items: [{ bullets: ["English (native)", "Igbo (native)", "French (professional working)", "Hausa (conversational)"] }],
    },
    {
      title: "Volunteering",
      items: [
        {
          heading: "Medical Lead, Abuja Free Clinic",
          dates: "2018 to Present",
          bullets: [
            "Runs a monthly clinic serving roughly 120 uninsured patients.",
            "Recruited and scheduled a rotating roster of 15 volunteer clinicians.",
          ],
        },
      ],
    },
    {
      title: "Professional Memberships",
      items: [
        { heading: "Fellow, West African College of Physicians" },
        { heading: "Member, International Epidemiological Association" },
      ],
    },
    {
      title: "Conference Presentations",
      items: [
        { heading: "Keynote: Rebuilding trust after an outbreak", subheading: "African Health Summit, Kigali", dates: "2024" },
        { heading: "Panel: Data sharing across borders", subheading: "ASTMH Annual Meeting", dates: "2023" },
      ],
    },
  ],
};

/** A minimal resume: no experience, no education, only custom sections. */
const minimalResume: Resume = {
  fullName: "Kemi Adeyemi",
  contact: { email: "kemi@example.com", location: "Lagos" },
  customSections: [
    {
      title: "Selected Exhibitions",
      items: [
        { heading: "Solo show: Lagos Interiors", subheading: "Rele Gallery", dates: "2025" },
        { heading: "Group show: New Contemporaries", subheading: "Art X Lagos", dates: "2024" },
      ],
    },
    {
      title: "Awards",
      items: [{ heading: "Emerging Artist Prize", subheading: "Nigerian Arts Council", dates: "2023" }],
    },
  ],
};

const TEMPLATES: TemplateName[] = ["modern-accent", "classic-ats", "compact-professional"];

async function render(label: string, resume: Resume): Promise<void> {
  for (const template of TEMPLATES) {
    const html = renderResume(template, resume);
    const pdf = await convertHtmlToPdf(html);
    const file = path.join(process.cwd(), "output", `${label}-${template}.pdf`);
    await writeFile(file, pdf);
    console.log(`  ${label}-${template}`.padEnd(44), `${(pdf.byteLength / 1024).toFixed(1)} KB`);
  }
}

async function main(): Promise<void> {
  console.log("Academic resume with 6 custom sections:");
  await render("academic", academicResume);
  console.log("\nMinimal resume, custom sections only:");
  await render("minimal", minimalResume);
}

main().catch((error: unknown) => {
  console.error("FAILED:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
