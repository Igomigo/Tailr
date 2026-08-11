"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { transition } from "@/lib/motion";

interface Template {
  id: string;
  name: string;
  note: string;
}

const TEMPLATES: Template[] = [
  {
    id: "modern-accent",
    name: "Modern",
    note: "Clean type, a touch of colour",
  },
  { id: "classic-ats", name: "Classic", note: "Plain and conservative" },
  { id: "compact-professional", name: "Compact", note: "More on every page" },
];

/** Previews are rendered at true A4 proportions. */
const PAGE_WIDTH = 1000;
const PAGE_HEIGHT = 1414;

/**
 * Template previews shown beneath the message input.
 *
 * The images are real pages rendered by the same pipeline that produces a
 * user's resume, so the gallery is a genuine sample rather than a mockup.
 * Selecting one opens it full size.
 */
export function TemplateGallery() {
  const [active, setActive] = useState<Template | null>(null);

  // Escape closes the preview, and the page behind it should not scroll.
  useEffect(() => {
    if (!active) return;

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setActive(null);
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [active]);

  return (
    <>
      <div className="flex flex-col items-center gap-6">
        <p className="text-micro uppercase tracking-[0.14em] text-ink-faint">
          Every resume, three ways
        </p>

        <ul className="grid w-full grid-cols-3 gap-4 sm:gap-5">
          {TEMPLATES.map((template) => (
            <li key={template.id}>
              <button
                type="button"
                onClick={() => setActive(template)}
                className="group block w-full rounded-[var(--radius-md)] text-left"
              >
                <div
                  className="
                    relative overflow-hidden
                    rounded-[var(--radius-md)] border border-[var(--color-line)]
                    bg-white opacity-75
                    transition-[opacity,transform,border-color,box-shadow] duration-300
                    ease-[cubic-bezier(0.32,0.72,0,1)]
                    group-hover:-translate-y-1.5 group-hover:opacity-100
                    group-hover:border-[var(--color-line-strong)]
                    group-hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)]
                  "
                  style={{ aspectRatio: `${PAGE_WIDTH} / ${PAGE_HEIGHT}` }}
                >
                  <Image
                    src={`/templates/${template.id}.png`}
                    alt={`${template.name} resume template`}
                    fill
                    sizes="(max-width: 640px) 30vw, 220px"
                    className="object-contain"
                  />
                </div>
                <p className="mt-3 text-small text-ink-muted transition-colors duration-200 group-hover:text-ink">
                  {template.name}
                </p>
                <p className="hidden text-micro text-ink-faint sm:block">
                  {template.note}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${active.name} template preview`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition.base}
            onClick={() => setActive(null)}
            className="fixed inset-0 z-50 overflow-y-auto bg-[var(--color-canvas)]/80 backdrop-blur-2xl"
          >
            <div className="flex min-h-full items-start justify-center p-4 sm:p-10">
              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.99, y: 6 }}
                transition={transition.base}
                onClick={(event) => event.stopPropagation()}
                className="w-full max-w-[min(46rem,90vw)] overflow-hidden rounded-[var(--radius-lg)] bg-white shadow-[0_32px_90px_-20px_rgba(0,0,0,0.8)]"
              >
                <Image
                  src={`/templates/${active.id}.png`}
                  alt={`${active.name} resume template, full page`}
                  width={PAGE_WIDTH}
                  height={PAGE_HEIGHT}
                  className="h-auto w-full"
                  priority
                />
              </motion.div>
            </div>

            <button
              type="button"
              aria-label="Close preview"
              onClick={() => setActive(null)}
              className="fixed right-5 top-5 rounded-full border border-[var(--color-line)] bg-white/[0.06] p-2.5 text-ink-muted backdrop-blur-md transition-colors duration-150 hover:bg-white/[0.12] hover:text-ink"
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
