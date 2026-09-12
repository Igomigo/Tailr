"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, MessageSquare } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useDebounced } from "@/hooks/use-debounced";
import * as api from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { SessionSearchResult } from "@/lib/api";
import type { ChatSession } from "@/lib/types";

/**
 * Quiet period before a query is sent.
 *
 * Short enough that results feel like a response to typing rather than to
 * stopping, long enough that a word is not sent one letter at a time.
 */
const DEBOUNCE_MS = 180;

/** Splits text around a match so the matching run can be marked. */
function splitOnMatch(text: string, query: string): [string, string, string] {
  const at = text.toLowerCase().indexOf(query.toLowerCase());
  if (at === -1) return [text, "", ""];

  return [
    text.slice(0, at),
    text.slice(at, at + query.length),
    text.slice(at + query.length),
  ];
}

/** Marks the part of a line that matched, so the reason for a hit is visible. */
function Highlighted({ text, query }: { text: string; query: string }) {
  const [before, match, after] = splitOnMatch(text, query);
  if (!match) return <>{text}</>;

  return (
    <>
      {before}
      <mark className="bg-transparent font-medium text-[var(--color-accent)]">
        {match}
      </mark>
      {after}
    </>
  );
}

/** "2 days ago", or a date once that stops being useful. */
function relativeTime(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;

  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  /** The sidebar's conversations, listed before anything has been typed. */
  sessions: ChatSession[];
}

/**
 * Finds a conversation by title or by something said in it.
 *
 * Shaped as a command palette rather than a dialog: the field is the content,
 * so there is no heading above it and no button to dismiss it. It opens on the
 * recent conversations, which makes it useful as a jump list before a single
 * key is pressed.
 */
export function SearchModal({ open, onClose, sessions }: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const trimmed = query.trim();
  const debounced = useDebounced(trimmed, DEBOUNCE_MS);

  const { data: matches, isFetching } = useQuery({
    queryKey: queryKeys.sessionSearch(debounced),
    queryFn: () => api.searchSessions(debounced),
    enabled: open && debounced.length > 0,
    // Results for a query do not change while the palette is open, and
    // reopening a search that was just run should not go back to the network.
    staleTime: 30_000,
  });

  /**
   * What the list shows. With nothing typed it is the recent conversations,
   * so the palette is a jump list until it becomes a search.
   */
  const results: SessionSearchResult[] = useMemo(() => {
    if (!trimmed) {
      return sessions.slice(0, 8).map((session) => ({ session, snippet: null }));
    }
    return matches ?? [];
  }, [trimmed, sessions, matches]);

  // Clamped rather than reset from an effect. The list changes on every
  // keystroke, and an effect would correct the highlight one render after the
  // rows beneath it had already moved.
  const active = selected < results.length ? selected : 0;

  /** Clears the field on the way out, so the palette opens fresh next time. */
  const close = (): void => {
    setQuery("");
    setSelected(0);
    onClose();
  };

  const openSession = (chatId: string): void => {
    close();
    router.push(`/chat/${chatId}`);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!results.length) return;

      const next =
        event.key === "ArrowDown"
          ? (active + 1) % results.length
          : (active - 1 + results.length) % results.length;

      setSelected(next);
      listRef.current?.children[next]?.scrollIntoView({ block: "nearest" });
      return;
    }

    if (event.key === "Enter" && results[active]) {
      event.preventDefault();
      openSession(results[active].session._id);
    }
  };

  // Distinguishes "nothing matched" from "the answer has not arrived", which
  // would otherwise both show as an empty panel.
  const searching = Boolean(trimmed) && (isFetching || debounced !== trimmed);

  return (
    <Modal open={open} onClose={close} size="wide" align="top">
      <div className="-m-6">
        <div className="flex items-center gap-3 border-b border-[var(--color-line)] px-5">
          <Search
            size={17}
            strokeWidth={1.75}
            className="shrink-0 text-ink-faint"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search conversations"
            aria-label="Search conversations"
            /*
              No focus treatment of its own: the field is focused the moment
              the palette opens and holds a cursor, so there is nothing left to
              indicate.
            */
            className="
              w-full bg-transparent py-4 text-body text-ink
              outline-none placeholder:text-ink-faint
            "
          />
        </div>

        {results.length > 0 && (
          <ul ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
            {results.map((result, index) => (
              <li key={result.session._id}>
                {/*
                  Hover and the keyboard share one highlight, set on pointer
                  entry rather than styled with :hover, so the two can never
                  show a different row as current.
                */}
                <button
                  type="button"
                  onClick={() => openSession(result.session._id)}
                  onMouseEnter={() => setSelected(index)}
                  data-selected={index === active}
                  className="
                    flex w-full items-start gap-3 rounded-[var(--radius-sm)]
                    px-3 py-2.5 text-left
                    transition-colors duration-100
                    data-[selected=true]:bg-white/[0.07]
                  "
                >
                  <MessageSquare
                    size={15}
                    strokeWidth={1.75}
                    className="mt-0.5 shrink-0 text-ink-faint"
                  />

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-small text-ink">
                      <Highlighted
                        text={result.session.title}
                        query={trimmed}
                      />
                    </span>

                    {result.snippet && (
                      <span className="mt-0.5 block truncate text-micro text-ink-muted">
                        <Highlighted text={result.snippet} query={trimmed} />
                      </span>
                    )}
                  </span>

                  <span className="shrink-0 text-micro text-ink-faint">
                    {relativeTime(result.session.lastMessageAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {!results.length && (
          <p className="px-5 py-8 text-center text-small text-ink-muted">
            {searching ? "Searching…" : `No conversations match “${trimmed}”`}
          </p>
        )}
      </div>
    </Modal>
  );
}
