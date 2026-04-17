import type { Component, Point, Schema, NormRef } from "@/types/schema";
import { normalizeRef, isRef } from "@/types/schema";
import {
  buildGround,
  buildWall,
  buildIncline,
  buildBlock,
  buildSphere,
  buildPulley,
  type Resolved,
} from "./anchors";
import { pickTangent, sub, norm, dot, EPSILON } from "./geometry";
import { solveConstraints } from "./constraints";
import { generateAutoForces, type AutoForce } from "./autoForces";

export interface ResolveResult {
  resolved: Map<string, Resolved>;
  order: string[];
  errors: string[];
  warnings: string[];
  facts: Map<string, any>;
  autoForces: AutoForce[];
}

function refDeps(comp: Component): string[] {
  const deps = new Set<string>();
  const collect = (v: any) => {
    if (!v) return;
    const n = normalizeRef(v);
    if (!n) return;
    switch (n.kind) {
      case "point":
      case "curve":
      case "face":
      case "normal":
        deps.add(n.id);
        break;
      case "tangent":
        deps.add(n.from);
        deps.add(n.to);
        break;
      case "best_face":
        deps.add(n.id);
        deps.add(n.towards);
        break;
    }
  };
  const c: any = comp;
  collect(c.anchor);
  collect(c.at);
  collect(c.from);
  collect(c.to);
  if (Array.isArray(c.via)) c.via.forEach(collect);
  if (Array.isArray(c.path)) {
    c.path.forEach((p: any) => {
      if (p && typeof p === "object" && "wrap" in p) deps.add(p.wrap);
      else collect(p);
    });
  }
  if (comp.type === "local_frame") deps.add((comp as any).of);
  if (comp.type === "projection") {
    deps.add((comp as any).force);
    const ontoId = String((comp as any).onto).split(".")[0];
    deps.add(ontoId);
  }
  return [...deps];
}

/**
 * Resolve a point-or-ref to world coordinates.
 * Public API used by renderers.
 */
export function resolvePoint(
  v: { x: number; y: number } | NormRef | any | undefined,
  resolved: Map<string, Resolved>,
  fallback: Point = { x: 0, y: 0 },
): Point {
  if (!v) return fallback;
  if (!isRef(v)) return { x: v.x, y: v.y };
  const n = normalizeRef(v);
  if (!n) return fallback;
  const p = resolveNormRef(n, resolved);
  if (!p) return fallback;
  if (n.offset) return { x: p.x + n.offset.x, y: p.y + n.offset.y };
  return p;
}

function resolveNormRef(n: NormRef, resolved: Map<string, Resolved>): Point | null {
  switch (n.kind) {
    case "point": {
      const target = resolved.get(n.id);
      if (!target) return null;
      const a = target.anchors[n.anchor];
      if (typeof a === "function") return a();
      if (a) return { x: (a as Point).x, y: (a as Point).y };
      return target.origin;
    }
    case "curve": {
      const target = resolved.get(n.id);
      if (!target) return null;
      const a = target.anchors[n.curve];
      if (typeof a === "function") return a(n.t);
      if (a) return { x: (a as Point).x, y: (a as Point).y };
      return target.origin;
    }
    case "face": {
      const target = resolved.get(n.id);
      if (!target) return null;
      const key = `face_${n.face}_center`;
      const a = target.anchors[key] ?? target.anchors[n.face];
      if (typeof a === "function") return a();
      if (a) return { x: (a as Point).x, y: (a as Point).y };
      return target.origin;
    }
    case "normal": {
      const target = resolved.get(n.id);
      if (!target) return null;
      // returns a point along normal from cog
      const cog = (target.anchors.cog ?? target.origin) as Point;
      const nrm = (target.data?.normal as Point) ?? { x: 0, y: 1 };
      return { x: cog.x + nrm.x * n.length, y: cog.y + nrm.y * n.length };
    }
    case "tangent": {
      // n.from = pulley id, n.to = external object id (legacy semantics)
      const pulley = resolved.get(n.from);
      const other = resolved.get(n.to);
      if (!pulley || !other) return null;
      const r = pulley.data.r as number;
      const c = pulley.origin;
      const target = ((other.anchors.cog as Point) ?? other.origin);
      const t = pickTangent(target, c, r, n.side === "upper" || n.side === "lower" ? n.side : "auto", target);
      return t ?? c;
    }
    case "best_face": {
      const obj = resolved.get(n.id);
      const target = resolved.get(n.towards);
      if (!obj || !target) return null;
      const faces = obj.data?.faces as Record<string, { center: Point; normal: Point }> | undefined;
      if (!faces) return obj.origin;
      const dir = norm(sub(target.origin, obj.origin));
      let best: { center: Point; score: number } | null = null;
      for (const f of Object.values(faces)) {
        const s = dot(f.normal, dir);
        if (!best || s > best.score) best = { center: f.center, score: s };
      }
      return best?.center ?? obj.origin;
    }
  }
}

export function resolveSchema(schema: Schema): ResolveResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const resolved = new Map<string, Resolved>();
  const order: string[] = [];

  // ─── PASS 1 + 2: Topological sort + placement + derived geometry (anchors) ──
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

  for (const comp of sorted) {
    order.push(comp.id);
    const c: any = comp;
    switch (comp.type) {
      case "ground":
        resolved.set(comp.id, buildGround(comp, resolvePoint(c.at, resolved)));
        break;
      case "wall":
        resolved.set(comp.id, buildWall(comp, resolvePoint(c.at, resolved)));
        break;
      case "incline":
        resolved.set(comp.id, buildIncline(comp, resolvePoint(c.anchor ?? c.at, resolved)));
        break;
      case "block": {
        const origin = resolvePoint(c.anchor ?? c.at, resolved);
        let rotation = 0;
        if (c.rotation === "auto" && (c.anchor || c.at)) {
          const rawRef = c.anchor ?? c.at;
          const n = normalizeRef(rawRef);
          if (n && (n.kind === "point" || n.kind === "curve" || n.kind === "face")) {
            const t = resolved.get(n.id);
            if (t?.type === "incline") {
              rotation = ((Math.atan2(t.data.sy, t.data.sx) * 180) / Math.PI);
            }
          }
        } else if (typeof c.rotation === "number") {
          rotation = c.rotation;
        }
        resolved.set(comp.id, buildBlock(comp, origin, rotation));
        break;
      }
      case "sphere":
        resolved.set(comp.id, buildSphere(comp, resolvePoint(c.anchor ?? c.at, resolved)));
        break;
      case "pulley":
        resolved.set(comp.id, buildPulley(comp, resolvePoint(c.anchor ?? c.at, resolved)));
        break;
      default:
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

  // ─── PASS 3: Constraint solving ─────────────────────────────────────────────
  const facts = solveConstraints(schema.constraints, { resolved, warnings });

  // ─── PASS 6: Auto forces ────────────────────────────────────────────────────
  const autoForces = generateAutoForces(resolved, schema.components);

  return { resolved, order, errors, warnings, facts, autoForces };
}
