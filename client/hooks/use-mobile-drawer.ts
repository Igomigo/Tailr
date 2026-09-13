"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { animate, useMotionValue, useTransform } from "motion/react";

/** The revealed sidebar occupies this fraction of a compact viewport. */
const DRAWER_WIDTH_RATIO = 0.8;
const MOBILE_BREAKPOINT_PX = 768;
const DIRECTION_THRESHOLD_PX = 8;
const OPEN_POSITION_RATIO = 0.42;
const FLING_VELOCITY_PX_PER_MS = 0.45;
const RECENT_VELOCITY_WINDOW_MS = 100;
const DIRECTIONAL_SETTLE_PX = 4;

interface DrawerGesture {
  pointerId: number;
  startX: number;
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

/**
 * Controls the fixed mobile conversation surface above the sidebar.
 *
 * CSS pan-y gives vertical scrolling to the browser. Pointer capture keeps a
 * horizontal drag attached to this surface, with explicit cancellation cleanup.
 */
export function useMobileDrawer() {
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [surfaceRaised, setSurfaceRaised] = useState(false);
  const surfaceRef = useRef<HTMLElement | null>(null);
  const surfaceX = useMotionValue(0);
  const surfaceColor = useTransform(surfaceX, (position) => {
    if (typeof window === "undefined") return "var(--color-canvas)";

    const progress = clamp(position / drawerWidth(), 0, 1);
    if (progress < 0.001) return "var(--color-canvas)";

    // Following the drawer position removes the binary tint change at the
    // beginning and end of a swipe, including button-driven spring movement.
    return `color-mix(in srgb, var(--color-canvas), var(--color-ink) ${progress * 10}%)`;
  });
  const surfaceEdgeColor = useTransform(surfaceX, (position) => {
    if (typeof window === "undefined") return "rgba(205, 211, 216, 0)";

    const progress = clamp(position / drawerWidth(), 0, 1);
    return `rgba(205, 211, 216, ${progress * 0.18})`;
  });
  const gestureRef = useRef<DrawerGesture | null>(null);
  const suppressClickRef = useRef(false);
  const animationRunRef = useRef(0);
  const settlingRef = useRef(false);
  const openRef = useRef(false);

  const settle = useCallback(
    (nextOpen: boolean): void => {
      const animationRun = ++animationRunRef.current;
      openRef.current = nextOpen;
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
    let width = window.innerWidth;
    const onResize = (): void => {
      // Mobile browser chrome/keyboard height changes are not drawer resizes.
      if (window.innerWidth === width) return;
      width = window.innerWidth;
      if (window.innerWidth >= MOBILE_BREAKPOINT_PX) {
        ++animationRunRef.current;
        settlingRef.current = false;
        gestureRef.current = null;
        surfaceX.stop();
        surfaceX.set(0);
        setOpen(false);
        openRef.current = false;
        setDragging(false);
        setSurfaceRaised(false);
        return;
      }

      if (!gestureRef.current && openRef.current) surfaceX.set(drawerWidth());
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [surfaceX]);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;

    const onPointerDown = (event: PointerEvent): void => {
      if (window.innerWidth >= MOBILE_BREAKPOINT_PX || event.pointerType !== "touch" || !event.isPrimary) return;
      suppressClickRef.current = false;

      // Editable fields and controls keep their native touch behaviour. The
      // surrounding header and transcript surface remain draggable.
      const target = event.target;
      if (
        !openRef.current && target instanceof Element && target.closest(
          "textarea, input, select, button, [contenteditable=true]",
        )
      ) {
        return;
      }

      const now = performance.now();
      const offset = surfaceX.get();
      gestureRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startOffset: offset,
        lockOffset: offset,
        startedOpen: openRef.current,
        horizontal: false,
        lastX: event.clientX,
        lastAt: now,
        velocityX: 0,
      };
    };

    const onPointerMove = (event: PointerEvent): void => {
      const gesture = gestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;

      const deltaX = event.clientX - gesture.startX;

      if (!gesture.horizontal) {
        // Do not reject a gesture because its first few pixels drift vertically.
        // If native scrolling wins, the browser sends pointercancel instead.
        if (Math.abs(deltaX) < DIRECTION_THRESHOLD_PX) return;

        // There is nowhere to drag left from the closed position. Do not steal
        // that touch from normal browser behaviour.
        if (gesture.startOffset === 0 && deltaX <= 0) return;

        ++animationRunRef.current;
        const wasSettling = settlingRef.current;
        settlingRef.current = false;
        surfaceX.stop();

        // If the finger catches a surface while its spring is still moving,
        // adopt its current position without making it jump.
        if (wasSettling) gesture.startOffset = surfaceX.get() - deltaX;
        gesture.lockOffset = surfaceX.get();
        gesture.horizontal = true;
        surface.setPointerCapture(event.pointerId);
        suppressClickRef.current = true;
        setDragging(true);
        setSurfaceRaised(true);
      }

      const now = performance.now();
      const elapsed = now - gesture.lastAt;
      if (elapsed > 0) {
        const instantVelocity = (event.clientX - gesture.lastX) / elapsed;
        gesture.velocityX = gesture.velocityX * 0.25 + instantVelocity * 0.75;
      }
      gesture.lastX = event.clientX;
      gesture.lastAt = now;

      surfaceX.set(clamp(gesture.startOffset + deltaX, 0, drawerWidth()));
    };

    const finishPointer = (event: PointerEvent, cancelled = false): void => {
      const gesture = gestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;

      gestureRef.current = null;
      if (surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId);
      if (!gesture.horizontal) return;

      const velocityIsRecent =
        performance.now() - gesture.lastAt <= RECENT_VELOCITY_WINDOW_MS;
      const velocity = !velocityIsRecent ? 0 : gesture.velocityX;
      const position = surfaceX.get();
      const directionalTravel = position - gesture.lockOffset;

      let shouldOpen: boolean;
      if (Math.abs(directionalTravel) >= DIRECTIONAL_SETTLE_PX) {
        // Once a deliberate horizontal drag has a clear direction, honour it.
        // This also lets an interrupted browser gesture finish naturally from
        // the movement already made instead of jumping back to its origin.
        shouldOpen = directionalTravel > 0;
      } else if (cancelled) {
        shouldOpen = gesture.startedOpen;
      } else {
        shouldOpen =
          velocity > FLING_VELOCITY_PX_PER_MS ||
          (velocity >= -FLING_VELOCITY_PX_PER_MS &&
            position > drawerWidth() * OPEN_POSITION_RATIO);
      }

      settle(shouldOpen);

      // Keep click suppression until the synthesized click or next pointerdown.
      // A timeout can expire before a mobile browser dispatches its click.
    };

    const onPointerUp = (event: PointerEvent): void => finishPointer(event);
    const onPointerCancel = (event: PointerEvent): void => finishPointer(event, true);

    surface.addEventListener("pointerdown", onPointerDown, true);
    // Capture phase also observes completion outside the surface or when a
    // descendant stops propagation. These listeners stay mounted while opening.
    window.addEventListener("pointermove", onPointerMove, true);
    window.addEventListener("pointerup", onPointerUp, true);
    window.addEventListener("pointercancel", onPointerCancel, true);
    surface.addEventListener("lostpointercapture", onPointerCancel);

    return () => {
      surface.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointermove", onPointerMove, true);
      window.removeEventListener("pointerup", onPointerUp, true);
      window.removeEventListener("pointercancel", onPointerCancel, true);
      surface.removeEventListener("lostpointercapture", onPointerCancel);
      const gesture = gestureRef.current;
      gestureRef.current = null;
      if (gesture && surface.hasPointerCapture(gesture.pointerId)) surface.releasePointerCapture(gesture.pointerId);
    };
  }, [settle, surfaceX]);

  const onSurfaceClickCapture = useCallback(
    (event: ReactMouseEvent<HTMLElement>): void => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      // The shifted conversation is the drawer's dismiss surface. Capture the
      // tap so controls underneath it do not also activate while it closes.
      if (open) {
        event.preventDefault();
        event.stopPropagation();
        closeDrawer();
      }
    },
    [closeDrawer, open],
  );

  return {
    open,
    dragging,
    surfaceRaised,
    surfaceRef,
    surfaceX,
    surfaceColor,
    surfaceEdgeColor,
    openDrawer,
    closeDrawer,
    onSurfaceClickCapture,
  };
}
