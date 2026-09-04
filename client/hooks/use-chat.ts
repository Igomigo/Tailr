"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { ChatMessage, ChatSession } from "@/lib/types";

/** What the assistant is currently doing, used to pick the right indicator. */
export type ChatStatus = "idle" | "thinking" | "streaming" | "generating";

interface UseChatOptions {
  chatId?: string;
  /**
   * Called the moment a session exists, so the sidebar can show it while the
   * first reply is still streaming. Passes the whole session, not just its id,
   * so the list can be extended without refetching it.
   */
  onSessionCreated?: (session: ChatSession) => void;
  /**
   * Called once the turn is over, to move the route to the new conversation.
   *
   * Kept separate from `onSessionCreated` because navigating remounts this
   * hook, which would cut off a stream still in progress.
   */
  onSessionReady?: (chatId: string) => void;
  /** Called when the assistant names the conversation, on its first turn. */
  onTitle?: (chatId: string, title: string) => void;
}

/**
 * Drives one conversation: history, sending, and streamed replies.
 *
 * Tool messages are kept out of the returned list because they carry raw JSON
 * meant for the model, not the user. The document URL they produce surfaces on
 * the assistant message that follows.
 */
export function useChat({
  chatId,
  onSessionCreated,
  onSessionReady,
  onTitle,
}: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const sessionIdRef = useRef<string | undefined>(chatId);
  const abortRef = useRef<AbortController | null>(null);
  // Kept so a failed turn can be resent without retyping.
  const lastAttemptRef = useRef<{ text: string; files: File[] } | null>(null);

  useEffect(() => {
    sessionIdRef.current = chatId;
  }, [chatId]);

  // Loads an existing conversation. Disabled for a new chat, which has no id
  // and therefore no history to fetch.
  const {
    data: history,
    isPending,
    error: historyError,
  } = useQuery({
    queryKey: queryKeys.session(chatId ?? ""),
    queryFn: () => api.getSession(chatId!),
    enabled: Boolean(chatId),
  });

  // The streamed turn is owned here rather than in the cache, so opening a
  // conversation seeds the local list from whatever the query returned.
  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }

    if (history) {
      setMessages(history.messages.filter((message) => message.role !== "tool"));
    }
  }, [chatId, history]);

  const loading = Boolean(chatId) && isPending;

  const send = useCallback(
    async (text: string, files: File[] = []): Promise<void> => {
      setError(null);
      setNotice(null);
      setStatus("thinking");
      setStreamingText("");
      lastAttemptRef.current = { text, files };

      // Shown immediately so the conversation responds before the network does.
      const optimistic: ChatMessage = {
        _id: `pending-${Date.now()}`,
        chatSessionId: sessionIdRef.current ?? "",
        role: "user",
        content: text,
        // Shown from the local files so an attachment appears immediately
        // rather than materialising when the server echoes the message back.
        attachments: files.map((file, index) => ({
          fileId: `pending-${index}`,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        })),
        createdAt: new Date().toISOString(),
      };
      setMessages((current) => [...current, optimistic]);

      const controller = new AbortController();
      abortRef.current = controller;

      // Declared outside the try so the finally block can announce a newly
      // created session after the stream has finished.
      let id = sessionIdRef.current;
      let createdId: string | null = null;

      try {
        if (!id) {
          const session = await api.createSession();
          id = session._id;
          sessionIdRef.current = id;
          // Shown in the sidebar straight away, so a title generated during
          // this stream has a row to land on. Navigation waits until the
          // stream is done, since it would remount this hook and cut it off.
          createdId = id;
          onSessionCreated?.(session);
        }

        let streamed = "";

        for await (const event of api.streamMessage(
          id,
          text,
          files,
          controller.signal,
        )) {
          switch (event.type) {
            case "user-message":
              // Take the server's fields but keep the id already on screen.
              // React lists are keyed by id, so swapping it would unmount the
              // message and mount a new one, making it blink out and back for
              // a message that never actually changed.
              setMessages((current) =>
                current.map((message) =>
                  message._id === optimistic._id
                    ? { ...event.message, _id: optimistic._id }
                    : message,
                ),
              );
              break;

            case "delta":
              streamed += event.text;
              setStreamingText(streamed);
              setStatus("streaming");
              break;

            case "message":
              if (event.message.role === "tool") break;
              if (event.message.role === "assistant") {
                // Leaving "streaming" hides the in-progress bubble in the same
                // render that appends the persisted message, so the reply is
                // never shown twice.
                streamed = "";
                setStatus("thinking");
                setStreamingText("");
                setMessages((current) => [...current, event.message]);
              }
              break;

            case "notice":
              setNotice(event.text);
              break;

            case "tool-start":
              setStatus("generating");
              break;

            case "title":
              if (id) onTitle?.(id, event.title);
              break;

            case "error":
              setError(event.error);
              setMessages((current) =>
                current.filter((message) => message._id !== optimistic._id),
              );
              break;

            case "end":
              break;
          }
        }
      } catch (cause: unknown) {
        if (cause instanceof Error && cause.name === "AbortError") return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong. Please try again.",
        );
        // Remove the optimistic message so a retry does not duplicate it.
        setMessages((current) =>
          current.filter((message) => message._id !== optimistic._id),
        );
      } finally {
        setStatus("idle");
        setStreamingText("");
        abortRef.current = null;

        // Announced only once the turn is over. The route change this triggers
        // remounts the hook, which would abort a stream still in progress.
        if (createdId) onSessionReady?.(createdId);
      }
    },
    [onSessionCreated, onSessionReady, onTitle],
  );

  /** Stops an in-flight response. */
  const stop = useCallback((): void => {
    abortRef.current?.abort();
  }, []);

  /** Resends the message that failed. */
  const retry = useCallback((): void => {
    const attempt = lastAttemptRef.current;
    if (attempt) void send(attempt.text, attempt.files);
  }, [send]);

  return {
    messages,
    streamingText,
    status,
    // A failed turn takes precedence: it is the thing the user just tried.
    error: error ?? (historyError ? "Could not load this chat" : null),
    notice,
    loading,
    send,
    stop,
    retry,
  };
}
