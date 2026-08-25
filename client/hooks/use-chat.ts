"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "@/lib/api";
import type { ChatMessage } from "@/lib/types";

/** What the assistant is currently doing, used to pick the right indicator. */
export type ChatStatus = "idle" | "thinking" | "streaming" | "generating";

interface UseChatOptions {
  chatId?: string;
  /** Called once a session is created, so the route can update its URL. */
  onSessionCreated?: (chatId: string) => void;
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
  onTitle,
}: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(chatId));

  const sessionIdRef = useRef<string | undefined>(chatId);
  const abortRef = useRef<AbortController | null>(null);
  // Kept so a failed turn can be resent without retyping.
  const lastAttemptRef = useRef<{ text: string; files: File[] } | null>(null);

  useEffect(() => {
    sessionIdRef.current = chatId;
  }, [chatId]);

  // Load history when opening an existing conversation.
  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    api
      .getSession(chatId)
      .then(({ messages: history }) => {
        if (cancelled) return;
        setMessages(history.filter((message) => message.role !== "tool"));
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(
            cause instanceof Error ? cause.message : "Could not load this chat",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [chatId]);

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
      let created = false;

      try {
        if (!id) {
          const session = await api.createSession();
          id = session._id;
          sessionIdRef.current = id;
          // Deliberately not announced yet: telling the route now would send
          // it to /chat/:id, remounting this hook and cutting off the stream
          // below before a single token arrives.
          created = true;
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
              // Replace the optimistic message with the persisted one.
              setMessages((current) =>
                current.map((message) =>
                  message._id === optimistic._id ? event.message : message,
                ),
              );
              break;

            case "delta":
              streamed += event.text;
              setStreamingText(streamed);
              setStatus("streaming");
              break;

            case "notice":
              setNotice(event.text);
              break;

            case "tool-start":
              setStatus("generating");
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
        if (created && id) onSessionCreated?.(id);
      }
    },
    [onSessionCreated, onTitle],
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
    error,
    notice,
    loading,
    send,
    stop,
    retry,
  };
}
