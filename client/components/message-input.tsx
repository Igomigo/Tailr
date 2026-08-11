"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { motion } from "motion/react";
import { ArrowUp, Paperclip, X } from "lucide-react";
import { transition } from "@/lib/motion";

/** Shared layout id, so the input animates between the landing page and chat. */
export const MESSAGE_INPUT_LAYOUT_ID = "tailr-message-input";

const MAX_FILES = 3;

interface MessageInputProps {
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  onSubmit: (message: string, files: File[]) => void;
}

/**
 * The message input, used on both the landing page and in the chat.
 *
 * The two share a layout id so the input travels between them rather than
 * being replaced. Height is handled entirely in CSS: `field-sizing-content`
 * grows the textarea with its text, and `max-h-52` caps it before it scrolls.
 */
export function MessageInput({
  placeholder = "Paste a job description, or describe the role you want…",
  autoFocus = false,
  disabled = false,
  onSubmit,
}: MessageInputProps) {
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = !disabled && (value.trim().length > 0 || files.length > 0);

  const submit = (): void => {
    if (!canSubmit) return;
    onSubmit(value.trim(), files);
    setValue("");
    setFiles([]);
  };

  /** Enter sends; Shift+Enter inserts a newline. */
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <motion.form
      layoutId={MESSAGE_INPUT_LAYOUT_ID}
      transition={transition.slow}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="w-full"
    >
      <div
        className="
          relative rounded-[30px]
          border border-white/12
          bg-white/[0.04] backdrop-blur-xl
          ring-0 ring-white/25
          transition-[box-shadow,border-color,background-color] duration-300
          ease-[cubic-bezier(0.32,0.72,0,1)]
          focus-within:border-white/25
          focus-within:bg-white/[0.07]
          focus-within:ring-4
        "
      >
        {files.length > 0 && (
          <ul className="flex flex-wrap gap-2 px-5 pt-4">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center gap-1.5 rounded-full bg-white/[0.07] py-1.5 pl-3 pr-1.5 text-micro text-ink-muted"
              >
                <span className="max-w-45 truncate">{file.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => setFiles(files.filter((_, i) => i !== index))}
                  className="rounded-full p-0.5 text-ink-faint transition-colors hover:bg-white/10 hover:text-ink"
                >
                  <X size={12} strokeWidth={2} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <textarea
          value={value}
          rows={1}
          autoFocus={autoFocus}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          className="
            field-sizing-content block max-h-52 w-full resize-none
            bg-transparent px-6 py-5 pr-26
            text-[1rem] leading-relaxed text-ink
            placeholder:text-ink-faint
            focus:outline-none disabled:opacity-50
          "
        />

        <div className="absolute bottom-3 right-3 flex items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            multiple
            hidden
            onChange={(event) => {
              setFiles(
                [...files, ...Array.from(event.target.files ?? [])].slice(
                  0,
                  MAX_FILES,
                ),
              );
              event.target.value = "";
            }}
          />
          <button
            type="button"
            aria-label="Attach your resume"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="
              rounded-full p-2 text-ink-faint
              transition-colors duration-150
              hover:bg-white/[0.07] hover:text-ink-muted
              disabled:opacity-40
            "
          >
            <Paperclip size={17} strokeWidth={1.75} />
          </button>

          <button
            type="submit"
            aria-label="Send message"
            disabled={!canSubmit}
            className="
              flex h-9 w-9 items-center justify-center rounded-full
              bg-[var(--color-accent)] text-[#1a1205]
              transition-[background-color,opacity,transform] duration-150
              hover:bg-[var(--color-accent-hover)]
              active:scale-95
              disabled:bg-white/[0.08] disabled:text-ink-faint
            "
          >
            <ArrowUp size={17} strokeWidth={2.25} />
          </button>
        </div>
      </div>
    </motion.form>
  );
}
