import { z } from "zod";
import type { AiToolDefinition } from "../ai-provider.interface.js";
import { generateResumePdfInputSchema } from "./resume.schema.js";
import { generateResumePdf } from "./generate-resume-pdf.tool.js";

/** Context a tool needs beyond the model's own arguments. */
export interface ToolContext {
  chatSessionId: string;
}

type ToolHandler = (input: unknown, context: ToolContext) => Promise<unknown>;

interface RegisteredTool {
  definition: AiToolDefinition;
  handler: ToolHandler;
}

/**
 * JSON Schema advertised for generate_resume_pdf.
 *
 * Generated from the Zod schema so the contract shown to the model and the
 * validation applied to its output can never drift apart.
 */
const generateResumePdfParameters = z.toJSONSchema(generateResumePdfInputSchema, {
  target: "draft-7",
  io: "input",
}) as Record<string, unknown>;

const TOOLS: Record<string, RegisteredTool> = {
  generate_resume_pdf: {
    definition: {
      name: "generate_resume_pdf",
      description:
        "Generate the final resume PDF. Call this ONLY after the user has explicitly approved the resume draft shown in chat. Pass the complete resume, not a summary.",
      parameters: generateResumePdfParameters,
    },
    handler: (input, context) => generateResumePdf(input, context.chatSessionId),
  },
};

/** Tool definitions offered to the model on every turn. */
export function getToolDefinitions(): AiToolDefinition[] {
  return Object.values(TOOLS).map((tool) => tool.definition);
}

/**
 * Executes a tool the model requested.
 *
 * @param name - Tool name from the model's tool call.
 * @param input - Raw arguments from the model.
 * @param context - Session context the tool needs.
 * @returns The tool's result, serialised back to the model.
 * @throws When the model requests a tool that does not exist.
 */
export async function executeTool(
  name: string,
  input: unknown,
  context: ToolContext,
): Promise<unknown> {
  const tool = TOOLS[name];
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  return tool.handler(input, context);
}
