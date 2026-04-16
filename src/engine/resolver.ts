import type { Component, Point, Schema, AnchorRef } from "@/types/schema";
import {
  buildGround,
  buildWall,
  buildIncline,
  buildBlock,
  buildSphere,
  buildPulley,
  type Resolved,
} from "./anchors";

export interface ResolveResult {
  resolved: Map<string, Resolved>;
  /** Components with no spatial origin themselves (rope, force, etc.) — kept in order. */
  order: string[];
  errors: string[];
}

const isRef = (v: any): v is AnchorRef => v && typeof v === "object" && "ref" in v;

function refDeps(comp: Component): string[] {
  const deps: string[] = [];
  const collect = (v: any) => {
    if (!v) return;
    if (isRef(v)) {
      const id = v.ref.split(".")[0];
      // tangent_to:X may bind another id
      const m = v.ref.match(/tangent_to:([\w-]+)/);
      if (m) deps.push(m[1]);
      deps.push(id);
    }
  };
  const c: any = comp;
  collect(c.anchor);
  collect(c.at);
  collect(c.from);
  collect(c.to);
  if (Array.isArray(c.via)) c.via.forEach(collect);
  return [...new Set(deps)];
}

function resolvePoint(
  v: { x: number; y: number } | AnchorRef | undefined,
  resolved: Map<string, Resolved>,
  fallback: Point = { x: 0, y: 0 },
): Point {
  if (!v) return fallback;
  if (!isRef(v)) return { x: v.x, y: v.y };
  const [id, name, ...rest] = v.ref.split(".");
  // handle "tangent_to:X"
  const tangentMatch = v.ref.match(/^([\w-]+)\.tangent_to:([\w-]+)$/);
  if (tangentMatch) {
    const [, pulleyId, otherId] = tangentMatch;
    const pulley = resolved.get(pulleyId);
    const other = resolved.get(otherId);
    if (!pulley || !other) return fallback;
    return tangentPoint(pulley, other);
  }
  const target = resolved.get(id);
  if (!target) return fallback;
  const a = target.anchors[name];
  let p: Point;
  if (typeof a === "function") p = a(v.t);
  else if (a) p = a;
  else p = target.origin;
  if (v.offset) p = { x: p.x + v.offset.x, y: p.y + v.offset.y };
  return p;
}

/** Compute the tangent contact point on a pulley for a rope going to "other" anchor cog. */
function tangentPoint(pulley: Resolved, other: Resolved): Point {
  const r = pulley.data.r as number;
  const c = pulley.origin;
  const t = (other.anchors.cog as Point) ?? other.origin;
  const dx = t.x - c.x;
  const dy = t.y - c.y;
  const d = Math.hypot(dx, dy);
  if (d <= r) return c;
  // angle from pulley center to target
  const theta = Math.atan2(dy, dx);
  // tangent angle offset
  const alpha = Math.acos(r / d);
  // Two tangent points, pick the one on the upper side (closer to top)
  const a1 = theta + alpha;
  const a2 = theta - alpha;
  const p1 = { x: c.x + r * Math.cos(a1), y: c.y + r * Math.sin(a1) };
  const p2 = { x: c.x + r * Math.cos(a2), y: c.y + r * Math.sin(a2) };
  return p1.y >= p2.y ? p1 : p2;
}

function inclineRotationAt(incline: Resolved): number {
  // Returns angle of surface in degrees
  const { sx, sy } = incline.data;
  return (Math.atan2(sy, sx) * 180) / Math.PI;
}

export function resolveSchema(schema: Schema): ResolveResult {
  const errors: string[] = [];
  const resolved = new Map<string, Resolved>();
  const order: string[] = [];

  // Topological sort
  const map = new Map(schema.components.map((c) => [c.id, c] as const));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const sorted: Component[] = [];

  const visit = (id: string) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      errors.push(`Cycle détecté impliquant "${id}"`);
      return;
    }
    const comp = map.get(id);
    if (!comp) {
      errors.push(`Référence introuvable: "${id}"`);
      return;
    }
    visiting.add(id);
    for (const dep of refDeps(comp)) visit(dep);
    visiting.delete(id);
    visited.add(id);
    sorted.push(comp);
  };
  for (const c of schema.components) visit(c.id);

  // Build resolved entries
  for (const comp of sorted) {
    order.push(comp.id);
    const c: any = comp;
    switch (comp.type) {
      case "ground": {
        const origin = resolvePoint(c.at, resolved);
        resolved.set(comp.id, buildGround(comp, origin));
        break;
      }
      case "wall": {
        const origin = resolvePoint(c.at, resolved);
        resolved.set(comp.id, buildWall(comp, origin));
        break;
      }
      case "incline": {
        const origin = resolvePoint(c.anchor ?? c.at, resolved);
        resolved.set(comp.id, buildIncline(comp, origin));
        break;
      }
      case "block": {
        const origin = resolvePoint(c.anchor ?? c.at, resolved);
        let rotation = 0;
        if (c.rotation === "auto" && isRef(c.anchor)) {
          const targetId = c.anchor.ref.split(".")[0];
          const target = resolved.get(targetId);
          if (target?.type === "incline") rotation = inclineRotationAt(target);
        } else if (typeof c.rotation === "number") {
          rotation = c.rotation;
        }
        resolved.set(comp.id, buildBlock(comp, origin, rotation));
        break;
      }
      case "sphere": {
        const origin = resolvePoint(c.anchor ?? c.at, resolved);
        resolved.set(comp.id, buildSphere(comp, origin));
        break;
      }
      case "pulley": {
        const origin = resolvePoint(c.anchor ?? c.at, resolved);
        resolved.set(comp.id, buildPulley(comp, origin));
        break;
      }
      // Link / vector / annotation types: no spatial origin to register, resolve at render time
      default: {
        resolved.set(comp.id, {
          id: comp.id,
          type: comp.type,
          raw: comp,
          origin: { x: 0, y: 0 },
          rotation: 0,
          anchors: {},
          data: {},
        });
      }
    }
  }

  return { resolved, order, errors };
}

export { resolvePoint };
