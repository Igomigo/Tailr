/**
 * The structured resume shape that templates render.
 *
 * This is the contract between the AI and the PDF pipeline: the AI produces
 * this JSON as `generate_resume_pdf` tool input, and templates turn it into
 * HTML. Only `fullName` and `contact` are required — every section is optional
 * so a sparse resume renders without empty headings.
 */
export interface ResumeContact {
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  portfolio?: string;
}

export interface ResumeExperience {
  company: string;
  role: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  bullets?: string[];
}

export interface ResumeProject {
  name: string;
  description?: string;
  technologies?: string[];
  bullets?: string[];
}

export interface ResumeEducation {
  school: string;
  degree?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
}

export interface ResumeCertification {
  name: string;
  issuer?: string;
  date?: string;
}

/** A section that does not fit the standard set (publications, awards, languages). */
export interface ResumeCustomSection {
  title: string;
  items: Array<{
    heading?: string;
    subheading?: string;
    dates?: string;
    bullets?: string[];
  }>;
}

export interface Resume {
  fullName: string;
  headline?: string;
  contact: ResumeContact;
  summary?: string;
  skills?: string[];
  experience?: ResumeExperience[];
  projects?: ResumeProject[];
  education?: ResumeEducation[];
  certifications?: ResumeCertification[];
  customSections?: ResumeCustomSection[];
}

export type TemplateName = "classic-ats" | "modern-accent" | "compact-professional";
