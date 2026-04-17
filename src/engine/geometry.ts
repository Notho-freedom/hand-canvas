import type { Point } from "@/types/schema";

export const EPSILON = 1e-6;

export const v = (x: number, y: number): Point => ({ x, y });
export const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
export const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
export const scale = (a: Point, k: number): Point => ({ x: a.x * k, y: a.y * k });
export const dot = (a: Point, b: Point): number => a.x * b.x + a.y * b.y;
export const len = (a: Point): number => Math.hypot(a.x, a.y);
export const norm = (a: Point): Point => {
  const l = len(a);
  return l < EPSILON ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
};
export const perp = (a: Point): Point => ({ x: -a.y, y: a.x });

export function snap(n: number, eps = EPSILON): number {
  if (Math.abs(n) < eps) return 0;
  return n;
}
export function snapPoint(p: Point): Point {
  return { x: snap(p.x), y: snap(p.y) };
}

/**
 * External tangent points from external point P to circle (C, r).
 * Returns the two contact points on the circle.
 */
export function tangentPointsToCircle(P: Point, C: Point, r: number): [Point, Point] | null {
  const d = sub(P, C);
  const dist = len(d);
  if (dist <= r + EPSILON) return null;
  const theta = Math.atan2(d.y, d.x);
  const alpha = Math.acos(r / dist);
  const a1 = theta + alpha;
  const a2 = theta - alpha;
  return [
    { x: C.x + r * Math.cos(a1), y: C.y + r * Math.sin(a1) },
    { x: C.x + r * Math.cos(a2), y: C.y + r * Math.sin(a2) },
  ];
}

/**
 * Pick tangent point on circle (C,r) reached from P, choosing side.
 *  - "upper" → highest y in math convention (yAxis up = top)
 *  - "lower" → lowest y
 *  - "external" / "auto" → side away from a hint vector (e.g. towards "other" external object)
 */
export function pickTangent(
  P: Point,
  C: Point,
  r: number,
  side: "upper" | "lower" | "auto" | "external" | "internal" = "auto",
  hint?: Point,
): Point | null {
  const ts = tangentPointsToCircle(P, C, r);
  if (!ts) return null;
  const [p1, p2] = ts;
  if (side === "upper") return p1.y >= p2.y ? p1 : p2;
  if (side === "lower") return p1.y <= p2.y ? p1 : p2;
  if (hint) {
    // pick tangent whose direction from C aligns better (away from hint)
    const h = norm(sub(hint, C));
    const d1 = dot(norm(sub(p1, C)), h);
    const d2 = dot(norm(sub(p2, C)), h);
    return d1 >= d2 ? p1 : p2;
  }
  // default external: upper
  return p1.y >= p2.y ? p1 : p2;
}

/** Project vector V onto unit-axis u. Returns scalar projection. */
export function project(V: Point, u: Point): number {
  const un = norm(u);
  return dot(V, un);
}

/** Decompose V into components along (ux, uy) basis. */
export function decompose(V: Point, ux: Point, uy: Point): { x: number; y: number } {
  return { x: project(V, ux), y: project(V, uy) };
}

/** Atan2 in degrees. */
export function angleDeg(p: Point): number {
  return (Math.atan2(p.y, p.x) * 180) / Math.PI;
}

/** Linear interpolation. */
export function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Closest point on segment AB to P. */
export function closestOnSegment(P: Point, A: Point, B: Point): Point {
  const AB = sub(B, A);
  const l2 = dot(AB, AB);
  if (l2 < EPSILON) return A;
  const t = Math.max(0, Math.min(1, dot(sub(P, A), AB) / l2));
  return add(A, scale(AB, t));
}

/** Distance between two points. */
export function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
