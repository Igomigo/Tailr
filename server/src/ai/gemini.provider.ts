import { GoogleGenAI, type Content, type Part } from "@google/genai";
import type {
  AiCompletionRequest,
  AiMessage,
  AiProvider,
  AiResponse,
  AiToolDefinition,
} from "./ai-provider.interface.js";
import { env } from "../config/env.js";
import { upstreamError } from "../shared/errors.js";

/**
 * Splits the system prompt out of the message list.
 *
 * Gemini takes system instructions as a separate request field rather than as
 * a message with a "system" role.
 */
function extractSystemInstruction(messages: AiMessage[]): {
  systemInstruction: string;
  rest: AiMessage[];
} {
  const systemParts = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content ?? "");

  return {
    systemInstruction: systemParts.join("\n\n"),
    rest: messages.filter((message) => message.role !== "system"),
  };
}

/**
 * Translates neutral messages into Gemini's `Content` format.
 *
 * Two differences from OpenAI matter here: the assistant role is called
 * "model", and tool results are sent as a `functionResponse` part on a *user*
 * turn rather than as their own role. Gemini also matches tool results by
 * function name instead of by call id.
 */
function toGeminiContents(messages: AiMessage[]): Content[] {
  return messages.map((message) => {
    if (message.role === "tool") {
      let response: Record<string, unknown>;
      try {
        response = JSON.parse(message.content ?? "{}") as Record<string, unknown>;
      } catch {
        response = { result: message.content ?? "" };
      }

      return {
        role: "user",
        parts: [
          {
            functionResponse: {
              ...(message.toolCallId ? { id: message.toolCallId } : {}),
              name: message.toolName ?? "unknown",
              response,
            },
          },
        ],
      };
    }

    if (message.role === "assistant" && message.toolCalls?.length) {
      const parts: Part[] = message.toolCalls.map((call) => {
        const signature = call.providerMetadata?.thoughtSignature;
        return {
          functionCall: { id: call.id, name: call.name, args: call.arguments },
          // Newer Gemini models reject replayed function calls whose original
          // thought signature is missing, so it is echoed back verbatim.
          ...(typeof signature === "string" ? { thoughtSignature: signature } : {}),
        };
      });
      if (message.content) parts.unshift({ text: message.content });
      return { role: "model", parts };
    }

    return {
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content ?? "" }],
    };
  });
}

/** Gemini rejects unknown JSON Schema keywords, so only supported ones survive. */
const SUPPORTED_SCHEMA_KEYS = new Set([
  "type",
  "description",
  "properties",
  "required",
  "items",
  "enum",
  "nullable",
]);

/** Recursively strips JSON Schema keywords Gemini does not accept. */
function sanitizeSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(sanitizeSchema);
  if (schema === null || typeof schema !== "object") return schema;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
    if (!SUPPORTED_SCHEMA_KEYS.has(key)) continue;
    result[key] = key === "properties"
      ? Object.fromEntries(
          Object.entries(value as Record<string, unknown>).map(([name, sub]) => [
            name,
            sanitizeSchema(sub),
          ]),
        )
      : sanitizeSchema(value);
  }
  return result;
}

function toGeminiTools(tools: AiToolDefinition[]) {
  return [
    {
      functionDeclarations: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: sanitizeSchema(tool.parameters) as Record<string, unknown>,
      })),
    },
  ];
}

/** Google Gemini implementation of the provider contract. */
export function createGeminiProvider(): AiProvider {
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is required when AI_PROVIDER is "gemini"');
  }

  const client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

  return {
    name: "gemini",

    async complete({ messages, tools }: AiCompletionRequest): Promise<AiResponse> {
      const { systemInstruction, rest } = extractSystemInstruction(messages);

      let result;
      try {
        result = await client.models.generateContent({
          model: env.GEMINI_MODEL,
          contents: toGeminiContents(rest),
          config: {
            ...(systemInstruction ? { systemInstruction } : {}),
            ...(tools?.length ? { tools: toGeminiTools(tools) } : {}),
          },
        });
      } catch (error) {
        const detail = error instanceof Error ? error.message : "unknown error";
        throw upstreamError(`Gemini request failed: ${detail}`);
      }

      // Read parts directly rather than result.functionCalls: the thought
      // signature lives on the part, not on the parsed call.
      const parts = result.candidates?.[0]?.content?.parts ?? [];

      const toolCalls = parts.flatMap((part, index) => {
        if (!part.functionCall) return [];
        const signature = (part as { thoughtSignature?: string }).thoughtSignature;
        return [
          {
            id: part.functionCall.id ?? `call_${index}`,
            name: part.functionCall.name ?? "",
            arguments: (part.functionCall.args ?? {}) as Record<string, unknown>,
            ...(signature ? { providerMetadata: { thoughtSignature: signature } } : {}),
          },
        ];
      });

      return { content: result.text ?? null, toolCalls };
    },
  };
}
