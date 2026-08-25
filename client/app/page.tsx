"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { TemplateGallery } from "@/components/template-gallery";
import { Logo } from "@/components/logo";
import { rise, stagger, transition } from "@/lib/motion";

/**
 * Landing page.
 *
 * Its only job is to make the product worth trying: a clear promise, and real
 * resumes rendered by the same pipeline users will get. The message input
 * lives in the chat rather than here, so nobody types a job description only
 * to be interrupted by a sign-in wall.
 */
export default function LandingPage() {
  return (
    <main className="relative flex min-h-dvh flex-col">
      {/* A single soft wash of accent light, well below the fold of attention. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-144 opacity-[0.055]"
        style={{
          background:
            "radial-gradient(60rem 26rem at 50% -6rem, var(--color-accent), transparent 70%)",
        }}
      />

      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...transition.base, delay: 0.1 }}
        className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-8"
      >
        <Logo />
        <Link
          href="/auth"
          className="rounded-full px-4 py-2 text-small text-ink-muted transition-colors duration-150 hover:bg-white/[0.06] hover:text-ink"
        >
          Sign in
        </Link>
      </motion.header>

      <motion.div
        variants={stagger(0.08, 0.15)}
        initial="hidden"
        animate="visible"
        className="relative z-10 mx-auto flex w-full max-w-[44rem] flex-1 flex-col justify-center px-5 pb-16 pt-6 sm:px-6"
      >
        <motion.h1
          variants={rise}
          className="text-center text-[2.25rem] font-medium leading-[1.1] tracking-[-0.03em] text-ink sm:text-display"
        >
          Your resume, tailored to
          <br className="hidden sm:block" /> the job in minutes.
        </motion.h1>

        <motion.p
          variants={rise}
          className="mx-auto mt-5 max-w-lg text-center text-ink-muted"
        >
          Land your next job faster: just drop in a job description and your resume (or start fresh). Chat your way to a job-winning, ATS-friendly resume you can download in minutes.
        </motion.p>
   

        <motion.div variants={rise} className="mt-9 flex justify-center">
          <Link
            href="/auth?mode=signup"
            className="
              group flex items-center gap-2 rounded-full
              bg-[var(--color-accent)] px-6 py-3.5
              text-small font-medium text-[#1a1205]
              transition-[background-color,transform] duration-200
              hover:bg-[var(--color-accent-hover)] active:scale-[0.98]
            "
          >
            Start building
            <ArrowRight
              size={16}
              strokeWidth={2}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        </motion.div>

        <motion.div variants={rise} className="mt-18">
          <TemplateGallery />
        </motion.div>
      </motion.div>
    </main>
  );
}
