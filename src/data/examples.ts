import type { Schema } from "@/types/schema";

export const EXAMPLES: { key: string; label: string; schema: Schema }[] = [
  {
    key: "incline_block",
    label: "Bloc sur plan incliné",
    schema: {
      frame: { origin: { x: 0, y: 0 }, unit: "m", scale: 90, yAxis: "up", viewport: { x: -1, y: -0.5, w: 7, h: 4.5 } },
      components: [
        { id: "sol", type: "ground", at: { x: 2, y: 0 }, params: { length: 6, thickness: 0.05 } },
        { id: "plan", type: "incline", anchor: { ref: "sol.surface", t: 0.25 }, params: { angle: 30, length: 3.5, thickness: 0.05, direction: "right" } },
        { id: "bloc", type: "block", anchor: { ref: "plan.surface", t: 0.55 }, rotation: "auto", params: { w: 0.6, h: 0.4, mass: 5 }, label: "m" },
        { id: "P", type: "force", at: { ref: "bloc.cog" }, vector: { direction: "down", magnitude: 50 }, label: "P" },
        { id: "N", type: "force", at: { ref: "bloc.cog" }, vector: { magnitude: 1, dx: -Math.sin(Math.PI / 6) * 1.0, dy: Math.cos(Math.PI / 6) * 1.0 }, label: "N", style: { stroke: "hsl(210, 80%, 60%)" } },
        { id: "f", type: "force", at: { ref: "bloc.cog" }, vector: { magnitude: 1, dx: -Math.cos(Math.PI / 6) * 0.6, dy: -Math.sin(Math.PI / 6) * 0.6 }, label: "f", style: { stroke: "hsl(280, 70%, 60%)" } },
        { id: "alpha", type: "angle_arc", at: { ref: "plan.foot" }, params: { from: 0, to: 30, radius: 0.5 }, label: "α" },
      ],
    },
  },
  {
    key: "pulley_incline",
    label: "Poulie au sommet du plan",
    schema: {
      frame: { origin: { x: 0, y: 0 }, unit: "m", scale: 80, yAxis: "up", viewport: { x: -1, y: -0.5, w: 8, h: 5 } },
      components: [
        { id: "sol", type: "ground", at: { x: 3, y: 0 }, params: { length: 7, thickness: 0.05 } },
        { id: "plan", type: "incline", anchor: { ref: "sol.surface", t: 0.2 }, params: { angle: 35, length: 3.5, thickness: 0.05, direction: "right" } },
        { id: "poulie", type: "pulley", anchor: { ref: "plan.top", offset: { x: 0.05, y: 0.2 } }, params: { radius: 0.18 }, label: "P" },
        { id: "blocA", type: "block", anchor: { ref: "plan.surface", t: 0.5 }, rotation: "auto", params: { w: 0.5, h: 0.35, mass: 4 }, label: "A" },
        { id: "blocB", type: "block", at: { x: 5.4, y: 1.3 }, params: { w: 0.5, h: 0.5, mass: 3 }, label: "B" },
        { id: "corde1", type: "rope", from: { ref: "blocA.tr" }, to: { ref: "poulie.tangent_to:blocA" } },
        { id: "corde2", type: "rope", from: { ref: "poulie.right" }, to: { ref: "blocB.top" } },
        { id: "PA", type: "force", at: { ref: "blocA.cog" }, vector: { direction: "down", magnitude: 40 }, label: "Pa" },
        { id: "PB", type: "force", at: { ref: "blocB.cog" }, vector: { direction: "down", magnitude: 30 }, label: "Pb" },
      ],
    },
  },
  {
    key: "atwood",
    label: "Machine d'Atwood",
    schema: {
      frame: { origin: { x: 0, y: 0 }, unit: "m", scale: 100, yAxis: "up", viewport: { x: -1.5, y: -0.5, w: 5, h: 4.5 } },
      components: [
        { id: "support", type: "wall", at: { x: 1, y: 3.5 }, params: { height: 0.05, thickness: 0.05, side: "left" } },
        { id: "poulie", type: "pulley", at: { x: 1, y: 3.3 }, params: { radius: 0.25 }, label: "P" },
        { id: "m1", type: "block", at: { x: 0.5, y: 1.5 }, params: { w: 0.6, h: 0.6, mass: 2 }, label: "m₁" },
        { id: "m2", type: "block", at: { x: 1.5, y: 2.0 }, params: { w: 0.6, h: 0.6, mass: 3 }, label: "m₂" },
        { id: "c1", type: "rope", from: { ref: "m1.top" }, to: { ref: "poulie.left" } },
        { id: "c2", type: "rope", from: { ref: "poulie.right" }, to: { ref: "m2.top" } },
        { id: "P1", type: "force", at: { ref: "m1.cog" }, vector: { direction: "down", magnitude: 20 }, label: "P₁" },
        { id: "P2", type: "force", at: { ref: "m2.cog" }, vector: { direction: "down", magnitude: 30 }, label: "P₂" },
      ],
    },
  },
  {
    key: "spring_mass",
    label: "Ressort horizontal + masse",
    schema: {
      frame: { origin: { x: 0, y: 0 }, unit: "m", scale: 100, yAxis: "up", viewport: { x: -0.5, y: -0.5, w: 5, h: 3 } },
      components: [
        { id: "sol", type: "ground", at: { x: 2, y: 0 }, params: { length: 4.5, thickness: 0.05 } },
        { id: "mur", type: "wall", at: { x: 0.2, y: 0 }, params: { height: 1.5, thickness: 0.05, side: "left" } },
        { id: "bloc", type: "block", at: { x: 2.5, y: 0 }, params: { w: 0.6, h: 0.5, mass: 2 }, label: "m" },
        { id: "ressort", type: "spring", from: { ref: "mur.surface", t: 0.5 }, to: { ref: "bloc.bl" }, params: { coils: 10, width: 0.12 } },
        { id: "F", type: "force", at: { ref: "bloc.cog" }, vector: { direction: "right", magnitude: 30 }, label: "F" },
        { id: "P", type: "force", at: { ref: "bloc.cog" }, vector: { direction: "down", magnitude: 20 }, label: "P" },
        { id: "x", type: "axis", at: { x: 1.5, y: 1.3 }, params: { angle: 0, length: 1, name: "x" } },
      ],
    },
  },
];
