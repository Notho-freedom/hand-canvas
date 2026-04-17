import type { Component, Point } from "@/types/schema";

export type AnchorMap = Record<string, Point | ((arg?: string | number) => Point)>;

export interface Resolved {
  id: string;
  type: Component["type"];
  raw: Component;
  origin: Point;
  rotation: number;
  anchors: AnchorMap;
  data: Record<string, any>;
}

const deg2rad = (d: number) => (d * Math.PI) / 180;

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
      face_top_center: origin,
      normal_top: { x: 0, y: 1 } as any,
    },
    data: { left, right, len, thick, normal: { x: 0, y: 1 }, tangent: { x: 1, y: 0 } },
  };
}

export function buildWall(comp: Extract<Component, { type: "wall" }>, origin: Point): Resolved {
  const h = comp.params.height;
  const thick = comp.params.thickness;
  const top = { x: origin.x, y: origin.y + h };
  const side = comp.params.side === "right" ? -1 : 1; // wall faces "right" if side=left, "left" if side=right
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
      face_right_center: { x: origin.x, y: origin.y + h / 2 },
      face_left_center: { x: origin.x, y: origin.y + h / 2 },
      normal_right: { x: side, y: 0 } as any,
    },
    data: { h, thick, side, normal: { x: side, y: 0 }, tangent: { x: 0, y: 1 } },
  };
}

export function buildIncline(comp: Extract<Component, { type: "incline" }>, origin: Point): Resolved {
  const angle = comp.params.angle;
  const len = comp.params.length;
  const dir = comp.params.direction === "left" ? -1 : 1;
  const a = deg2rad(angle);
  const dx = dir * len * Math.cos(a);
  const dy = len * Math.sin(a);
  const bottom = origin;
  const top = { x: origin.x + dx, y: origin.y + dy };
  const sx = dx, sy = dy;
  const nLen = Math.hypot(sx, sy);
  const nx = -sy / nLen;
  const ny = sx / nLen;
  const nSign = ny < 0 ? -1 : 1;
  const normal = { x: nx * nSign, y: ny * nSign };
  const tangent = { x: sx / nLen, y: sy / nLen };
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
      normal: normal as any,
      tangent: tangent as any,
      face_top_center: { x: bottom.x + sx / 2, y: bottom.y + sy / 2 },
    },
    data: { angle, len, dir, top, bottom, sx, sy, normal, tangent },
  };
}

export function buildBlock(
  comp: Extract<Component, { type: "block" }>,
  origin: Point,
  rotation: number,
): Resolved {
  const w = comp.params.w;
  const h = comp.params.h;
  const a = deg2rad(rotation);
  const cos = Math.cos(a), sin = Math.sin(a);
  const local = {
    bl: { x: -w / 2, y: 0 },
    br: { x: w / 2, y: 0 },
    tl: { x: -w / 2, y: h },
    tr: { x: w / 2, y: h },
    cog: { x: 0, y: h / 2 },
    top: { x: 0, y: h },
    bottom: { x: 0, y: 0 },
    face_top_center: { x: 0, y: h },
    face_bottom_center: { x: 0, y: 0 },
    face_left_center: { x: -w / 2, y: h / 2 },
    face_right_center: { x: w / 2, y: h / 2 },
  };
  const rot = (p: Point): Point => ({
    x: origin.x + p.x * cos - p.y * sin,
    y: origin.y + p.x * sin + p.y * cos,
  });
  // local normals (in math convention, rotated)
  const rotDir = (p: Point): Point => ({ x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos });
  const n_top = rotDir({ x: 0, y: 1 });
  const n_bottom = rotDir({ x: 0, y: -1 });
  const n_left = rotDir({ x: -1, y: 0 });
  const n_right = rotDir({ x: 1, y: 0 });
  const tangent = rotDir({ x: 1, y: 0 });
  const normal = rotDir({ x: 0, y: 1 });
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
      face_top_center: rot(local.face_top_center),
      face_bottom_center: rot(local.face_bottom_center),
      face_left_center: rot(local.face_left_center),
      face_right_center: rot(local.face_right_center),
      normal_top: n_top as any,
      normal_bottom: n_bottom as any,
      normal_left: n_left as any,
      normal_right: n_right as any,
    },
    data: {
      w, h,
      corners: { bl: rot(local.bl), br: rot(local.br), tl: rot(local.tl), tr: rot(local.tr) },
      tangent, normal,
      faces: {
        top: { center: rot(local.face_top_center), normal: n_top },
        bottom: { center: rot(local.face_bottom_center), normal: n_bottom },
        left: { center: rot(local.face_left_center), normal: n_left },
        right: { center: rot(local.face_right_center), normal: n_right },
      },
    },
  };
}

export function buildSphere(comp: Extract<Component, { type: "sphere" }>, origin: Point): Resolved {
  const r = comp.params.radius;
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
