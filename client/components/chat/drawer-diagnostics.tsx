"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import type { MotionValue } from "motion/react";

const subscribe = () => () => {};
const isEnabled = () => new URLSearchParams(window.location.search).get("drawerDebug") === "1";
const serverSnapshot = () => false;

/** Opt-in, local-only trace. Never records message text or touch targets. */
export function DrawerDiagnostics({ surfaceRef, surfaceX }: {
  surfaceRef: RefObject<HTMLElement | null>;
  surfaceX: MotionValue<number>;
}) {
  const enabled = useSyncExternalStore(subscribe, isEnabled, serverSnapshot);
  const entries = useRef<string[]>([]);
  const [report, setReport] = useState("");

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!enabled || !surface) return;
    const started = performance.now();
    let tracking = false;
    let pointerId: number | null = null;
    const record = (event: string, detail = "") => {
      entries.current.push(`${Math.round(performance.now() - started)}ms ${event} x=${surfaceX.get().toFixed(1)} drag=${surface.dataset.drawerDragging} ${detail}`);
      if (entries.current.length > 600) entries.current.shift();
    };
    record("enabled", `viewport=${window.innerWidth}x${window.innerHeight}`);
    const onPointer = (event: PointerEvent) => {
      if (event.type === "pointerdown" && event.isPrimary && event.target instanceof Node && surface.contains(event.target)) {
        pointerId = event.pointerId;
      }
      if (event.pointerId !== pointerId) return;
      record(event.type, `id=${event.pointerId} captured=${surface.hasPointerCapture(event.pointerId)} finger=${Math.round(event.clientX)},${Math.round(event.clientY)}`);
    };
    const onTouch = (event: TouchEvent) => {
      if (event.type === "touchstart") {
        tracking = event.target instanceof Node && surface.contains(event.target);
        if (tracking) {
          const scroller = surface.querySelector<HTMLElement>("[data-chat-scroll]");
          record("start-state", scroller ? `scroll=${scroller.scrollTop}/${scroller.scrollHeight - scroller.clientHeight} action=${getComputedStyle(scroller).touchAction}` : "no transcript");
        }
      }
      if (!tracking) return;
      const touch = event.changedTouches.item(0);
      record(event.type, `cancelable=${event.cancelable} prevented=${event.defaultPrevented} touches=${event.touches.length} finger=${touch ? `${Math.round(touch.clientX)},${Math.round(touch.clientY)}` : "none"}`);
      if (event.type === "touchend" || event.type === "touchcancel") tracking = false;
    };
    const onScroll = (event: Event) => {
      if (event.target instanceof HTMLElement && surface.contains(event.target)) {
        record("scroll", `top=${event.target.scrollTop}`);
      }
    };
    const onResize = () => record("resize", `${window.innerWidth}x${window.innerHeight} visual=${window.visualViewport?.height}`);
    const unsubscribe = surfaceX.on("change", () => record("position"));
    // Passive observers run after the drawer's listener and never cancel a touch.
    const types = ["touchstart", "touchmove", "touchend", "touchcancel"] as const;
    const pointerTypes = ["pointerdown", "pointermove", "pointerup", "pointercancel", "gotpointercapture", "lostpointercapture"] as const;
    pointerTypes.forEach(type => window.addEventListener(type, onPointer, { capture: true, passive: true }));
    types.forEach(type => document.addEventListener(type, onTouch, { passive: true }));
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    return () => {
      unsubscribe();
      pointerTypes.forEach(type => window.removeEventListener(type, onPointer, true));
      types.forEach(type => document.removeEventListener(type, onTouch));
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
    };
  }, [enabled, surfaceRef, surfaceX]);

  if (!enabled) return null;
  return (
    <div className="fixed bottom-2 right-2 z-[100] max-w-[90vw] rounded-lg bg-black p-2 text-xs text-white">
      <button type="button" className="p-2" onClick={() => setReport(`${navigator.userAgent}\n${entries.current.join("\n")}`)}>Show swipe log</button>
      {report && <>
        <button type="button" className="p-2" onClick={() => setReport("")}>Hide</button>
        <textarea aria-label="Swipe diagnostic log" readOnly value={report} onFocus={event => event.currentTarget.select()} className="block h-48 w-80 max-w-full bg-black font-mono text-xs text-white" />
      </>}
    </div>
  );
}
