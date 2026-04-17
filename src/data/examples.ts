import type { Schema } from "@/types/schema";

export const EXAMPLES: { key: string; label: string; schema: Schema }[] = [
  {
    key: "incline_block",
    label: "Bloc sur plan incliné (avec projection)",
    schema: {
      frame: { origin: { x: 0, y: 0 }, unit: "m", scale: 90, yAxis: "up", viewport: { x: -1, y: -0.5, w: 7, h: 4.5 } },
      components: [
        { id: "sol", type: "ground", at: { x: 2, y: 0 }, params: { length: 6, thickness: 0.05 } },
        { id: "plan", type: "incline", anchor: { ref: "sol.surface", t: 0.25 }, params: { angle: 30, length: 3.5, thickness: 0.05, direction: "right" } },
        {
          id: "bloc",
          type: "block",
          anchor: { kind: "curve", id: "plan", curve: "surface", t: 0.55 },
          rotation: "auto",
          params: { w: 0.6, h: 0.4, mass: 5 },
          label: "m",
          autoForces: ["P", "N", "f"],
        },
        { id: "frame_bloc", type: "local_frame", of: "bloc", origin: "cog", mode: "surface_aligned", axes: ["x'", "y'"], length: 0.7 },
        { id: "alpha", type: "angle_arc", at: { ref: "plan.foot" }, params: { from: 0, to: 30, radius: 0.5 }, label: "α" },
      ],
    } as any,
  },
  {
    key: "pulley_incline",
    label: "Poulie au sommet du plan + masse suspendue",
    schema: {
      frame: { origin: { x: 0, y: 0 }, unit: "m", scale: 80, yAxis: "up", viewport: { x: -1, y: -0.5, w: 8, h: 5 } },
      components: [
        { id: "sol", type: "ground", at: { x: 3, y: 0 }, params: { length: 7, thickness: 0.05 } },
        { id: "plan", type: "incline", anchor: { ref: "sol.surface", t: 0.2 }, params: { angle: 35, length: 3.5, thickness: 0.05, direction: "right" } },
        { id: "poulie", type: "pulley", anchor: { ref: "plan.top", offset: { x: 0.05, y: 0.2 } }, params: { radius: 0.18 }, label: "P" },
        {
          id: "blocA",
          type: "block",
          anchor: { kind: "curve", id: "plan", curve: "surface", t: 0.5 },
          rotation: "auto",
          params: { w: 0.5, h: 0.35, mass: 4 },
          label: "A",
          autoForces: ["P"],
        },
        { id: "blocB", type: "block", at: { x: 5.4, y: 1.3 }, params: { w: 0.5, h: 0.5, mass: 3 }, label: "B", autoForces: ["P"] },
        // Single rope wrapping the pulley: blocA.face_top_center → wrap around poulie → blocB.face_top_center
        {
          id: "corde",
          type: "rope",
          path: [
            { kind: "face", id: "blocA", face: "top" },
            { wrap: "poulie", side: "auto" },
            { kind: "face", id: "blocB", face: "top" },
          ],
        },
      ],
      constraints: [
        { type: "tangent", rope: "corde", pulley: "poulie", side: "external" },
      ],
    } as any,
  },
  {
    key: "atwood",
    label: "Machine d'Atwood (corde unique)",
    schema: {
      frame: { origin: { x: 0, y: 0 }, unit: "m", scale: 100, yAxis: "up", viewport: { x: -1.5, y: -0.5, w: 5, h: 4.5 } },
      components: [
        { id: "support", type: "wall", at: { x: 1, y: 3.5 }, params: { height: 0.05, thickness: 0.05, side: "left" } },
        { id: "poulie", type: "pulley", at: { x: 1, y: 3.3 }, params: { radius: 0.25 }, label: "P" },
        { id: "m1", type: "block", at: { x: 0.5, y: 1.5 }, params: { w: 0.6, h: 0.6, mass: 2 }, label: "m₁", autoForces: ["P"] },
        { id: "m2", type: "block", at: { x: 1.5, y: 2.0 }, params: { w: 0.6, h: 0.6, mass: 3 }, label: "m₂", autoForces: ["P"] },
        {
          id: "corde",
          type: "rope",
          path: [
            { kind: "face", id: "m1", face: "top" },
            { wrap: "poulie", side: "auto" },
            { kind: "face", id: "m2", face: "top" },
          ],
        },
      ],
      constraints: [
        { type: "tangent", rope: "corde", pulley: "poulie", side: "external" },
        { type: "tension_equal", rope: "corde" },
      ],
    } as any,
  },
  {
    key: "spring_mass",
    label: "Ressort horizontal + masse",
    schema: {
      frame: { origin: { x: 0, y: 0 }, unit: "m", scale: 100, yAxis: "up", viewport: { x: -0.5, y: -0.5, w: 5, h: 3 } },
      components: [
        { id: "sol", type: "ground", at: { x: 2, y: 0 }, params: { length: 4.5, thickness: 0.05 } },
        { id: "mur", type: "wall", at: { x: 0.2, y: 0 }, params: { height: 1.5, thickness: 0.05, side: "left" } },
        { id: "bloc", type: "block", at: { x: 2.5, y: 0 }, params: { w: 0.6, h: 0.5, mass: 2 }, label: "m", autoForces: ["P", "N"] },
        {
          id: "ressort",
          type: "spring",
          from: { kind: "curve", id: "mur", curve: "surface", t: 0.5 },
          to: { kind: "face", id: "bloc", face: "left" },
          params: { coils: 10, width: 0.12 },
        },
        { id: "F", type: "force", at: { ref: "bloc.cog" }, vector: { direction: "right", magnitude: 30 }, label: "F" },
        { id: "x", type: "axis", at: { x: 1.5, y: 1.3 }, params: { angle: 0, length: 1, name: "x" } },
      ],
      constraints: [
        { type: "horizontal", object: "ressort" },
      ],
    } as any,
  },
];
