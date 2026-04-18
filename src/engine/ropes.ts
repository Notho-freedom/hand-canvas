import type { Point } from "@/types/schema";
import type { Resolved } from "./anchors";
import { pickTangent, sub, dot, norm, angleDeg, snap } from "./geometry";

export type RopeSegment =
  | { type: "line"; from: Point; to: Point }
  | { type: "arc"; center: Point; radius: number; startAngle: number; endAngle: number; sweep: 0 | 1 };

export type RopePath = RopeSegment[];

type Waypoint =
  | { kind: "point"; p: Point }
  | { kind: "pulley"; id: string; center: Point; radius: number; side: "upper" | "lower" | "left" | "right" | "auto" };

/**
 * Build rope path. Supports pulley sides "left"/"right" which force a STRICTLY VERTICAL
 * tangent point on the pulley (cordes tendues sous masse).
 */
export function buildRopePath(waypoints: Waypoint[]): RopePath {
  if (waypoints.length < 2) return [];

  const contacts: { in?: Point; out?: Point; angIn?: number; angOut?: number }[] = waypoints.map(() => ({}));

  for (let i = 0; i < waypoints.length - 1; i++) {
    const A = waypoints[i];
    const B = waypoints[i + 1];

    if (A.kind === "point" && B.kind === "point") continue;

    if (A.kind === "point" && B.kind === "pulley") {
      const t = resolvePulleyContact(A.p, B, "in");
      if (t) {
        contacts[i + 1].in = t;
        contacts[i + 1].angIn = angleDeg(sub(t, B.center));
      }
    } else if (A.kind === "pulley" && B.kind === "point") {
      const t = resolvePulleyContact(B.p, A, "out");
      if (t) {
        contacts[i].out = t;
        contacts[i].angOut = angleDeg(sub(t, A.center));
      }
    } else if (A.kind === "pulley" && B.kind === "pulley") {
      const dirAB = sub(B.center, A.center);
      const hint = { x: A.center.x + dirAB.x, y: A.center.y + dirAB.y };
      const tA = pickTangent(B.center, A.center, A.radius, mapSide(A.side), hint);
      const tB = pickTangent(A.center, B.center, B.radius, mapSide(B.side), A.center);
      if (tA && tB) {
        contacts[i].out = tA;
        contacts[i].angOut = angleDeg(sub(tA, A.center));
        contacts[i + 1].in = tB;
        contacts[i + 1].angIn = angleDeg(sub(tB, B.center));
      }
    }
  }

  const path: RopePath = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const A = waypoints[i];
    const B = waypoints[i + 1];
    const cA = contacts[i];
    const cB = contacts[i + 1];
    let fromPt = A.kind === "point" ? A.p : (cA.out ?? A.center);
    let toPt = B.kind === "point" ? B.p : (cB.in ?? B.center);

    // VERTICAL SNAP: if a pulley side is left/right and the other end is a point,
    // force the segment to be strictly vertical (gravity-aligned).
    if (A.kind === "point" && B.kind === "pulley" && (B.side === "left" || B.side === "right")) {
      // align point's x with pulley contact x
      fromPt = { x: toPt.x, y: fromPt.y };
    }
    if (A.kind === "pulley" && B.kind === "point" && (A.side === "left" || A.side === "right")) {
      toPt = { x: fromPt.x, y: toPt.y };
    }

    path.push({ type: "line", from: fromPt, to: toPt });

    if (B.kind === "pulley" && cB.in && cB.out && i + 1 < waypoints.length - 1) {
      const start = cB.angIn!;
      const end = cB.angOut!;
      const sweep: 0 | 1 = shortestSweep(start, end);
      path.push({
        type: "arc",
        center: B.center,
        radius: B.radius,
        startAngle: start,
        endAngle: end,
        sweep,
      });
    }
  }
  return path;
}

function mapSide(s: "upper" | "lower" | "left" | "right" | "auto"): "upper" | "lower" | "auto" {
  if (s === "left" || s === "right") return "auto";
  return s;
}

/**
 * For sides "left"/"right": tangent point is at angle 180°/0° on the pulley (horizontal extreme),
 * which means the rope leaving it goes strictly vertical — physically correct for a hanging mass.
 */
function resolvePulleyContact(
  external: Point,
  pulley: { center: Point; radius: number; side: "upper" | "lower" | "left" | "right" | "auto" },
  _dir: "in" | "out",
): Point | null {
  if (pulley.side === "left") {
    return { x: pulley.center.x - pulley.radius, y: pulley.center.y };
  }
  if (pulley.side === "right") {
    return { x: pulley.center.x + pulley.radius, y: pulley.center.y };
  }
  const t = pickTangent(external, pulley.center, pulley.radius, mapSide(pulley.side), external);
  return t;
}

function shortestSweep(startDeg: number, endDeg: number): 0 | 1 {
  const diff = ((endDeg - startDeg + 540) % 360) - 180;
  return diff >= 0 ? 1 : 0;
}

export function ropeWaypointsFromSpec(
  entries: Array<{ kind: "point"; p: Point } | { wrap: string; side?: "upper" | "lower" | "left" | "right" | "auto" }>,
  resolveById: (id: string) => Resolved | undefined,
): Waypoint[] {
  const out: Waypoint[] = [];
  for (const e of entries) {
    if ("wrap" in e) {
      const r = resolveById(e.wrap);
      if (!r || r.type !== "pulley") continue;
      out.push({ kind: "pulley", id: e.wrap, center: r.origin, radius: r.data.r, side: e.side ?? "auto" });
    } else {
      out.push(e);
    }
  }
  return out;
}

export function ropePathToSVG(path: RopePath, W2S: (p: Point) => Point, L: (n: number) => number, yAxisUp: boolean): string {
  if (!path.length) return "";
  const parts: string[] = [];
  let cursor: Point | null = null;
  for (const seg of path) {
    if (seg.type === "line") {
      const a = W2S(seg.from);
      const b = W2S(seg.to);
      if (!cursor || cursor.x !== a.x || cursor.y !== a.y) parts.push(`M ${a.x} ${a.y}`);
      parts.push(`L ${b.x} ${b.y}`);
      cursor = b;
    } else {
      const r = L(seg.radius);
      const startA = (seg.startAngle * Math.PI) / 180;
      const endA = (seg.endAngle * Math.PI) / 180;
      const startW = { x: seg.center.x + seg.radius * Math.cos(startA), y: seg.center.y + seg.radius * Math.sin(startA) };
      const endW = { x: seg.center.x + seg.radius * Math.cos(endA), y: seg.center.y + seg.radius * Math.sin(endA) };
      const startS = W2S(startW);
      const endS = W2S(endW);
      const diff = ((seg.endAngle - seg.startAngle + 540) % 360) - 180;
      const largeArc = Math.abs(diff) > 180 ? 1 : 0;
      const sweepScreen = yAxisUp ? (1 - seg.sweep) : seg.sweep;
      if (!cursor || cursor.x !== startS.x || cursor.y !== startS.y) parts.push(`M ${startS.x} ${startS.y}`);
      parts.push(`A ${r} ${r} 0 ${largeArc} ${sweepScreen} ${endS.x} ${endS.y}`);
      cursor = endS;
    }
  }
  return parts.join(" ");
}
