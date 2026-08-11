import { PanelLeft } from "lucide-react";

interface SidebarToggleProps {
  collapsed: boolean;
  onToggle: () => void;
}

/** Collapses and expands the desktop sidebar. */
export function SidebarToggle({ collapsed, onToggle }: SidebarToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={collapsed ? "Show sidebar" : "Hide sidebar"}
      aria-expanded={!collapsed}
      className="rounded-[var(--radius-sm)] p-2 text-ink-faint transition-colors duration-150 hover:bg-white/[0.06] hover:text-ink"
    >
      <PanelLeft size={18} strokeWidth={1.75} />
    </button>
  );
}
