"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { GlassSurface } from "@/components/ui/glass-surface";
import { getSession } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { ChatMessage } from "@/lib/types";

interface SessionPreviewProps {
  open: boolean;
  originY?: number;
  id: string;
  title: string;
  liveMessages?: ChatMessage[];
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
}

/** Mounted only for the held session; shares the conversation's existing cache. */
export function SessionPreview({ open, originY, id, title, liveMessages, onClose, onRename, onDelete }: SessionPreviewProps) {
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
    <AnimatePresence>
      {open && <PreviewLayer title={title} originY={originY} onClose={onClose}>
      <div className="session-preview-card">
        <div className="shrink-0 bg-white/[0.08] px-5 py-3">
          <h2 className="line-clamp-2 break-words text-[0.8125rem] text-ink-muted">{title}</h2>
        </div>
        <div className="shrink-0 px-5 pb-2 pt-4 text-[1.375rem] font-semibold tracking-tight text-ink" aria-hidden="true">Tailr<span className="text-[var(--color-accent)]">.</span></div>
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden px-5 py-4 text-[0.9375rem] leading-[1.6] text-ink-muted" aria-live="polite">
          {!messages ? (
            <p className="my-auto text-center text-ink-faint">{isError ? "Preview unavailable. You can still manage this chat below." : isPending ? "Loading preview…" : "No messages yet."}</p>
          ) : !user && !assistant ? (
            <p className="my-auto text-center text-ink-faint">No messages yet.</p>
          ) : <>
            {user && <div className="ml-6 shrink-0 rounded-2xl rounded-br-md bg-white/[0.08] px-3 py-2 text-ink">
              <p className="line-clamp-2 break-words">{user.content || (user.attachments?.length ? "Attached a file" : "Message")}</p>
            </div>}
            {assistant && <div className="min-h-0 overflow-hidden [mask-image:linear-gradient(to_bottom,black_80%,transparent)]">
              <div className="break-words text-ink [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ol]:mb-3 [&_ol]:list-decimal [&_li]:ml-5 [&_li]:mb-2 [&_code]:whitespace-pre-wrap">
                <ReactMarkdown skipHtml allowedElements={["p", "strong", "em", "code", "br", "ul", "ol", "li"]} unwrapDisallowed>{assistant.content!.slice(0, 2400)}</ReactMarkdown>
              </div>
            </div>}
          </>}
        </div>
      </div>
        <GlassSurface className="session-preview-actions">
          <button type="button" onClick={onRename} className="flex min-h-14 w-full items-center gap-4 px-5 text-left text-lg text-ink active:bg-white/10">
            <Pencil size={21} aria-hidden="true" /> Rename
          </button>
          <button type="button" onClick={onDelete} className="flex min-h-14 w-full items-center gap-4 border-t border-white/10 px-5 text-left text-lg text-[var(--color-danger)] active:bg-white/10">
            <Trash2 size={21} aria-hidden="true" /> Delete
          </button>
        </GlassSurface>
      </PreviewLayer>}
    </AnimatePresence>,
    document.body,
  );
}

/** Native dialog supplies focus containment, background inertness, and Escape.
 * Its transparent top layer lets the two floating surfaces remain independent.
 */
function PreviewLayer({ title, originY, onClose, children }: {
  title: string;
  originY?: number;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    dialog.focus({ preventScroll: true });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <motion.dialog
      ref={dialogRef}
      tabIndex={-1}
      aria-label={`Preview: ${title}`}
      className="session-preview-layer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.18 }}
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
    >
      <motion.div
        className="session-preview-stack"
        onClick={event => { if (event.target === event.currentTarget) onClose(); }}
        style={{ transformOrigin: `25% ${originY === undefined ? "35%" : `${Math.max(0, originY - window.innerHeight * 0.06)}px`}` }}
        initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.94, y: reducedMotion ? 0 : 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.96, y: reducedMotion ? 0 : 4 }}
        transition={{ duration: reducedMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </motion.dialog>
  );
}
