"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { animate, useMotionValue } from "motion/react";

/** The revealed sidebar occupies this fraction of a compact viewport. */
const DRAWER_WIDTH_RATIO = 0.8;
const MOBILE_BREAKPOINT_PX = 768;
const DIRECTION_THRESHOLD_PX = 8;
/** Vertical travel must clearly dominate before it wins over a diagonal swipe. */
const VERTICAL_DOMINANCE = 1.5;
const OPEN_POSITION_RATIO = 0.42;
const FLING_VELOCITY_PX_PER_MS = 0.45;
const RECENT_VELOCITY_WINDOW_MS = 100;
const DIRECTIONAL_SETTLE_PX = 4;

interface DrawerGesture {
  touchId: number;
  startX: number;
  startY: number;
  startOffset: number;
  lockOffset: number;
  startedOpen: boolean;
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

function findTouch(touches: TouchList, id: number): Touch | null {
  for (let index = 0; index < touches.length; index += 1) {
    const touch = touches.item(index);
    if (touch?.identifier === id) return touch;
  }
  return null;
}

/**
 * Controls the fixed mobile conversation surface above the sidebar.
 *
 * The first few pixels establish intent. Clearly vertical movement remains a
 * native transcript scroll. A rightward diagonal is deliberately biased toward
 * the drawer; once claimed, native scrolling is cancelled and only x changes.
 */
export function useMobileDrawer() {
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [surfaceRaised, setSurfaceRaised] = useState(false);
  const surfaceRef = useRef<HTMLElement | null>(null);
  const surfaceX = useMotionValue(0);
  const gestureRef = useRef<DrawerGesture | null>(null);
  const suppressClickRef = useRef(false);
  const animationRunRef = useRef(0);
  const settlingRef = useRef(false);

  const settle = useCallback(
    (nextOpen: boolean): void => {
      const animationRun = ++animationRunRef.current;
      setOpen(nextOpen);
      setDragging(false);
      if (nextOpen) setSurfaceRaised(true);
      settlingRef.current = true;

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

      void animation.then(() => {
        if (animationRunRef.current !== animationRun) return;
        settlingRef.current = false;
        if (!nextOpen && surfaceX.get() < 0.5) setSurfaceRaised(false);
      });
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
        settlingRef.current = false;
        gestureRef.current = null;
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

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;

    const onTouchStart = (event: TouchEvent): void => {
      if (event.touches.length !== 1) return;

      // Editable fields and controls keep their native touch behaviour. The
      // surrounding header and transcript surface remain draggable.
      const target = event.target as HTMLElement;
      if (
        target.closest(
          "textarea, input, select, button, [contenteditable=true]",
        )
      ) {
        return;
      }

      const touch = event.touches.item(0);
      if (!touch) return;

      const now = performance.now();
      const offset = surfaceX.get();
      gestureRef.current = {
        touchId: touch.identifier,
        startX: touch.clientX,
        startY: touch.clientY,
        startOffset: offset,
        lockOffset: offset,
        startedOpen: open,
        horizontal: false,
        lastX: touch.clientX,
        lastAt: now,
        velocityX: 0,
      };
    };

    const onTouchMove = (event: TouchEvent): void => {
      const gesture = gestureRef.current;
      if (!gesture) return;

      const touch = findTouch(event.touches, gesture.touchId);
      if (!touch) return;

      const deltaX = touch.clientX - gesture.startX;
      const deltaY = touch.clientY - gesture.startY;

      if (!gesture.horizontal) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        if (Math.max(absX, absY) < DIRECTION_THRESHOLD_PX) return;

        // Only unmistakably vertical intent goes to transcript scrolling. A
        // diagonal right swipe should feel like an attempt to reveal history.
        if (absY > absX * VERTICAL_DOMINANCE) {
          gestureRef.current = null;
          return;
        }

        // There is nowhere to drag left from the closed position. Do not steal
        // that touch from normal browser behaviour.
        if (!gesture.startedOpen && deltaX <= 0) {
          gestureRef.current = null;
          return;
        }

        ++animationRunRef.current;
        const wasSettling = settlingRef.current;
        settlingRef.current = false;
        surfaceX.stop();

        // If the finger catches a surface while its spring is still moving,
        // adopt its current position without making it jump.
        if (wasSettling) gesture.startOffset = surfaceX.get() - deltaX;
        gesture.lockOffset = surfaceX.get();
        gesture.horizontal = true;
        suppressClickRef.current = true;
        setDragging(true);
        setSurfaceRaised(true);
      }

      // This listener is intentionally non-passive. Once horizontal intent is
      // locked, cancelling native movement prevents vertical scroll/rubber-band
      // from combining with the x transform into a circular-looking drag.
      if (event.cancelable) event.preventDefault();

      const now = performance.now();
      const elapsed = now - gesture.lastAt;
      if (elapsed > 0) {
        const instantVelocity = (touch.clientX - gesture.lastX) / elapsed;
        gesture.velocityX = gesture.velocityX * 0.25 + instantVelocity * 0.75;
      }
      gesture.lastX = touch.clientX;
      gesture.lastAt = now;

      surfaceX.set(clamp(gesture.startOffset + deltaX, 0, drawerWidth()));
    };

    const finishTouch = (event: TouchEvent, cancelled = false): void => {
      const gesture = gestureRef.current;
      if (!gesture) return;

      gestureRef.current = null;
      if (!gesture.horizontal) return;

      const velocityIsRecent =
        performance.now() - gesture.lastAt <= RECENT_VELOCITY_WINDOW_MS;
      const velocity =
        cancelled || !velocityIsRecent ? 0 : gesture.velocityX;
      const position = surfaceX.get();
      const directionalTravel = position - gesture.lockOffset;

      let shouldOpen: boolean;
      if (cancelled) {
        shouldOpen = gesture.startedOpen;
      } else if (Math.abs(directionalTravel) >= DIRECTIONAL_SETTLE_PX) {
        // Once a deliberate horizontal drag has a clear direction, honour it.
        // This is more predictable than letting a curved path's average speed
        // unexpectedly fling the surface back where it started.
        shouldOpen = directionalTravel > 0;
      } else {
        shouldOpen =
          velocity > FLING_VELOCITY_PX_PER_MS ||
          (velocity >= -FLING_VELOCITY_PX_PER_MS &&
            position > drawerWidth() * OPEN_POSITION_RATIO);
      }

      settle(shouldOpen);

      // A horizontal drag that began on a link must not activate that link on
      // release. The flag lasts only through the synthesized click.
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);

      // Some browsers omit the tracked touch from a cancellation event. The
      // final position is intentionally taken from the last move instead.
      void event;
    };

    const onTouchEnd = (event: TouchEvent): void => finishTouch(event);
    const onTouchCancel = (event: TouchEvent): void => finishTouch(event, true);

    surface.addEventListener("touchstart", onTouchStart, { passive: true });
    surface.addEventListener("touchmove", onTouchMove, { passive: false });
    surface.addEventListener("touchend", onTouchEnd, { passive: true });
    surface.addEventListener("touchcancel", onTouchCancel, { passive: true });

    return () => {
      surface.removeEventListener("touchstart", onTouchStart);
      surface.removeEventListener("touchmove", onTouchMove);
      surface.removeEventListener("touchend", onTouchEnd);
      surface.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [open, settle, surfaceX]);

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
    surfaceRef,
    surfaceX,
    openDrawer,
    closeDrawer,
    onSurfaceClickCapture,
  };
}
