import type { ChatMessage, ChatSession, ChatStreamEvent } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** Thrown when the API responds with a non-2xx status. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    // The session lives in an httpOnly cookie, which is only sent when
    // credentials are included on a cross-origin request.
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  const body = (await response.json().catch(() => null)) as
    (T & { error?: string }) | null;

  if (!response.ok) {
    throw new ApiError(response.status, body?.error ?? "Request failed");
  }

  return body as T;
}

/** Creates a chat session. */
export async function createSession(): Promise<ChatSession> {
  const { session } = await request<{ session: ChatSession }>("/chat", {
    method: "POST",
    body: "{}",
  });
  return session;
}

/** Lists chat sessions, most recently active first. */
export async function listSessions(): Promise<ChatSession[]> {
  const { sessions } = await request<{ sessions: ChatSession[] }>("/chat");
  return sessions;
}

/** Loads one session with its full message history. */
export async function getSession(
  chatId: string,
): Promise<{ session: ChatSession; messages: ChatMessage[] }> {
  return request(`/chat/${chatId}`);
}

/**
 * Sends a message and yields streamed events as they arrive.
 *
 * Uses fetch rather than EventSource because the request is a POST and may
 * carry file attachments, neither of which EventSource supports.
 *
 * @param chatId - Session to send to.
 * @param message - Message text.
 * @param files - Optional PDF or DOCX attachments.
 * @param signal - Aborts the request, used when the user stops generation.
 */
export async function* streamMessage(
  chatId: string,
  message: string,
  files: File[] = [],
  signal?: AbortSignal,
): AsyncGenerator<ChatStreamEvent> {
  const body = new FormData();
  body.append("message", message);
  files.forEach((file) => body.append("files", file));

  const response = await fetch(`${API_URL}/chat/${chatId}/message/stream`, {
    method: "POST",
    credentials: "include",
    body,
    signal,
  });

  if (!response.ok || !response.body) {
    throw new ApiError(response.status, "Could not reach the assistant");
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += value;

    // SSE frames are separated by a blank line; the last chunk may be partial.
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const line = frame.trim();
      if (!line.startsWith("data: ")) continue;
      yield JSON.parse(line.slice(6)) as ChatStreamEvent;
    }
  }
}

/** The signed-in account. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export async function signup(
  name: string,
  email: string,
  password: string,
): Promise<AuthUser> {
  const { user } = await request<{ user: AuthUser }>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
  return user;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const { user } = await request<{ user: AuthUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return user;
}

export async function logout(): Promise<void> {
  await request("/auth/logout", { method: "POST" });
}

/** Returns the signed-in user, or null when there is no valid session. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { user } = await request<{ user: AuthUser }>("/auth/me");
    return user;
  } catch {
    return null;
  }
}
