import "dotenv/config";
import { z } from "zod";

/**
 * Environment schema. Values needed by later build steps (AI keys, Cloudinary)
 * are optional for now so the server boots before those features exist; each
 * becomes required in the step that introduces it.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),

  /** Origin allowed to call this API from a browser. */
  CLIENT_URL: z.string().default("http://localhost:3000"),

  GOTENBERG_URL: z.string().url().default("http://localhost:3001"),

  AI_PROVIDER: z.enum(["openai", "gemini"]).default("openai"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o"),
  /**
   * Overrides the OpenAI endpoint, so the same provider can talk to any
   * OpenAI-compatible service such as Groq, Together, or a local server.
   */
  OPENAI_BASE_URL: z.string().optional(),
  /**
   * Model used to condense over-long resumes. Kept separate from the chat
   * model because condensing needs no tool calling and benefits from whichever
   * model has the most generous limits.
   */
  CONDENSE_MODEL: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-flash-latest"),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  console.error(`Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

/** Validated, strongly typed environment configuration. */
export const env = parsed.data;

export const isProduction = env.NODE_ENV === "production";
