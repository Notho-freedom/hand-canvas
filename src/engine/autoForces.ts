import type { Component, Point } from "@/types/schema";
import type { Resolved } from "./anchors";
import { norm, sub } from "./geometry";

export interface AutoForce {
  id: string;
  type: "force";
  at: Point;
  dx: number;
  dy: number;
  label: string;
  color: string;
  ownerId: string;
}

const G = 9.81;

export function generateAutoForces(
  resolved: Map<string, Resolved>,
  components: Component[],
): AutoForce[] {
  const out: AutoForce[] = [];

  for (const comp of components) {
    const af = (comp as any).autoForces;
    if (!af) continue;
    const enabled = (name: string): boolean => (af === true ? true : Array.isArray(af) && af.includes(name));

    const r = resolved.get(comp.id);
    if (!r) continue;

    if (comp.type === "block") {
      const cog = r.anchors.cog as Point;
      const mass = (comp as any).params?.mass ?? (comp as any).physics?.mass ?? 1;
      const weight = mass * G;
      const wScale = Math.min(1.5, Math.max(0.6, weight / 50));

      if (enabled("P") || af === true) {
        out.push({
          id: `${comp.id}__P`, type: "force", at: cog,
          dx: 0, dy: -wScale, label: "P",
          color: "hsl(0, 80%, 60%)", ownerId: comp.id,
        });
      }

      const support = findSupport(comp, resolved);
      if (support && (enabled("N") || af === true)) {
        const n = support.normal;
        out.push({
          id: `${comp.id}__N`, type: "force",
          at: r.anchors.contact_point as Point,
          dx: n.x * wScale, dy: n.y * wScale, label: "N",
          color: "hsl(210, 80%, 60%)", ownerId: comp.id,
        });

        if (enabled("f")) {
          const tg = support.tangent;
          out.push({
            id: `${comp.id}__f`, type: "force",
            at: r.anchors.contact_point as Point,
            dx: -tg.x * wScale * 0.5, dy: -tg.y * wScale * 0.5,
            label: "f", color: "hsl(280, 70%, 60%)", ownerId: comp.id,
          });
        }
      }

      // Rope tension: if a rope's face attaches to this block, draw T along the rope tangent
      if (enabled("T") || af === true) {
        const tensions = findRopeTensions(comp.id, resolved, components);
        for (const t of tensions) {
          out.push({
            id: `${comp.id}__T_${t.ropeId}`, type: "force",
            at: t.at, dx: t.dir.x * wScale, dy: t.dir.y * wScale,
            label: "T", color: "hsl(160, 70%, 50%)", ownerId: comp.id,
          });
        }
      }
    }

    if (comp.type === "sphere" && (af === true || enabled("P"))) {
      const cog = r.anchors.cog as Point;
      const mass = (comp as any).params?.mass ?? 1;
      const wScale = Math.min(1.5, Math.max(0.6, (mass * G) / 50));
      out.push({
        id: `${comp.id}__P`, type: "force", at: cog,
        dx: 0, dy: -wScale, label: "P",
        color: "hsl(0, 80%, 60%)", ownerId: comp.id,
      });
    }
  }

  return out;
}

function findSupport(
  comp: Component,
  resolved: Map<string, Resolved>,
): { normal: Point; tangent: Point } | null {
  const c: any = comp;
  const refSrc = c.anchor ?? c.at;
  if (!refSrc || typeof refSrc !== "object") return null;
  let id: string | undefined;
  if ("kind" in refSrc) id = (refSrc as any).id;
  else if ("ref" in refSrc) id = (refSrc.ref as string).split(".")[0];
  if (!id) return null;
  const target = resolved.get(id);
  if (!target) return null;
  const data = target.data;
  if (data?.normal && data?.tangent) return { normal: data.normal, tangent: data.tangent };
  return null;
}

/** Find ropes attached to this block and return tension vector at attach point (towards next waypoint). */
function findRopeTensions(
  blockId: string,
  resolved: Map<string, Resolved>,
  components: Component[],
): { ropeId: string; at: Point; dir: Point }[] {
  const out: { ropeId: string; at: Point; dir: Point }[] = [];
  const block = resolved.get(blockId);
  if (!block) return out;

  for (const comp of components) {
    if (comp.type !== "rope" && comp.type !== "pulley_rope_system") continue;
    const c: any = comp;

    // For pulley_rope_system: check leftAttach/rightAttach
    if (comp.type === "pulley_rope_system") {
      const pulley = resolved.get(c.pulley);
      if (!pulley) continue;
      for (const side of ["leftAttach", "rightAttach"] as const) {
        const ref = c[side];
        if (!ref || typeof ref !== "object") continue;
        const id = (ref as any).kind ? (ref as any).id : (ref.ref ? ref.ref.split(".")[0] : null);
        if (id !== blockId) continue;
        const at = resolveFaceCenter(blockId, "top", resolved);
        if (!at) continue;
        // Tension direction: from attach point towards pulley contact (left/right side)
        const cx = pulley.origin.x + (side === "leftAttach" ? -pulley.data.r : pulley.data.r);
        const cy = pulley.origin.y;
        const dir = norm({ x: cx - at.x, y: cy - at.y });
        out.push({ ropeId: comp.id, at, dir });
      }
      continue;
    }

    // For regular rope: check path entries for face refs to this block
    if (Array.isArray(c.path)) {
      for (let i = 0; i < c.path.length; i++) {
        const e = c.path[i];
        if (!e || typeof e !== "object" || "wrap" in e) continue;
        if ((e as any).kind === "face" && (e as any).id === blockId) {
          const at = resolveFaceCenter(blockId, (e as any).face, resolved);
          if (!at) continue;
          // Find next non-self waypoint to determine direction
          const nextEntry = c.path[i + 1] ?? c.path[i - 1];
          if (!nextEntry) continue;
          let target: Point | null = null;
          if ("wrap" in nextEntry) {
            const p = resolved.get(nextEntry.wrap);
            if (!p) continue;
            // For vertical-side wraps, target is the contact point
            if (nextEntry.side === "left") target = { x: p.origin.x - p.data.r, y: p.origin.y };
            else if (nextEntry.side === "right") target = { x: p.origin.x + p.data.r, y: p.origin.y };
            else target = p.origin;
          }
          if (!target) continue;
          const dir = norm({ x: target.x - at.x, y: target.y - at.y });
          out.push({ ropeId: comp.id, at, dir });
        }
      }
    }
  }
  return out;
}

function resolveFaceCenter(id: string, face: string, resolved: Map<string, Resolved>): Point | null {
  const r = resolved.get(id);
  if (!r) return null;
  const a = r.anchors[`face_${face}_center`];
  if (a && typeof a !== "function") return a as Point;
  return null;
}
