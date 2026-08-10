import { z } from "zod";

/**
 * Validation for the resume JSON the model produces.
 *
 * This is the single source of truth for the tool contract: the JSON Schema
 * advertised to the model is generated from these definitions, so what the
 * model is told and what we accept cannot drift apart.
 */

const contactSchema = z.object({
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedin: z.string().optional(),
  portfolio: z.string().optional(),
});

const experienceSchema = z.object({
  company: z.string(),
  role: z.string(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  bullets: z.array(z.string()).optional(),
});

const projectSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  technologies: z.array(z.string()).optional(),
  bullets: z.array(z.string()).optional(),
});

const educationSchema = z.object({
  school: z.string(),
  degree: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const certificationSchema = z.object({
  name: z.string(),
  issuer: z.string().optional(),
  date: z.string().optional(),
});

/** Sections that do not fit the standard set (publications, awards, languages). */
const customSectionSchema = z.object({
  title: z.string(),
  items: z.array(
    z.object({
      heading: z.string().optional(),
      subheading: z.string().optional(),
      dates: z.string().optional(),
      bullets: z.array(z.string()).optional(),
    }),
  ),
});

export const resumeSchema = z.object({
  fullName: z.string().min(1),
  headline: z.string().optional(),
  contact: contactSchema,
  summary: z.string().optional(),
  skills: z.array(z.string()).optional(),
  experience: z.array(experienceSchema).optional(),
  projects: z.array(projectSchema).optional(),
  education: z.array(educationSchema).optional(),
  certifications: z.array(certificationSchema).optional(),
  customSections: z.array(customSectionSchema).optional(),
});

/** modern-accent is listed first so it reads as the primary choice to the model. */
export const TEMPLATE_NAMES = [
  "modern-accent",
  "classic-ats",
  "compact-professional",
] as const;

export const generateResumePdfInputSchema = z.object({
  template: z
    .enum(TEMPLATE_NAMES)
    .default("modern-accent")
    .describe(
      "Resume template. Use modern-accent unless the user wants something more conservative (classic-ats) or needs a denser layout (compact-professional).",
    ),
  resume: resumeSchema,
});

export type GenerateResumePdfInput = z.infer<typeof generateResumePdfInputSchema>;
