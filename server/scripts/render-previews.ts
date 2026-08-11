import { writeFile, mkdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { renderResume } from "../src/pdf/templates/template.service.js";
import { sampleResume } from "./sample-resume.js";
import type { TemplateName } from "../src/pdf/templates/resume.types.js";

const run = promisify(execFile);

/** A4 proportions, so a preview reads as a full sheet rather than a crop. */
const PAGE_WIDTH_PX = 1000;
const PAGE_HEIGHT_PX = Math.round((PAGE_WIDTH_PX * 297) / 210);

const CHROME =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const TEMPLATES: TemplateName[] = [
  "modern-accent",
  "classic-ats",
  "compact-professional",
];

/**
 * Renders each resume template to a PNG used by the client's template gallery.
 *
 * The page is sized to A4 proportions and the resume is scaled to fit within
 * it, so previews show a complete first page with its margins intact rather
 * than a fragment cut off mid-content.
 */
async function main(): Promise<void> {
  const outputDir = path.join(process.cwd(), "..", "client", "public", "templates");
  const tempDir = path.join(process.cwd(), "output");
  await mkdir(outputDir, { recursive: true });

  for (const template of TEMPLATES) {
    // Wrap the resume in a fixed A4 page so margins and proportions survive
    // the screenshot, which a bare render would not preserve.
    const inner = renderResume(template, sampleResume);
    const body = inner.slice(inner.indexOf("<body>") + 6, inner.indexOf("</body>"));
    const styles = inner.slice(inner.indexOf("<style>") + 7, inner.indexOf("</style>"));

    const page = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  ${styles}
  html, body { margin: 0; background: #ffffff; }
  body {
    width: ${PAGE_WIDTH_PX}px;
    height: ${PAGE_HEIGHT_PX}px;
    padding: 60px 58px;
    overflow: hidden;
  }
</style></head><body>${body}</body></html>`;

    const htmlPath = path.join(tempDir, `preview-${template}.html`);
    await writeFile(htmlPath, page, "utf8");

    await run(CHROME, [
      "--headless",
      "--disable-gpu",
      "--hide-scrollbars",
      "--default-background-color=ffffff",
      `--window-size=${PAGE_WIDTH_PX},${PAGE_HEIGHT_PX}`,
      `--screenshot=${path.join(outputDir, `${template}.png`)}`,
      `file://${htmlPath}`,
    ]);

    console.log(`  ${template}.png  ${PAGE_WIDTH_PX}x${PAGE_HEIGHT_PX}`);
  }

  console.log(`\nWrote ${TEMPLATES.length} previews to ${outputDir}`);
}

main().catch((error: unknown) => {
  console.error("Preview render failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
