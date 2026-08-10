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
 * Contract every AI provider implements.
 *
 * @param request - Conversation plus any tools the model may call.
 * @returns The model's reply.
 */
export interface AiProvider {
  readonly name: string;
  complete(request: AiCompletionRequest): Promise<AiResponse>;
}
