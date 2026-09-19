"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  type WheelEvent,
} from "react";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Modal } from "@/components/ui/modal";
import {
  RESUME_PAGE_HEIGHT,
  RESUME_PAGE_WIDTH,
  RESUME_TEMPLATES,
} from "@/lib/resume-templates";

interface TemplatePreviewModalProps {
  activeIndex: number | null;
  onActiveIndexChange: (index: number | null) => void;
}

export function TemplatePreviewModal({
  activeIndex,
  onActiveIndexChange,
}: TemplatePreviewModalProps) {
  const wheelLockedRef = useRef(false);
  const active = activeIndex === null ? null : RESUME_TEMPLATES[activeIndex];

  const showAdjacentTemplate = useCallback((direction: -1 | 1) => {
    if (activeIndex === null) return;
    onActiveIndexChange(
      (activeIndex + direction + RESUME_TEMPLATES.length)
        % RESUME_TEMPLATES.length,
    );
  }, [activeIndex, onActiveIndexChange]);

  useEffect(() => {
    if (activeIndex === null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showAdjacentTemplate(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        showAdjacentTemplate(1);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, showAdjacentTemplate]);

  const handlePreviewWheel = (event: WheelEvent<HTMLDivElement>) => {
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY)
      ? event.deltaX
      : event.deltaY;

    if (Math.abs(delta) < 24 || wheelLockedRef.current) return;

    event.preventDefault();
    wheelLockedRef.current = true;
    showAdjacentTemplate(delta > 0 ? 1 : -1);
    window.setTimeout(() => {
      wheelLockedRef.current = false;
    }, 360);
  };

  return (
    <Modal
      open={activeIndex !== null}
      onClose={() => onActiveIndexChange(null)}
      title={active ? `${active.name} template` : undefined}
      size="lg"
      bare
    >
      {active && (
        <div
          onWheel={handlePreviewWheel}
          className="group/preview relative w-full"
          style={{ aspectRatio: `${RESUME_PAGE_WIDTH} / ${RESUME_PAGE_HEIGHT}` }}
        >
          <div className="absolute inset-0 overflow-hidden rounded-[var(--radius-md)] bg-white">
            <Image
              src={`/templates/${active.id}.png`}
              alt={`${active.name} resume template, full page`}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-contain"
              priority
            />
          </div>

          <PreviewControl
            direction="previous"
            onClick={() => showAdjacentTemplate(-1)}
          />
          <PreviewControl
            direction="next"
            onClick={() => showAdjacentTemplate(1)}
          />
        </div>
      )}
    </Modal>
  );
}

function PreviewControl({
  direction,
  onClick,
}: {
  direction: "previous" | "next";
  onClick: () => void;
}) {
  const previous = direction === "previous";
  const Icon = previous ? ChevronLeft : ChevronRight;

  return (
    <div
      className={`absolute top-1/2 z-20 -translate-y-1/2 opacity-85 transition-opacity duration-200 lg:opacity-0 lg:group-focus-within/preview:opacity-100 lg:group-hover/preview:opacity-100 ${
        previous ? "left-2 lg:-left-16" : "right-2 lg:-right-16"
      }`}
    >
      <GlassSurface variant="clear" className="size-10 rounded-full">
        <button
          type="button"
          aria-label={`View ${direction} template`}
          onClick={onClick}
          className="flex size-10 cursor-pointer items-center justify-center rounded-full text-black transition-colors duration-150 hover:bg-black/[0.05] lg:text-white lg:hover:bg-white/[0.08]"
        >
          <Icon aria-hidden size={19} strokeWidth={1.9} />
        </button>
      </GlassSurface>
    </div>
  );
}
