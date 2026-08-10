import { writeFile } from "node:fs/promises";
import path from "node:path";
import { renderClassicAts } from "../src/pdf/templates/classic-ats.template.js";
import { sampleResume } from "./sample-resume.js";

/**
 * Renders the sample resume to `output/resume.html` without touching Gotenberg.
 *
 * Useful for fast template iteration in a browser, and as the input to any
 * external HTML-to-PDF renderer while the Gotenberg container is unavailable.
 */
async function main(): Promise<void> {
  const htmlPath = path.join(process.cwd(), "output", "resume.html");
  await writeFile(htmlPath, renderClassicAts(sampleResume), "utf8");
  console.log(`HTML written to ${htmlPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
