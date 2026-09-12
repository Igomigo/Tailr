"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { animate, useMotionValue } from "motion/react";

/** The revealed sidebar occupies this fraction of a compact viewport. */
const DRAWER_WIDTH_RATIO = 0.8;
const MOBILE_BREAKPOINT_PX = 768;
const DIRECTION_THRESHOLD_PX = 8;
const DIRECTION_DOMINANCE = 1.15;
const OPEN_POSITION_RATIO = 0.42;
const FLING_VELOCITY_PX_PER_MS = 0.45;
const RECENT_VELOCITY_WINDOW_MS = 100;

interface DrawerGesture {
  pointerId: number;
  startX: number;
  startY: number;
  startOffset: number;
  horizontal: boolean;
  lastX: number;
  lastAt: number;
  velocityX: number;
}

function drawerWidth(): number {
  return window.innerWidth * DRAWER_WIDTH_RATIO;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

/**
 * Controls the mobile sidebar and the conversation surface above it.
 *
 * A gesture remains undecided for its first few pixels. Vertical intent is
 * released to native transcript scrolling; horizontal intent locks for the
 * rest of that touch and drives only the surface's x coordinate.
 */
export function useMobileDrawer() {
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [surfaceRaised, setSurfaceRaised] = useState(false);
  const surfaceX = useMotionValue(0);
  const gestureRef = useRef<DrawerGesture | null>(null);
  const suppressClickRef = useRef(false);
  const animationRunRef = useRef(0);

  const settle = useCallback(
    (nextOpen: boolean): void => {
      const animationRun = ++animationRunRef.current;
      setOpen(nextOpen);
      setDragging(false);
      if (nextOpen) setSurfaceRaised(true);

      const animation = animate(
        surfaceX,
        nextOpen ? drawerWidth() : 0,
        {
          type: "spring",
          stiffness: 420,
          damping: 40,
          mass: 0.72,
        },
      );

      // Keep the edge rounded and lifted while it travels home. A newer
      // interaction invalidates this completion so it cannot flatten a drawer
      // that has already started opening again.
      if (!nextOpen) {
        void animation.then(() => {
          if (
            animationRunRef.current === animationRun &&
            surfaceX.get() < 0.5
          ) {
            setSurfaceRaised(false);
          }
        });
      }
    },
    [surfaceX],
  );

  const openDrawer = useCallback(() => settle(true), [settle]);
  const closeDrawer = useCallback(() => settle(false), [settle]);

  // Keep an open surface aligned after rotation, and reset this mobile-only
  // interaction if the viewport crosses into the desktop layout.
  useEffect(() => {
    const onResize = (): void => {
      if (window.innerWidth >= MOBILE_BREAKPOINT_PX) {
        ++animationRunRef.current;
        surfaceX.stop();
        surfaceX.set(0);
        setOpen(false);
        setDragging(false);
        setSurfaceRaised(false);
        return;
      }

      if (open) surfaceX.set(drawerWidth());
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open, surfaceX]);

  const onSurfacePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>): void => {
      if (event.pointerType !== "touch") return;

      // Controls and editable text keep their native touch behaviour. The
      // surrounding header and transcript surface remain draggable.
      const target = event.target as HTMLElement;
      if (
        target.closest(
          "textarea, input, select, button, [contenteditable=true]",
        )
      ) {
        return;
      }

      const now = performance.now();
      gestureRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startOffset: surfaceX.get(),
        horizontal: false,
        lastX: event.clientX,
        lastAt: now,
        velocityX: 0,
      };
    },
    [surfaceX],
  );

  const onSurfacePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>): void => {
      const gesture = gestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;

      const deltaX = event.clientX - gesture.startX;
      const deltaY = event.clientY - gesture.startY;

      if (!gesture.horizontal) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        if (Math.max(absX, absY) < DIRECTION_THRESHOLD_PX) return;

        if (absY >= absX * DIRECTION_DOMINANCE) {
          gestureRef.current = null;
          return;
        }

        // Do not claim an ambiguous diagonal movement. Wait until one axis is
        // clearly dominant, which makes the choice feel intentional.
        if (absX < absY * DIRECTION_DOMINANCE) return;

        ++animationRunRef.current;
        // Take over from any settling spring only after horizontal intent is
        // certain. Offset by the distance already travelled so grabbing a
        // moving surface never makes it jump beneath the finger.
        surfaceX.stop();
        gesture.startOffset = surfaceX.get() - deltaX;
        gesture.horizontal = true;
        suppressClickRef.current = true;
        setDragging(true);
        setSurfaceRaised(true);
        event.currentTarget.setPointerCapture(event.pointerId);
      }

      const now = performance.now();
      const elapsed = now - gesture.lastAt;
      if (elapsed > 0) {
        const instantVelocity = (event.clientX - gesture.lastX) / elapsed;
        // A light smoothing keeps noisy touch samples from deciding the snap,
        // while still reflecting the user's latest movement.
        gesture.velocityX = gesture.velocityX * 0.25 + instantVelocity * 0.75;
      }
      gesture.lastX = event.clientX;
      gesture.lastAt = now;

      surfaceX.set(clamp(gesture.startOffset + deltaX, 0, drawerWidth()));
      event.preventDefault();
    },
    [surfaceX],
  );

  const finishSurfaceGesture = useCallback(
    (event: ReactPointerEvent<HTMLElement>, cancelled = false): void => {
      const gesture = gestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      gestureRef.current = null;

      if (!gesture.horizontal) return;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      const velocityIsRecent =
        performance.now() - gesture.lastAt <= RECENT_VELOCITY_WINDOW_MS;
      const velocity =
        cancelled || !velocityIsRecent ? 0 : gesture.velocityX;
      const position = surfaceX.get();
      const shouldOpen =
        velocity > FLING_VELOCITY_PX_PER_MS ||
        (velocity >= -FLING_VELOCITY_PX_PER_MS &&
          position > drawerWidth() * OPEN_POSITION_RATIO);

      settle(shouldOpen);

      // A horizontal drag that began on a link must not activate that link on
      // release. The flag lasts only through the synthesized click.
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    },
    [settle, surfaceX],
  );

  const onSurfaceClickCapture = useCallback(
    (event: ReactMouseEvent<HTMLElement>): void => {
      if (!suppressClickRef.current) return;
      suppressClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
    [],
  );

  return {
    open,
    dragging,
    surfaceRaised,
    surfaceX,
    openDrawer,
    closeDrawer,
    surfaceHandlers: {
      onPointerDown: onSurfacePointerDown,
      onPointerMove: onSurfacePointerMove,
      onPointerUp: finishSurfaceGesture,
      onPointerCancel: (event: ReactPointerEvent<HTMLElement>) =>
        finishSurfaceGesture(event, true),
      onClickCapture: onSurfaceClickCapture,
    },
  };
}
