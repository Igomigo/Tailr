"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileModal } from "./profile-modal";
import { useAuth } from "@/hooks/use-auth";

/** The account row pinned to the foot of the sidebar. */
export function ProfileButton() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const handleLogout = async (): Promise<void> => {
    await logout();
    router.replace("/");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="
          flex w-full items-center gap-2.5 rounded-[var(--radius-sm)]
          px-2 py-2 text-left
          transition-colors duration-150 hover:bg-white/[0.05]
        "
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-quiet)] text-micro font-medium text-[var(--color-accent)]">
          {user.name.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-small text-ink">
            {user.name}
          </span>
        </span>
      </button>

      <ProfileModal
        user={user}
        open={open}
        onClose={() => setOpen(false)}
        onLogout={handleLogout}
      />
    </>
  );
}
