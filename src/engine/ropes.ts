import type { Point } from "@/types/schema";
import type { Resolved } from "./anchors";
import { pickTangent, sub, dot, norm, angleDeg } from "./geometry";

export type RopeSegment =
  | { type: "line"; from: Point; to: Point }
  | { type: "arc"; center: Point; radius: number; startAngle: number; endAngle: number; sweep: 0 | 1 };

export type RopePath = RopeSegment[];

/**
 * Build a rope path from a sequence of waypoints.
 * Each waypoint is either a Point, or { wrap: pulleyId, side } (resolved against `pulleys`).
 *
 * Algorithm: for each consecutive pair (Wi, Wi+1):
 *   - If both are points → line.
 *   - If Wi is a pulley → tangent leaves pulley toward Wi+1's contact.
 *   - If Wi+1 is a pulley → tangent enters pulley from Wi.
 *   - If both are pulleys → external tangent (simplified: connect tangents from each side).
 * Arcs on pulleys link incoming and outgoing tangent points.
 */

type Waypoint =
  | { kind: "point"; p: Point }
  | { kind: "pulley"; id: string; center: Point; radius: number; side: "upper" | "lower" | "auto" };

export function buildRopePath(waypoints: Waypoint[]): RopePath {
  if (waypoints.length < 2) return [];

  // Resolve contact points per pulley using neighbours.
  const contacts: { in?: Point; out?: Point; angIn?: number; angOut?: number }[] = waypoints.map(() => ({}));

  for (let i = 0; i < waypoints.length - 1; i++) {
    const A = waypoints[i];
    const B = waypoints[i + 1];

    if (A.kind === "point" && B.kind === "point") continue;

    if (A.kind === "point" && B.kind === "pulley") {
      // tangent from external A to circle B
      const t = pickTangent(A.p, B.center, B.radius, B.side, A.p);
      if (t) {
        contacts[i + 1].in = t;
        contacts[i + 1].angIn = angleDeg(sub(t, B.center));
      }
    } else if (A.kind === "pulley" && B.kind === "point") {
      const t = pickTangent(B.p, A.center, A.radius, A.side, B.p);
      if (t) {
        contacts[i].out = t;
        contacts[i].angOut = angleDeg(sub(t, A.center));
      }
    } else if (A.kind === "pulley" && B.kind === "pulley") {
      // external tangent line between two circles → simplified: connect
      // tangent from A.center towards B.center on chosen sides
      const dirAB = sub(B.center, A.center);
      const hint = { x: A.center.x + dirAB.x, y: A.center.y + dirAB.y };
      const tA = pickTangent(B.center, A.center, A.radius, A.side, hint);
      const tB = pickTangent(A.center, B.center, B.radius, B.side, A.center);
      if (tA && tB) {
        contacts[i].out = tA;
        contacts[i].angOut = angleDeg(sub(tA, A.center));
        contacts[i + 1].in = tB;
        contacts[i + 1].angIn = angleDeg(sub(tB, B.center));
      }
    }
  }

  // Build segments
  const path: RopePath = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const A = waypoints[i];
    const B = waypoints[i + 1];
    const cA = contacts[i];
    const cB = contacts[i + 1];
    const fromPt = A.kind === "point" ? A.p : (cA.out ?? A.center);
    const toPt = B.kind === "point" ? B.p : (cB.in ?? B.center);
    path.push({ type: "line", from: fromPt, to: toPt });

    // If next waypoint is a pulley AND it has an outgoing tangent → add arc on it
    if (B.kind === "pulley" && cB.in && cB.out && i + 1 < waypoints.length - 1) {
      const start = cB.angIn!;
      const end = cB.angOut!;
      // sweep: pick the shorter arc on the side opposite the rope's "interior"
      // Heuristic: choose sweep so the arc bulges away from the next/previous waypoints.
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

function shortestSweep(startDeg: number, endDeg: number): 0 | 1 {
  const diff = ((endDeg - startDeg + 540) % 360) - 180;
  return diff >= 0 ? 1 : 0;
}

/** Build waypoints from rope spec. Resolves wrap entries against pulleys map. */
export function ropeWaypointsFromSpec(
  entries: Array<{ kind: "point"; p: Point } | { wrap: string; side?: "upper" | "lower" | "auto" }>,
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

/** Convert a RopePath to an SVG `d` string. Caller provides world→screen mapper. */
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
      // SVG sweep flag: in screen coords, y is flipped if yAxis is up → invert sweep
      const sweepScreen = yAxisUp ? (1 - seg.sweep) : seg.sweep;
      if (!cursor || cursor.x !== startS.x || cursor.y !== startS.y) parts.push(`M ${startS.x} ${startS.y}`);
      parts.push(`A ${r} ${r} 0 ${largeArc} ${sweepScreen} ${endS.x} ${endS.y}`);
      cursor = endS;
    }
  }
  return parts.join(" ");
}
