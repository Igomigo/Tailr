"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { AuthUser } from "@/lib/api";

interface ProfileModalProps {
  user: AuthUser;
  open: boolean;
  onClose: () => void;
  /** Awaited, so the confirm button can show progress until it resolves. */
  onLogout: () => void | Promise<void>;
}

/** Reads a date as "August 2026", which is enough detail for an account page. */
function formatJoined(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

/** Account details, opened from the sidebar. */
export function ProfileModal({
  user,
  open,
  onClose,
  onLogout,
}: ProfileModalProps) {
  const [confirming, setConfirming] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Reopening the dialog should always land on the account view, never on a
  // confirmation the user left behind when they last closed it.
  useEffect(() => {
    if (!open) {
      setConfirming(false);
      setSigningOut(false);
    }
  }, [open]);

  const handleConfirm = async (): Promise<void> => {
    setSigningOut(true);
    try {
      await onLogout();
    } finally {
      // The component usually unmounts with the redirect that follows; this
      // matters when sign-out fails and the dialog stays on screen.
      setSigningOut(false);
    }
  };

  if (confirming) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="Sign out?"
        description="You will need to sign in again to reach your conversations."
        size="sm"
      >
        <div className="mt-6 flex gap-3">
          <Button
            variant="ghost"
            onClick={() => setConfirming(false)}
            disabled={signingOut}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            loading={signingOut}
            className="flex-1"
          >
            Sign out
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Your account" size="sm">
      <div className="flex items-center gap-3.5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-quiet)] text-title font-medium text-[var(--color-accent)]">
          {user.name.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium text-ink">
            {user.name}
          </span>
          <span className="block truncate text-small text-ink-muted">
            {user.email}
          </span>
        </span>
      </div>

      <dl className="mt-6 flex flex-col gap-3 border-t border-[var(--color-line)] pt-5">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-small text-ink-muted">Member since</dt>
          <dd className="text-small text-ink">
            {formatJoined(user.createdAt)}
          </dd>
        </div>
      </dl>

      <Button
        variant="ghost"
        onClick={() => setConfirming(true)}
        className="mt-7 w-full"
      >
        Sign out
      </Button>
    </Modal>
  );
}
