import OpenAI from "openai";
import type {
  AiCompletionRequest,
  AiMessage,
  AiProvider,
  AiResponse,
  AiToolCall,
  AiToolDefinition,
} from "./ai-provider.interface.js";
import { env } from "../config/env.js";
import { upstreamError } from "../shared/errors.js";

/** Translates neutral messages into the OpenAI chat format. */
function toOpenAiMessages(
  messages: AiMessage[],
): OpenAI.Chat.ChatCompletionMessageParam[] {
  return messages.map((message) => {
    if (message.role === "tool") {
      return {
        role: "tool",
        tool_call_id: message.toolCallId!,
        content: message.content ?? "",
      };
    }

    if (message.role === "assistant" && message.toolCalls?.length) {
      return {
        role: "assistant",
        content: message.content,
        tool_calls: message.toolCalls.map((call) => ({
          id: call.id,
          type: "function" as const,
          function: { name: call.name, arguments: JSON.stringify(call.arguments) },
        })),
      };
    }

    return {
      role: message.role as "system" | "user" | "assistant",
      content: message.content ?? "",
    };
  });
}

function toOpenAiTools(tools: AiToolDefinition[]): OpenAI.Chat.ChatCompletionTool[] {
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

/**
 * Parses tool-call arguments from the model.
 *
 * Arguments arrive as a JSON string that the model generated token by token,
 * so malformed JSON is a real possibility and must not crash the request.
 */
function parseArguments(raw: string, toolName: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw upstreamError(`Model returned invalid JSON arguments for tool "${toolName}"`);
  }
}

/** OpenAI implementation of the provider contract. */
export function createOpenAiProvider(): AiProvider {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required when AI_PROVIDER is \"openai\"");
  }

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  return {
    name: "openai",

    async complete({ messages, tools }: AiCompletionRequest): Promise<AiResponse> {
      let completion: OpenAI.Chat.ChatCompletion;

      try {
        completion = await client.chat.completions.create({
          model: env.OPENAI_MODEL,
          messages: toOpenAiMessages(messages),
          ...(tools?.length ? { tools: toOpenAiTools(tools), tool_choice: "auto" } : {}),
        });
      } catch (error) {
        const detail = error instanceof Error ? error.message : "unknown error";
        throw upstreamError(`OpenAI request failed: ${detail}`);
      }

      const choice = completion.choices[0]?.message;

      return {
        content: choice?.content ?? null,
        toolCalls: (choice?.tool_calls ?? []).flatMap((call) =>
          call.type === "function"
            ? [
                {
                  id: call.id,
                  name: call.function.name,
                  arguments: parseArguments(call.function.arguments, call.function.name),
                },
              ]
            : [],
        ),
      };
    },

    async *stream({ messages, tools }: AiCompletionRequest) {
      let stream;
      try {
        stream = await client.chat.completions.create({
          model: env.OPENAI_MODEL,
          messages: toOpenAiMessages(messages),
          ...(tools?.length ? { tools: toOpenAiTools(tools), tool_choice: "auto" as const } : {}),
          stream: true,
        });
      } catch (error) {
        const detail = error instanceof Error ? error.message : "unknown error";
        throw upstreamError(`OpenAI request failed: ${detail}`);
      }

      let text = "";
      // Tool-call arguments arrive as fragments spread across chunks and are
      // identified only by index, so they are accumulated before parsing.
      const partial = new Map<number, { id: string; name: string; args: string }>();

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        if (delta.content) {
          text += delta.content;
          yield { type: "delta" as const, text: delta.content };
        }

        for (const call of delta.tool_calls ?? []) {
          const existing = partial.get(call.index) ?? { id: "", name: "", args: "" };
          partial.set(call.index, {
            id: call.id ?? existing.id,
            name: call.function?.name ?? existing.name,
            args: existing.args + (call.function?.arguments ?? ""),
          });
        }
      }

      const toolCalls: AiToolCall[] = [...partial.values()].map((call) => ({
        id: call.id,
        name: call.name,
        arguments: parseArguments(call.args, call.name),
      }));

      yield { type: "done" as const, response: { content: text || null, toolCalls } };
    },
  };
}
