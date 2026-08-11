import type { Resume } from "../src/pdf/templates/resume.types.js";

/**
 * Sample resume used to exercise the PDF pipeline and to render the template
 * previews shown in the product.
 *
 * Every detail is fictional. Contact values use reserved example domains and
 * placeholder numbers so nothing here can resolve to a real person.
 *
 * Deliberately long enough to spill onto a second page (testing pagination and
 * page-break behaviour) and contains an ampersand in a company name to verify
 * HTML escaping.
 */
export const sampleResume: Resume = {
  fullName: "Alex Morgan",
  headline: "Senior Backend Engineer — Node.js, TypeScript, Distributed Systems",
  contact: {
    email: "alex.morgan@example.com",
    phone: "+1 (555) 0142",
    location: "Berlin, Germany",
    linkedin: "linkedin.com/in/example",
    portfolio: "github.com/example",
  },
  // The em dash here is deliberate: it verifies that templates strip dashes
  // rather than relying on the system prompt alone.
  summary:
    "Backend engineer with 6+ years building and scaling API-driven products — specialises in Node.js and TypeScript services, event-driven architectures, and the operational work that keeps them healthy in production. Comfortable owning a system end to end, from schema design through deployment and on-call.",
  skills: [
    "TypeScript",
    "Node.js",
    "Express",
    "NestJS",
    "PostgreSQL",
    "MongoDB",
    "Redis",
    "RabbitMQ",
    "Docker",
    "Kubernetes",
    "AWS",
    "Terraform",
    "GraphQL",
    "REST",
    "CI/CD",
    "Jest",
  ],
  experience: [
    {
      company: "Northwind & Co.",
      role: "Senior Backend Engineer",
      location: "Berlin, Germany",
      startDate: "Mar 2022",
      endDate: "Present",
      bullets: [
        "Led the redesign of the payment reconciliation service, cutting end-of-day settlement time from 4 hours to 25 minutes.",
        "Introduced idempotency keys across 12 write endpoints, eliminating duplicate-charge incidents entirely over the following year.",
        "Mentored 4 mid-level engineers through structured code review and pairing; two were promoted within 18 months.",
        "Migrated the core transaction store from a single Postgres instance to a partitioned setup handling 3x traffic with no downtime.",
      ],
    },
    {
      company: "Lumen Payments",
      role: "Backend Engineer",
      location: "Remote",
      startDate: "Jun 2020",
      endDate: "Feb 2022",
      bullets: [
        "Built the merchant webhook delivery pipeline handling 2M+ events daily with automatic retry and exponential backoff.",
        "Reduced p99 API latency from 850ms to 180ms by adding targeted Redis caching and removing N+1 query patterns.",
        "Wrote the internal service template adopted by 6 teams, standardising logging, tracing, and health checks.",
      ],
    },
    {
      company: "Bridgeworks Studio",
      role: "Software Engineer",
      location: "Munich, Germany",
      startDate: "Jan 2019",
      endDate: "May 2020",
      bullets: [
        "Delivered REST APIs for a logistics client serving 40,000 monthly active users.",
        "Raised backend test coverage from 34% to 81%, cutting regression escapes noticeably each release.",
      ],
    },
  ],
  projects: [
    {
      name: "Resume Tailoring Tool",
      description:
        "Chat-driven resume tailoring tool that turns a job description and an existing CV into an ATS-friendly PDF.",
      technologies: ["Node.js", "TypeScript", "MongoDB", "Gotenberg", "OpenAI"],
      bullets: [
        "Designed the tool-calling flow so PDF generation only fires after explicit user approval in chat.",
        "Built a JSON-to-HTML template layer rendered to PDF through headless Chromium.",
      ],
    },
    {
      name: "queue-lite",
      description: "A minimal Redis-backed job queue with delayed jobs and dead-letter support.",
      technologies: ["TypeScript", "Redis"],
      bullets: ["Published to npm; used in three production services."],
    },
  ],
  education: [
    {
      school: "Technical University of Berlin",
      degree: "B.Sc. Computer Science",
      location: "Berlin, Germany",
      startDate: "2014",
      endDate: "2018",
    },
  ],
  certifications: [
    { name: "Certified Cloud Solutions Architect", issuer: "Cloud Institute", date: "2023" },
    { name: "Associate Database Developer", issuer: "Data Systems Guild", date: "2022" },
  ],
};
