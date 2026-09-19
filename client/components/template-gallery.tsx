"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { GlassSurface } from "@/components/ui/glass-surface";
import { TemplateCard } from "@/components/templates/template-card";
import { TemplatePreviewModal } from "@/components/templates/template-preview-modal";
import { RESUME_TEMPLATES } from "@/lib/resume-templates";

/**
 * Template previews shown beneath the message input.
 *
 * The images are real pages rendered by the same pipeline that produces a
 * user's resume, so the gallery is a genuine sample rather than a mockup.
 * Selecting one opens it full size.
 */
export function TemplateGallery() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const railRef = useRef<HTMLUListElement>(null);

  const updateScrollState = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;

    const remaining = rail.scrollWidth - rail.clientWidth - rail.scrollLeft;
    setCanScrollLeft(rail.scrollLeft > 2);
    setCanScrollRight(remaining > 2);
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    updateScrollState();
    rail.addEventListener("scroll", updateScrollState, { passive: true });
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(rail);

    return () => {
      rail.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [updateScrollState]);

  const scroll = (direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;

    rail.scrollBy({
      left: direction * Math.max(rail.clientWidth * 0.72, 180),
      behavior: "smooth",
    });
  };

  return (
    <>
      <div className="flex w-full min-w-0 max-w-[52rem] flex-col gap-5 sm:relative sm:left-1/2 sm:w-[calc(100%+4rem)] sm:-translate-x-1/2 lg:w-[calc(100%+8rem)]">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-micro uppercase tracking-[0.14em] text-ink-faint">
            Find your style
          </h2>

          <div className="hidden items-center gap-2 sm:flex">
            <GlassSurface
              variant="clear"
              className={`rounded-full transition-opacity duration-200 ${
                canScrollLeft ? "" : "opacity-30"
              }`}
            >
              <button
                type="button"
                aria-label="View previous templates"
                disabled={!canScrollLeft}
                onClick={() => scroll(-1)}
                className="flex size-9 cursor-pointer items-center justify-center rounded-full text-white transition-colors duration-150 hover:bg-white/[0.08] disabled:cursor-default"
              >
                <ChevronLeft aria-hidden size={16} strokeWidth={1.9} />
              </button>
            </GlassSurface>
            <GlassSurface
              variant="clear"
              className={`rounded-full transition-opacity duration-200 ${
                canScrollRight ? "" : "opacity-30"
              }`}
            >
              <button
                type="button"
                aria-label="View more templates"
                disabled={!canScrollRight}
                onClick={() => scroll(1)}
                className="flex size-9 cursor-pointer items-center justify-center rounded-full text-white transition-colors duration-150 hover:bg-white/[0.08] disabled:cursor-default"
              >
                <ChevronRight aria-hidden size={16} strokeWidth={1.9} />
              </button>
            </GlassSurface>
          </div>
        </div>

        <ul
          ref={railRef}
          aria-label="Resume template styles"
          tabIndex={0}
          className="flex w-full snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-1 pb-3 pt-3 scroll-smooth [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-line-strong)] sm:gap-5 [&::-webkit-scrollbar]:hidden"
        >
          {RESUME_TEMPLATES.map((template, index) => (
            <li
              key={template.id}
              className="w-[8.75rem] shrink-0 snap-start sm:w-[13rem]"
            >
              <TemplateCard
                template={template}
                onClick={() => setActiveIndex(index)}
              />
            </li>
          ))}
        </ul>
      </div>

      <TemplatePreviewModal
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
      />
    </>
  );
}
