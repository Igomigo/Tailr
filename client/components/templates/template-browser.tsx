"use client";

import { LayoutTemplate } from "lucide-react";
import { useState } from "react";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Modal } from "@/components/ui/modal";
import { Tooltip } from "@/components/ui/tooltip";
import { RESUME_TEMPLATES } from "@/lib/resume-templates";
import { TemplateCard } from "./template-card";
import { TemplatePreviewModal } from "./template-preview-modal";

export function TemplateBrowser() {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const closeBrowser = () => {
    setOpen(false);
    setActiveIndex(null);
  };

  return (
    <>
      <Tooltip label="View templates" side="left">
        <GlassSurface variant="clear" className="rounded-full">
          <button
            type="button"
            aria-label="View templates"
            onClick={() => setOpen(true)}
            className="flex size-9 cursor-pointer items-center justify-center rounded-full text-white transition-colors duration-150 hover:bg-white/[0.08]"
          >
            <LayoutTemplate aria-hidden size={17} strokeWidth={1.9} />
          </button>
        </GlassSurface>
      </Tooltip>

      <Modal
        open={open && activeIndex === null}
        onClose={closeBrowser}
        title="Resume templates"
        size="wide"
        bare
      >
        <GlassSurface
          variant="clear"
          className="rounded-[var(--radius-lg)] p-4 sm:p-6"
        >
          <div className="mb-5 pr-10">
            <h2 className="text-title font-semibold text-ink">
              Find your style
            </h2>
            <p className="mt-1 text-small text-ink-muted">
              Open any template for a closer look, then tell Tailr its name.
            </p>
          </div>

          <div className="max-h-[min(72vh,46rem)] overflow-y-auto overscroll-contain pr-1">
            <ul
              aria-label="Resume templates"
              className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 sm:gap-x-5"
            >
              {RESUME_TEMPLATES.map((template, index) => (
                <li key={template.id}>
                  <TemplateCard
                    template={template}
                    compact
                    onClick={() => setActiveIndex(index)}
                  />
                </li>
              ))}
            </ul>
          </div>
        </GlassSurface>
      </Modal>

      <TemplatePreviewModal
        activeIndex={activeIndex}
        onActiveIndexChange={(index) => {
          setActiveIndex(index);
          if (index === null) setOpen(true);
        }}
      />
    </>
  );
}
