"use client";

import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Modal } from "@/components/ui/modal";
import { getSession } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { ChatMessage } from "@/lib/types";

interface SessionPreviewProps {
  open: boolean;
  id: string;
  title: string;
  liveMessages?: ChatMessage[];
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
}

/** Mounted only for the held session; shares the conversation's existing cache. */
export function SessionPreview({ open, id, title, liveMessages, onClose, onRename, onDelete }: SessionPreviewProps) {
  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.session(id),
    queryFn: () => getSession(id),
    enabled: open && liveMessages === undefined,
    staleTime: 30_000,
    retry: false,
  });
  const messages = liveMessages ?? data?.messages;
  const recent = messages?.filter(message => message.role !== "tool").slice().reverse();
  const user = recent?.find(message => message.role === "user");
  const assistant = recent?.find(message => message.role === "assistant" && message.content);

  return createPortal(
    <Modal open={open} onClose={onClose} title={`Preview: ${title}`} size="sm" bare showClose={false}>
      <div className="overflow-hidden rounded-[24px] border border-white/15 bg-[var(--color-overlay)] shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
        <div className="border-b border-white/10 px-5 py-4">
          <p className="mb-2 text-micro uppercase tracking-widest text-ink-faint">Conversation preview</p>
          <h2 className="line-clamp-3 break-words text-base font-semibold text-ink">{title}</h2>
        </div>
        <div className="flex h-[min(30dvh,240px)] flex-col gap-4 overflow-hidden px-5 py-4 text-sm leading-relaxed text-ink-muted" aria-live="polite">
          {!messages ? (
            <p className="my-auto text-center text-ink-faint">{isError ? "Preview unavailable. You can still manage this chat below." : isPending ? "Loading preview…" : "No messages yet."}</p>
          ) : !user && !assistant ? (
            <p className="my-auto text-center text-ink-faint">No messages yet.</p>
          ) : <>
            {user && <div className="ml-6 shrink-0 rounded-2xl rounded-br-md bg-white/[0.08] px-3 py-2 text-ink">
              <p className="line-clamp-2 break-words">{user.content || (user.attachments?.length ? "Attached a file" : "Message")}</p>
            </div>}
            {assistant && <div className="min-h-0 overflow-hidden [mask-image:linear-gradient(to_bottom,black_80%,transparent)]">
              <p className="mb-1 text-micro text-ink-faint">Assistant</p>
              <div className="line-clamp-4 break-words [&_p]:inline [&_pre]:whitespace-pre-wrap">
                <ReactMarkdown skipHtml allowedElements={["p", "strong", "em", "code", "br"]} unwrapDisallowed>{assistant.content!.slice(0, 1200)}</ReactMarkdown>
              </div>
            </div>}
          </>}
        </div>
        <div className="border-t border-white/10">
          <button type="button" onClick={onRename} className="flex min-h-14 w-full items-center justify-between px-5 text-left text-base text-ink active:bg-white/10">
            Rename <Pencil size={18} />
          </button>
          <button type="button" onClick={onDelete} className="flex min-h-14 w-full items-center justify-between border-t border-white/10 px-5 text-left text-base text-[var(--color-danger)] active:bg-white/10">
            Delete <Trash2 size={18} />
          </button>
        </div>
      </div>
      <button type="button" onClick={onClose} className="mt-3 min-h-12 w-full rounded-2xl bg-[var(--color-overlay)] text-sm text-ink">Cancel</button>
    </Modal>,
    document.body,
  );
}
