import type { Constraint, Point } from "@/types/schema";
import type { Resolved } from "./anchors";
import { EPSILON, snap } from "./geometry";

export interface SolverContext {
  resolved: Map<string, Resolved>;
  warnings: string[];
}

const MAX_ITER = 5;

/**
 * Apply constraints in priority order with relaxation.
 * Most constraints here flag/correct geometry rather than truly solving a system —
 * they enforce alignments and snapping that the renderer (rope solver, spring axis) consumes.
 */
export function solveConstraints(constraints: Constraint[] | undefined, ctx: SolverContext): Map<string, any> {
  const facts = new Map<string, any>(); // id → facts (e.g., { axis: {x,y}, attach: {...} })
  if (!constraints || !constraints.length) return facts;

  const sorted = [...constraints].sort((a, b) => (b as any).priority - (a as any).priority);

  for (let iter = 0; iter < MAX_ITER; iter++) {
    let changed = 0;
    for (const c of sorted) {
      if (applyOne(c, facts, ctx)) changed++;
    }
    if (changed === 0) break;
  }
  return facts;
}

function applyOne(c: Constraint, facts: Map<string, any>, ctx: SolverContext): boolean {
  switch (c.type) {
    case "horizontal": {
      const f = facts.get(c.object) ?? {};
      if (f.axis?.x === 1 && f.axis?.y === 0) return false;
      facts.set(c.object, { ...f, axis: { x: 1, y: 0 } });
      return true;
    }
    case "vertical": {
      const f = facts.get(c.object) ?? {};
      if (f.axis?.x === 0 && f.axis?.y === 1) return false;
      facts.set(c.object, { ...f, axis: { x: 0, y: 1 } });
      return true;
    }
    case "colinear": {
      // Snap small deviations on listed point refs; record axis for the chain.
      // Without point mutation (resolved cache is geometric), we just record the directive.
      for (const ptRef of c.points) {
        const id = ptRef.split(".")[0];
        const f = facts.get(id) ?? {};
        if (!f.colinear) {
          facts.set(id, { ...f, colinear: c.points });
        }
      }
      return false;
    }
    case "tangent": {
      const f = facts.get(c.rope) ?? {};
      const next = { ...f, tangent: { pulley: c.pulley, side: c.side } };
      if (JSON.stringify(f.tangent) === JSON.stringify(next.tangent)) return false;
      facts.set(c.rope, next);
      return true;
    }
    case "attach_face_center": {
      const f = facts.get(c.rope) ?? {};
      const list = f.attach ?? [];
      const exists = list.some((a: any) => a.end === c.end && a.object === c.object && a.face === c.face);
      if (exists) return false;
      facts.set(c.rope, { ...f, attach: [...list, { end: c.end, object: c.object, face: c.face }] });
      return true;
    }
    case "tension":
    case "tension_equal": {
      const f = facts.get(c.rope) ?? {};
      if (f.tension) return false;
      facts.set(c.rope, { ...f, tension: true });
      return true;
    }
    default:
      return false;
  }
}

/** Apply axis snap to a near-horizontal/vertical vector. */
export function snapAxisAligned(p: Point): Point {
  const ax = Math.abs(p.x);
  const ay = Math.abs(p.y);
  if (ax > 0 && ay / ax < 0.02) return { x: snap(p.x), y: 0 };
  if (ay > 0 && ax / ay < 0.02) return { x: 0, y: snap(p.y) };
  return p;
}
