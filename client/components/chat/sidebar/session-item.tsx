import Link from "next/link";

interface SessionItemProps {
  id: string;
  title: string;
  active: boolean;
}

/** One conversation in the sidebar list. */
export function SessionItem({ id, title, active }: SessionItemProps) {
  return (
    <li>
      <Link
        href={`/chat/${id}`}
        data-active={active}
        className="
          block truncate rounded-[var(--radius-sm)] px-3 py-2
          text-small text-ink-muted
          transition-colors duration-150
          hover:bg-white/[0.05] hover:text-ink
          data-[active=true]:bg-white/[0.07] data-[active=true]:text-ink
        "
      >
        {title}
      </Link>
    </li>
  );
}
