import type { ChatMessage, ChatSession, ChatStreamEvent } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const TOKEN_KEY = "tailr_token";

/**
 * Reads the stored session token.
 *
 * The token is kept in localStorage and sent as an Authorization header rather
 * than held in a cookie, because the API is served from a different domain and
 * Safari — so every browser on iOS — blocks cross-site cookies.
 *
 * Returns null during server rendering, where localStorage does not exist, and
 * when a browser blocks storage access entirely.
 */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Stores the session token, or clears it when passed null. */
export function setToken(token: string | null): void {
  if (typeof window === "undefined") return;

  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // A browser with storage disabled still works for the current page load;
    // the session simply does not survive a refresh.
  }
}

/** Authorization header for the stored token, or nothing when signed out. */
function authHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
      ...init?.headers,
    },
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

/** Renames a chat session. */
export async function renameSession(
  chatId: string,
  title: string,
): Promise<ChatSession> {
  const { session } = await request<{ session: ChatSession }>(
    `/chat/${chatId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ title }),
    },
  );
  return session;
}

/** Deletes a chat session and its messages. */
export async function deleteSession(chatId: string): Promise<void> {
  await request(`/chat/${chatId}`, { method: "DELETE" });
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
    // Content-Type is left unset so the browser adds the multipart boundary.
    headers: authHeader(),
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
  const { user, token } = await request<{ user: AuthUser; token: string }>(
    "/auth/signup",
    { method: "POST", body: JSON.stringify({ name, email, password }) },
  );

  setToken(token);
  return user;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthUser> {
  const { user, token } = await request<{ user: AuthUser; token: string }>(
    "/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
  );

  setToken(token);
  return user;
}

export async function logout(): Promise<void> {
  try {
    await request("/auth/logout", { method: "POST" });
  } finally {
    // Cleared even when the request fails: the token is what signs the user
    // in, so discarding it is what actually ends the session.
    setToken(null);
  }
}

/** Returns the signed-in user, or null when there is no valid session. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  // Avoids a guaranteed 401 on every first load for a signed-out visitor.
  if (!getToken()) return null;

  try {
    const { user } = await request<{ user: AuthUser }>("/auth/me");
    return user;
  } catch {
    // The token is missing, expired, or rejected; drop it so the app does not
    // keep retrying with a credential the server will not accept.
    setToken(null);
    return null;
  }
}
