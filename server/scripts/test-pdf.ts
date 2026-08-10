import { writeFile } from "node:fs/promises";
import path from "node:path";
import { renderResume } from "../src/pdf/templates/template.service.js";
import { convertHtmlToPdf } from "../src/pdf/gotenberg.service.js";
import { sampleResume } from "./sample-resume.js";
import type { TemplateName } from "../src/pdf/templates/resume.types.js";

const TEMPLATES: TemplateName[] = [
  "classic-ats",
  "modern-accent",
  "compact-professional",
];

/**
 * Renders every template to PDF so they can be compared side by side.
 *
 * Writes both HTML and PDF per template into `output/`: the HTML opens in a
 * browser for fast iteration, the PDF shows exactly what Gotenberg produced.
 */
async function main(): Promise<void> {
  const outputDir = path.join(process.cwd(), "output");

  for (const template of TEMPLATES) {
    const html = renderResume(template, sampleResume);
    await writeFile(path.join(outputDir, `${template}.html`), html, "utf8");

    const started = Date.now();
    const pdf = await convertHtmlToPdf(html);
    await writeFile(path.join(outputDir, `${template}.pdf`), pdf);

    const sizeKb = (pdf.byteLength / 1024).toFixed(1);
    console.log(`${template.padEnd(22)} ${sizeKb.padStart(6)} KB  ${Date.now() - started}ms`);
  }

  console.log(`\nWrote ${TEMPLATES.length} templates to ${outputDir}`);
}

main().catch((error: unknown) => {
  console.error("\nPDF generation failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
