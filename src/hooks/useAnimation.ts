import { useEffect, useMemo, useRef, useState } from "react";
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

  // Reset t when the animation reference changes (new schema/example)
  useEffect(() => {
    setT(0);
    setPlaying(false);
  }, [anim]);

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

  const { visibleIds, overrides } = useMemo(() => {
    const visibleIds = new Set<string>();
    const overrides = new Map<string, { along?: string; tValue?: number }>();
    if (!anim) return { visibleIds, overrides };

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
    return { visibleIds, overrides };
  }, [anim, t]);

  return {
    state: { t, playing, duration, visibleIds, overrides },
    play: () => setPlaying(true),
    pause: () => setPlaying(false),
    reset: () => { setPlaying(false); setT(0); },
    seek: (nt: number) => setT(Math.max(0, Math.min(duration, nt))),
  };
}

export function isVisible(id: string, state: AnimationState, initiallyHidden: string[] | undefined): boolean {
  if (!initiallyHidden || !initiallyHidden.includes(id)) return true;
  return state.visibleIds.has(id);
}
