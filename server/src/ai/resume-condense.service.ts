import OpenAI from "openai";
import { RESUME_CONDENSE_PROMPT } from "./prompts/resume-condense.prompt.js";
import { env } from "../config/env.js";

/**
 * Characters of resume text that fit alongside everything else in a request.
 *
 * A request also carries the system prompt, the job description, the tool
 * schema, and the conversation, so the resume only gets a share of the budget.
 */
export const RESUME_BUDGET_CHARS = 9_000;

/**
 * Ceiling on the condensed reply.
 *
 * A reply cut short by this limit silently loses the roles at the end of the
 * resume, so it is set well above what a condensed resume should need. Some
 * models also spend part of this budget reasoning before writing anything.
 */
const MAX_OUTPUT_TOKENS = 8_000;

/**
 * Smallest share of the original a condensed resume may be.
 *
 * A model that stops early returns a fragment, often just the contact header,
 * which is shorter than the original and so passes a naive length check while
 * having lost every job.
 */
const MIN_RETAINED_RATIO = 0.12;

/** Matches "Jan 2024 - Present", "2020 – 2022", "March 2022 to June 2023". */
const DATE_RANGE =
  /\b(?:[A-Z][a-z]+\s+)?(?:19|20)\d{2}\s*(?:-|–|—|to)\s*(?:(?:[A-Z][a-z]+\s+)?(?:19|20)\d{2}|Present|present|Current|current)/g;

export interface CondensedResume {
  text: string;
  /** True when the AI was used to shorten the text. */
  wasCondensed: boolean;
}

let client: OpenAI | null = null;

/**
 * Client used for condensing.
 *
 * Deliberately separate from the chat provider: condensing needs no tool
 * calling, so it can run on whichever model has the most generous limits,
 * chosen with CONDENSE_MODEL.
 */
function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      ...(env.OPENAI_BASE_URL ? { baseURL: env.OPENAI_BASE_URL } : {}),
    });
  }
  return client;
}

/**
 * Reports whether a condensed resume still describes the person's career.
 *
 * Losing the work history is the failure that makes this feature worse than
 * useless: the assistant then tells the user it cannot see any jobs. Date
 * ranges are the marker, since every role carries one and they survive
 * whatever heading or layout the original used.
 */
function keepsWorkHistory(original: string, condensed: string): boolean {
  const originalRanges = new Set(original.match(DATE_RANGE) ?? []).size;
  if (originalRanges === 0) return true;

  const condensedRanges = new Set(condensed.match(DATE_RANGE) ?? []).size;

  // Reformatting can merge or restate a range, so exact equality is too
  // strict; losing most of them is the failure worth catching.
  return condensedRanges >= Math.ceil(originalRanges * 0.7);
}

/**
 * Shortens a resume only when it will not otherwise fit.
 *
 * Most resumes are one or two pages and pass through untouched, costing
 * nothing. Longer ones are summarised with instructions to keep every
 * employer, date, qualification and metric, since losing those would make the
 * tailored resume inaccurate.
 *
 * @param text - Text extracted from the uploaded file.
 * @returns The text to use as context, and whether it was condensed.
 */
export async function condenseResume(text: string): Promise<CondensedResume> {
  if (text.length <= RESUME_BUDGET_CHARS) {
    return { text, wasCondensed: false };
  }

  // An unset variable arrives as an empty string, which is not a valid model.
  const model = env.CONDENSE_MODEL || env.OPENAI_MODEL;

  try {
    // A model occasionally stops early. One retry costs little compared with
    // falling back to a blunt trim.
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const completion = await getClient().chat.completions.create({
        model,
        temperature: 0,
        max_completion_tokens: MAX_OUTPUT_TOKENS,
        messages: [
          { role: "system", content: RESUME_CONDENSE_PROMPT },
          { role: "user", content: text },
        ],
      });

      const condensed = completion.choices[0]?.message?.content?.trim();
      const finish = completion.choices[0]?.finish_reason;

      const usable =
        Boolean(condensed) &&
        condensed!.length < text.length &&
        condensed!.length >= text.length * MIN_RETAINED_RATIO &&
        keepsWorkHistory(text, condensed!);

      if (usable) return { text: condensed!, wasCondensed: true };

      console.warn(
        `[condense:${model}] attempt ${attempt} rejected: ` +
          `${condensed?.length ?? 0} chars from ${text.length}, finish=${finish}`,
      );
    }
  } catch (error) {
    // Condensing is an optimisation, not a requirement. Failing here must not
    // fail the upload the user just made.
    console.error("[condense] failed:", error instanceof Error ? error.message : error);
  }

  // Trimming keeps the opening of the resume, where the most recent roles sit,
  // so it degrades far more gracefully than a condensed version that dropped
  // the work history entirely.
  return { text: text.slice(0, RESUME_BUDGET_CHARS), wasCondensed: true };
}
