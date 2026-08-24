import { FileText } from "lucide-react";
import type { Attachment } from "@/lib/types";

/** Formats a byte count as a short, readable size. */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * A file shown on the message it was sent with.
 *
 * Attachments are otherwise invisible once sent, leaving no record in the
 * conversation of what the assistant was given to work from.
 */
export function AttachmentChip({ attachment }: { attachment: Attachment }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-white/10 bg-white/[0.06] px-3 py-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-[var(--color-accent-quiet)] text-[var(--color-accent)]">
        <FileText size={14} strokeWidth={1.75} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-micro font-medium text-ink">
          {attachment.fileName}
        </span>
        <span className="block text-micro text-ink-faint">
          {formatSize(attachment.sizeBytes)}
        </span>
      </span>
    </div>
  );
}
