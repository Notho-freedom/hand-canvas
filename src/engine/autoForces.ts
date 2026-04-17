import type { Component, Point } from "@/types/schema";
import type { Resolved } from "./anchors";
import { norm, sub, scale } from "./geometry";

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

/**
 * Generate auto forces for components flagged with autoForces=true.
 * Returns a list of synthesized force descriptors to render in PASS 7.
 *
 * We derive directions from resolved geometry (no hardcoded "down" for normals etc.):
 *  - Block on a surface (incline / ground) → P (down), N (along surface normal at contact)
 *  - Spring → F = -k·x along its axis (if k & restLength provided), at both ends
 *  - Rope → T at both ends along local tangent (handled via segment endpoints)
 */
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
          id: `${comp.id}__P`,
          type: "force",
          at: cog,
          dx: 0,
          dy: -wScale,
          label: "P",
          color: "hsl(0, 80%, 60%)",
          ownerId: comp.id,
        });
      }

      // Find the surface the block rests on (anchor reference target)
      const support = findSupport(comp, resolved);
      if (support && (enabled("N") || af === true)) {
        const n = support.normal;
        out.push({
          id: `${comp.id}__N`,
          type: "force",
          at: r.anchors.contact_point as Point,
          dx: n.x * wScale,
          dy: n.y * wScale,
          label: "N",
          color: "hsl(210, 80%, 60%)",
          ownerId: comp.id,
        });

        if (enabled("f")) {
          // friction: along tangent, opposing motion (no motion info → choose downhill→uphill arbitrary)
          const tg = support.tangent;
          out.push({
            id: `${comp.id}__f`,
            type: "force",
            at: r.anchors.contact_point as Point,
            dx: -tg.x * wScale * 0.5,
            dy: -tg.y * wScale * 0.5,
            label: "f",
            color: "hsl(280, 70%, 60%)",
            ownerId: comp.id,
          });
        }
      }
    }

    if (comp.type === "sphere" && (af === true || enabled("P"))) {
      const cog = r.anchors.cog as Point;
      const mass = (comp as any).params?.mass ?? 1;
      const wScale = Math.min(1.5, Math.max(0.6, (mass * G) / 50));
      out.push({
        id: `${comp.id}__P`,
        type: "force",
        at: cog,
        dx: 0,
        dy: -wScale,
        label: "P",
        color: "hsl(0, 80%, 60%)",
        ownerId: comp.id,
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
  if ("kind" in refSrc) {
    id = (refSrc as any).id;
  } else if ("ref" in refSrc) {
    id = (refSrc.ref as string).split(".")[0];
  }
  if (!id) return null;
  const target = resolved.get(id);
  if (!target) return null;
  const data = target.data;
  if (data?.normal && data?.tangent) {
    return { normal: data.normal, tangent: data.tangent };
  }
  return null;
}
