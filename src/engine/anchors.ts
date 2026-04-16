import type { Component, Point } from "@/types/schema";

export type AnchorMap = Record<string, Point | ((arg?: string | number) => Point)>;

export interface Resolved {
  id: string;
  type: Component["type"];
  raw: Component;
  /** Origin point used to position the component (world coords). */
  origin: Point;
  /** Rotation in degrees (math convention, CCW positive when yAxis up). */
  rotation: number;
  /** Named anchors in world coordinates. */
  anchors: AnchorMap;
  /** Auxiliary computed data (per type). */
  data: Record<string, any>;
}

const deg2rad = (d: number) => (d * Math.PI) / 180;

/** Build anchors for a ground (horizontal segment, top surface usable). */
export function buildGround(comp: Extract<Component, { type: "ground" }>, origin: Point): Resolved {
  const len = comp.params.length;
  const thick = comp.params.thickness;
  const left = { x: origin.x - len / 2, y: origin.y };
  const right = { x: origin.x + len / 2, y: origin.y };
  return {
    id: comp.id,
    type: "ground",
    raw: comp,
    origin,
    rotation: 0,
    anchors: {
      center: origin,
      left,
      right,
      top: origin,
      bottom: { x: origin.x, y: origin.y - thick },
      surface: (t: any) => {
        const tt = typeof t === "number" ? t : 0.5;
        return { x: left.x + tt * len, y: origin.y };
      },
      cog: { x: origin.x, y: origin.y - thick / 2 },
    },
    data: { left, right, len, thick },
  };
}

export function buildWall(comp: Extract<Component, { type: "wall" }>, origin: Point): Resolved {
  const h = comp.params.height;
  const thick = comp.params.thickness;
  const top = { x: origin.x, y: origin.y + h };
  return {
    id: comp.id,
    type: "wall",
    raw: comp,
    origin,
    rotation: 0,
    anchors: {
      bottom: origin,
      top,
      center: { x: origin.x, y: origin.y + h / 2 },
      cog: { x: origin.x, y: origin.y + h / 2 },
      surface: (t: any) => {
        const tt = typeof t === "number" ? t : 0.5;
        return { x: origin.x, y: origin.y + tt * h };
      },
    },
    data: { h, thick },
  };
}

/** Incline: right-triangle. Origin = bottom corner where slope starts (foot). */
export function buildIncline(comp: Extract<Component, { type: "incline" }>, origin: Point): Resolved {
  const angle = comp.params.angle; // deg
  const len = comp.params.length; // hypotenuse
  const dir = comp.params.direction === "left" ? -1 : 1;
  const a = deg2rad(angle);
  const dx = dir * len * Math.cos(a);
  const dy = len * Math.sin(a);
  const bottom = origin; // foot at base
  const top = { x: origin.x + dx, y: origin.y + dy };
  // Surface vector (from bottom to top)
  const sx = dx;
  const sy = dy;
  // Outward normal (perpendicular to slope, pointing "up off the surface")
  const nLen = Math.hypot(sx, sy);
  const nx = -sy / nLen; // rotate 90° CCW
  const ny = sx / nLen;
  // Ensure normal points upward
  const nSign = ny < 0 ? -1 : 1;
  const normal = { x: nx * nSign, y: ny * nSign };
  return {
    id: comp.id,
    type: "incline",
    raw: comp,
    origin,
    rotation: dir === 1 ? angle : 180 - angle,
    anchors: {
      bottom,
      top,
      foot: bottom,
      cog: { x: origin.x + dx / 3, y: origin.y + dy / 3 },
      surface: (t: any) => {
        const tt = typeof t === "number" ? t : 0.5;
        return { x: bottom.x + sx * tt, y: bottom.y + sy * tt };
      },
      normal: normal as any, // direction vector, not a point
    },
    data: { angle, len, dir, top, bottom, sx, sy, normal },
  };
}

export function buildBlock(comp: Extract<Component, { type: "block" }>, origin: Point, rotation: number): Resolved {
  const w = comp.params.w;
  const h = comp.params.h;
  // origin = bottom-center of the block (sits on surface)
  const a = deg2rad(rotation);
  const cos = Math.cos(a), sin = Math.sin(a);
  // Local corners (bottom-center origin, before rotation)
  const local = {
    bl: { x: -w / 2, y: 0 },
    br: { x: w / 2, y: 0 },
    tl: { x: -w / 2, y: h },
    tr: { x: w / 2, y: h },
    cog: { x: 0, y: h / 2 },
    top: { x: 0, y: h },
    bottom: { x: 0, y: 0 },
  };
  const rot = (p: Point): Point => ({
    x: origin.x + p.x * cos - p.y * sin,
    y: origin.y + p.x * sin + p.y * cos,
  });
  return {
    id: comp.id,
    type: "block",
    raw: comp,
    origin,
    rotation,
    anchors: {
      cog: rot(local.cog),
      top: rot(local.top),
      bottom: rot(local.bottom),
      bl: rot(local.bl),
      br: rot(local.br),
      tl: rot(local.tl),
      tr: rot(local.tr),
      contact_point: rot(local.bottom),
      center: rot(local.cog),
    },
    data: { w, h, corners: { bl: rot(local.bl), br: rot(local.br), tl: rot(local.tl), tr: rot(local.tr) } },
  };
}

export function buildSphere(comp: Extract<Component, { type: "sphere" }>, origin: Point): Resolved {
  const r = comp.params.radius;
  // origin = center
  return {
    id: comp.id,
    type: "sphere",
    raw: comp,
    origin,
    rotation: 0,
    anchors: {
      cog: origin,
      center: origin,
      top: { x: origin.x, y: origin.y + r },
      bottom: { x: origin.x, y: origin.y - r },
      left: { x: origin.x - r, y: origin.y },
      right: { x: origin.x + r, y: origin.y },
      contact_point: { x: origin.x, y: origin.y - r },
    },
    data: { r },
  };
}

export function buildPulley(comp: Extract<Component, { type: "pulley" }>, origin: Point): Resolved {
  const r = comp.params.radius;
  return {
    id: comp.id,
    type: "pulley",
    raw: comp,
    origin,
    rotation: 0,
    anchors: {
      cog: origin,
      center: origin,
      top: { x: origin.x, y: origin.y + r },
      bottom: { x: origin.x, y: origin.y - r },
      left: { x: origin.x - r, y: origin.y },
      right: { x: origin.x + r, y: origin.y },
    },
    data: { r },
  };
}
