/**
 * Provider-neutral AI types.
 *
 * Nothing here references a specific vendor's SDK, so adding Gemini means
 * writing one new provider file — callers and the chat service stay unchanged.
 */

/** A tool invocation requested by the model. */
export interface AiToolCall {
  /** Provider-assigned id, echoed back when returning the tool's result. */
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  /**
   * Opaque provider data that must be echoed back verbatim when this call is
   * replayed in history — Gemini's `thoughtSignature`, for example. Providers
   * that do not use it ignore the field.
   */
  providerMetadata?: Record<string, unknown>;
}

/** One message in the conversation sent to the model. */
export interface AiMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  /** Present on assistant messages that request tools. */
  toolCalls?: AiToolCall[];
  /** Present on tool messages, linking back to the originating call. */
  toolCallId?: string;
  /** Name of the tool a tool message answers; Gemini pairs results by name. */
  toolName?: string;
}

/** A tool the model may call, described in JSON Schema. */
export interface AiToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/** The model's reply: free text, tool calls, or both. */
export interface AiResponse {
  content: string | null;
  toolCalls: AiToolCall[];
}

export interface AiCompletionRequest {
  messages: AiMessage[];
  tools?: AiToolDefinition[];
}

/**
 * A piece of a streamed response.
 *
 * Text arrives incrementally as `delta` chunks. Tool calls cannot be acted on
 * until the model has finished emitting their arguments, so they are delivered
 * whole in the final `done` chunk rather than streamed.
 */
export type AiStreamChunk =
  | { type: "delta"; text: string }
  | { type: "done"; response: AiResponse };

/**
 * Contract every AI provider implements.
 *
 * `stream` powers the chat UI; `complete` remains for the second, non-visible
 * AI call made after a tool runs.
 */
export interface AiProvider {
  readonly name: string;
  complete(request: AiCompletionRequest): Promise<AiResponse>;
  stream(request: AiCompletionRequest): AsyncIterable<AiStreamChunk>;
}
