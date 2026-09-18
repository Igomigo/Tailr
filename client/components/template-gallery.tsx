"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type WheelEvent,
} from "react";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Modal } from "@/components/ui/modal";

interface Template {
  id: string;
  name: string;
  note: string;
}

const TEMPLATES: Template[] = [
  {
    id: "classy-pink",
    name: "Classy Pink",
    note: "Warm, expressive, and polished",
  },
  {
    id: "atlas",
    name: "Atlas",
    note: "Confident structure with crisp colour",
  },
  {
    id: "editorial",
    name: "Editorial",
    note: "Elegant type with a timeless finish",
  },
  {
    id: "mono",
    name: "Mono",
    note: "Minimal, focused, and technical",
  },
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
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const railRef = useRef<HTMLUListElement>(null);
  const wheelLockedRef = useRef(false);
  const active = activeIndex === null ? null : TEMPLATES[activeIndex];

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

  const showAdjacentTemplate = useCallback((direction: -1 | 1) => {
    setActiveIndex((current) => {
      if (current === null) return null;
      return (current + direction + TEMPLATES.length) % TEMPLATES.length;
    });
  }, []);

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
          {TEMPLATES.map((template, index) => (
            <li
              key={template.id}
              className="w-[8.75rem] shrink-0 snap-start sm:w-[13rem]"
            >
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                className="group block w-full cursor-pointer rounded-[var(--radius-md)] text-left"
              >
                <div
                  className="
                    relative overflow-hidden
                    rounded-[var(--radius-md)] border border-[var(--color-line)]
                    bg-white shadow-[0_10px_30px_-24px_rgba(0,0,0,0.8)]
                    transition-[transform,border-color,box-shadow]
                    duration-300 ease-out-soft
                    group-hover:-translate-y-1
                    group-hover:border-[var(--color-line-strong)]
                    group-hover:shadow-[0_20px_48px_-20px_rgba(0,0,0,0.75)]
                  "
                  style={{ aspectRatio: `${PAGE_WIDTH} / ${PAGE_HEIGHT}` }}
                >
                  <Image
                    src={`/templates/${template.id}.png`}
                    alt={`${template.name} resume template`}
                    fill
                    sizes="(max-width: 640px) 140px, 208px"
                    className="object-contain"
                  />
                </div>
                <p className="mt-3 text-small text-ink-muted transition-colors duration-300 ease-out-soft group-hover:text-ink">
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

      <Modal
        open={activeIndex !== null}
        onClose={() => setActiveIndex(null)}
        title={active ? `${active.name} template` : undefined}
        size="lg"
        bare
      >
        {active && (
          <div
            onWheel={handlePreviewWheel}
            className="group/preview relative w-full"
            style={{ aspectRatio: `${PAGE_WIDTH} / ${PAGE_HEIGHT}` }}
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

            <div className="absolute left-2 top-1/2 z-20 -translate-y-1/2 opacity-85 transition-opacity duration-200 lg:-left-16 lg:opacity-0 lg:group-focus-within/preview:opacity-100 lg:group-hover/preview:opacity-100">
              <GlassSurface variant="clear" className="size-10 rounded-full">
                <button
                  type="button"
                  aria-label="View previous template"
                  onClick={() => showAdjacentTemplate(-1)}
                  className="flex size-10 cursor-pointer items-center justify-center rounded-full text-black transition-colors duration-150 hover:bg-black/[0.05] lg:text-white lg:hover:bg-white/[0.08]"
                >
                  <ChevronLeft aria-hidden size={19} strokeWidth={1.9} />
                </button>
              </GlassSurface>
            </div>

            <div className="absolute right-2 top-1/2 z-20 -translate-y-1/2 opacity-85 transition-opacity duration-200 lg:-right-16 lg:opacity-0 lg:group-focus-within/preview:opacity-100 lg:group-hover/preview:opacity-100">
              <GlassSurface variant="clear" className="size-10 rounded-full">
                <button
                  type="button"
                  aria-label="View next template"
                  onClick={() => showAdjacentTemplate(1)}
                  className="flex size-10 cursor-pointer items-center justify-center rounded-full text-black transition-colors duration-150 hover:bg-black/[0.05] lg:text-white lg:hover:bg-white/[0.08]"
                >
                  <ChevronRight aria-hidden size={19} strokeWidth={1.9} />
                </button>
              </GlassSurface>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
