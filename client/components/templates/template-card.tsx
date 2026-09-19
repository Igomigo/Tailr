import Image from "next/image";
import type { ResumeTemplate } from "@/lib/resume-templates";
import {
  RESUME_PAGE_HEIGHT,
  RESUME_PAGE_WIDTH,
} from "@/lib/resume-templates";

interface TemplateCardProps {
  template: ResumeTemplate;
  onClick: () => void;
  compact?: boolean;
}

export function TemplateCard({
  template,
  onClick,
  compact = false,
}: TemplateCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group block w-full cursor-pointer rounded-[var(--radius-md)] text-left"
    >
      <div
        className="relative overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-white shadow-[0_10px_30px_-24px_rgba(0,0,0,0.8)] transition-[transform,border-color,box-shadow] duration-300 ease-out-soft group-hover:-translate-y-1 group-hover:border-[var(--color-line-strong)] group-hover:shadow-[0_20px_48px_-20px_rgba(0,0,0,0.75)]"
        style={{ aspectRatio: `${RESUME_PAGE_WIDTH} / ${RESUME_PAGE_HEIGHT}` }}
      >
        <Image
          src={`/templates/${template.id}.png`}
          alt={`${template.name} resume template`}
          fill
          sizes={compact ? "(max-width: 640px) 42vw, 220px" : "(max-width: 640px) 140px, 208px"}
          className="object-contain"
        />
      </div>
      <p className="mt-3 text-small text-ink-muted transition-colors duration-300 ease-out-soft group-hover:text-ink">
        {template.name}
      </p>
      <p
        className={`mt-0.5 text-micro text-ink-faint ${
          compact ? "" : "hidden sm:block"
        }`}
      >
        {template.note}
      </p>
    </button>
  );
}
