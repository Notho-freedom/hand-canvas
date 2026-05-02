import { useEffect, useMemo, useRef, useState } from "react";
import type { Animation, AnimateSpec } from "@/types/schema";

export interface AnimationOverride {
  // Slide along curve
  along?: string;
  tValue?: number;
  // Translate offset (world coords)
  dx?: number;
  dy?: number;
  // Rotation around a pivot (deg)
  angle?: number;
  pivot?: { x: number; y: number } | { ref: string };
  // Identifies the source animate spec (for special handling like pendulum angle override)
  spec?: AnimateSpec;
}

export interface AnimationState {
  t: number;
  playing: boolean;
  duration: number;
  visibleIds: Set<string>;
  overrides: Map<string, AnimationOverride>;
}

export interface AnimationControls {
  state: AnimationState;
  play: () => void;
  pause: () => void;
  reset: () => void;
  seek: (t: number) => void;
}

function easeLinear(x: number) { return x; }

export function useAnimation(anim: Animation | undefined): AnimationControls {
  const duration = anim?.duration ?? 6;
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);

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
    const overrides = new Map<string, AnimationOverride>();
    if (!anim) return { visibleIds, overrides };

    for (const step of anim.steps) {
      if (step.at > t) continue;
      if (step.show) for (const id of step.show) visibleIds.add(id);
      if (step.hide) for (const id of step.hide) visibleIds.delete(id);
      if (!step.animate) continue;

      const a = step.animate as AnimateSpec;
      const dur = a.duration ?? 1;
      const localRaw = (t - step.at) / dur;
      const local = Math.min(1, Math.max(0, localRaw));

      const mode = a.mode ?? (a.along ? "slide" : (a.angleFrom !== undefined || a.angleTo !== undefined) ? "rotate" : "translate");

      if (mode === "slide" && a.along && typeof a.from === "number" && typeof a.to === "number") {
        const tv = a.from + (a.to - a.from) * easeLinear(local);
        overrides.set(a.id, { along: a.along, tValue: tv, spec: a });
      } else if (mode === "translate") {
        const from = a.from ?? 0;
        const to = a.to ?? 0;
        const v = from + (to - from) * easeLinear(local);
        let dx = 0, dy = 0;
        const axis = a.axis ?? "x";
        if (axis === "x") dx = v;
        else if (axis === "y") dy = v;
        else { dx = axis.dx * v; dy = axis.dy * v; }
        overrides.set(a.id, { dx, dy, spec: a });
      } else if (mode === "oscillate") {
        // Continuous oscillation across the step's duration
        const amp = a.amplitude ?? 0.3;
        const cycles = a.cycles ?? 2;
        // Use the local progress through the step's duration; oscillate "cycles" times
        const phase = 2 * Math.PI * cycles * local;
        const v = amp * Math.sin(phase);
        let dx = 0, dy = 0;
        const axis = a.axis ?? "x";
        if (axis === "x") dx = v;
        else if (axis === "y") dy = v;
        else { dx = axis.dx * v; dy = axis.dy * v; }
        overrides.set(a.id, { dx, dy, spec: a });
      } else if (mode === "rotate") {
        const from = a.angleFrom ?? a.from ?? 0;
        const to = a.angleTo ?? a.to ?? 0;
        let angle: number;
        if (a.cycles && a.cycles > 0) {
          // Pendulum: oscillate angle as A·cos(2π·cycles·local) starting at "from"
          const amp = a.amplitude ?? from;
          angle = amp * Math.cos(2 * Math.PI * a.cycles * local);
        } else {
          angle = from + (to - from) * easeLinear(local);
        }
        overrides.set(a.id, { angle, pivot: a.pivot, spec: a });
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
