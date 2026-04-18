import { useEffect, useRef, useState } from "react";
import type { Animation } from "@/types/schema";

export interface AnimationState {
  t: number;
  playing: boolean;
  duration: number;
  visibleIds: Set<string>;
  overrides: Map<string, { along?: string; tValue?: number }>;
}

export interface AnimationControls {
  state: AnimationState;
  play: () => void;
  pause: () => void;
  reset: () => void;
  seek: (t: number) => void;
}

export function useAnimation(anim: Animation | undefined): AnimationControls {
  const duration = anim?.duration ?? 6;
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastRef.current = null;
      return;
    }
    const tick = (now: number) => {
      if (lastRef.current === null) lastRef.current = now;
      const dt = (now - lastRef.current) / 1000;
      lastRef.current = now;
      setT((prev) => {
        const next = prev + dt;
        if (next >= duration) {
          setPlaying(false);
          return duration;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, duration]);

  // Compute visibility & overrides at current t
  const visibleIds = new Set<string>();
  const hiddenInit = new Set(anim?.initiallyHidden ?? []);
  const overrides = new Map<string, { along?: string; tValue?: number }>();

  if (anim) {
    for (const id of hiddenInit) visibleIds.add(id); // placeholder; will be removed if still hidden
    // Visibility: anything in initiallyHidden becomes visible only when a step shows it
    for (const id of hiddenInit) visibleIds.delete(id);

    for (const step of anim.steps) {
      if (step.at <= t) {
        if (step.show) for (const id of step.show) visibleIds.add(id);
        if (step.hide) for (const id of step.hide) visibleIds.delete(id);
        if (step.animate) {
          const a = step.animate;
          const dur = a.duration ?? 1;
          const local = Math.min(1, Math.max(0, (t - step.at) / dur));
          if (typeof a.from === "number" && typeof a.to === "number") {
            const tv = a.from + (a.to - a.from) * local;
            overrides.set(a.id, { along: a.along, tValue: tv });
          }
        }
      }
    }
  }

  return {
    state: { t, playing, duration, visibleIds, overrides },
    play: () => setPlaying(true),
    pause: () => setPlaying(false),
    reset: () => { setPlaying(false); setT(0); },
    seek: (nt: number) => setT(Math.max(0, Math.min(duration, nt))),
  };
}

/** Returns true if id should render given anim state. */
export function isVisible(id: string, state: AnimationState, initiallyHidden: string[] | undefined): boolean {
  if (!initiallyHidden || !initiallyHidden.includes(id)) return true;
  return state.visibleIds.has(id);
}
