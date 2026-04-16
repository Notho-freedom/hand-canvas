import type { Frame, Point } from "@/types/schema";

/** Convert a world point to SVG screen coordinates (px). */
export function worldToScreen(p: Point, frame: Frame): Point {
  const { origin, scale, yAxis, viewport } = frame;
  const wx = p.x + origin.x;
  const wy = p.y + origin.y;
  // Map (wx, wy) inside viewport [vx..vx+vw] x [vy..vy+vh] to pixels
  const px = (wx - viewport.x) * scale;
  const pyMath = (wy - viewport.y) * scale;
  // SVG y goes down. If yAxis is "up", flip relative to viewport height.
  const py = yAxis === "up" ? viewport.h * scale - pyMath : pyMath;
  return { x: px, y: py };
}

/** Length scaling (no origin shift). */
export function worldLen(len: number, frame: Frame): number {
  return len * frame.scale;
}

export function viewBox(frame: Frame): string {
  const w = frame.viewport.w * frame.scale;
  const h = frame.viewport.h * frame.scale;
  return `0 0 ${w} ${h}`;
}

export function viewSize(frame: Frame): { w: number; h: number } {
  return { w: frame.viewport.w * frame.scale, h: frame.viewport.h * frame.scale };
}
