import mongoose from "mongoose";
import { generateResumePdf } from "../src/ai/tools/generate-resume-pdf.tool.js";
import { getToolDefinitions } from "../src/ai/tools/ai-tools.service.js";
import { sampleResume } from "./sample-resume.js";
import { env } from "../src/config/env.js";

/**
 * Exercises generate_resume_pdf directly, without involving the AI.
 *
 * Verifies the tool's JSON Schema, the full render-convert-store-record
 * pipeline, and that invalid input is rejected.
 */
async function main(): Promise<void> {
  const schema = getToolDefinitions()[0]!;
  console.log(`tool: ${schema.name}`);
  console.log(`schema top-level keys: ${Object.keys(schema.parameters).join(", ")}`);

  await mongoose.connect(env.MONGODB_URI);
  const chatSessionId = new mongoose.Types.ObjectId().toString();

  console.log("\nrunning pipeline...");
  const result = await generateResumePdf(
    { template: "classic-ats", resume: { ...sampleResume, customSections: [
      { title: "Speaking", items: [{ heading: "Scaling Node APIs", subheading: "DevFest Lagos", dates: "2024" }] },
    ] } },
    chatSessionId,
  );
  console.log("  documentUrl:", result.documentUrl);
  console.log("  documentId: ", result.documentId);

  console.log("\nrejecting invalid input...");
  await generateResumePdf({ template: "classic-ats", resume: { contact: {} } }, chatSessionId)
    .then(() => console.log("  UNEXPECTED: invalid input was accepted"))
    .catch((error: unknown) => {
      console.log("  rejected:", error instanceof Error ? error.message : error);
    });

  await mongoose.disconnect();
}

main().catch((error: unknown) => {
  console.error("FAILED:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
