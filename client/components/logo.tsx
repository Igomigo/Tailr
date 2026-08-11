import Link from "next/link";

/**
 * The Tailr logo.
 *
 * The accent dot is the only place the brand colour appears in chrome, which
 * is what keeps it meaningful everywhere else.
 */
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-baseline gap-[3px] text-title font-semibold tracking-tight text-ink transition-opacity duration-150 hover:opacity-80"
    >
      Tailr
      <span
        aria-hidden
        className="mb-[3px] h-1.5 w-1.5 rounded-full bg-accent transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-125"
      />
    </Link>
  );
}
