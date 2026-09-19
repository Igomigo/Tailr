export interface ResumeTemplate {
  id: string;
  name: string;
  note: string;
}

export const RESUME_TEMPLATES: readonly ResumeTemplate[] = [
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
  {
    id: "classic-ats",
    name: "Classic",
    note: "Plain and conservative",
  },
  {
    id: "compact-professional",
    name: "Compact",
    note: "More on every page",
  },
] as const;

/** Preview assets use the same proportions as an A4 resume page. */
export const RESUME_PAGE_WIDTH = 1000;
export const RESUME_PAGE_HEIGHT = 1414;
