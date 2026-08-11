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
}

/**
 * Drives one conversation: history, sending, and streamed replies.
 *
 * Tool messages are kept out of the returned list because they carry raw JSON
 * meant for the model, not the user. The document URL they produce surfaces on
 * the assistant message that follows.
 */
export function useChat({ chatId, onSessionCreated }: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(chatId));

  const sessionIdRef = useRef<string | undefined>(chatId);
  const abortRef = useRef<AbortController | null>(null);

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
      setStatus("thinking");
      setStreamingText("");

      // Shown immediately so the conversation responds before the network does.
      const optimistic: ChatMessage = {
        _id: `pending-${Date.now()}`,
        chatSessionId: sessionIdRef.current ?? "",
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
      };
      setMessages((current) => [...current, optimistic]);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        let id = sessionIdRef.current;
        if (!id) {
          const session = await api.createSession();
          id = session._id;
          sessionIdRef.current = id;
          onSessionCreated?.(id);
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

            case "error":
              setError(event.error);
              break;

            case "end":
              break;
          }
        }
      } catch (cause: unknown) {
        if (cause instanceof Error && cause.name === "AbortError") return;
        setError(
          cause instanceof Error ? cause.message : "Something went wrong",
        );
      } finally {
        setStatus("idle");
        setStreamingText("");
        abortRef.current = null;
      }
    },
    [onSessionCreated],
  );

  /** Stops an in-flight response. */
  const stop = useCallback((): void => {
    abortRef.current?.abort();
  }, []);

  return { messages, streamingText, status, error, loading, send, stop };
}
