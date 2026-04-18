import type { Schema } from "@/types/schema";

export const EXAMPLES: { key: string; label: string; schema: Schema }[] = [
  {
    key: "incline_block",
    label: "Bloc sur plan incliné (avec projections complètes)",
    schema: {
      frame: { origin: { x: 0, y: 0 }, unit: "m", scale: 90, yAxis: "up", viewport: { x: -1, y: -0.5, w: 7, h: 4.5 } },
      components: [
        { id: "sol", type: "ground", at: { x: 2, y: 0 }, params: { length: 6, thickness: 0.05 } },
        { id: "plan", type: "incline", anchor: { ref: "sol.surface", t: 0.25 }, params: { angle: 30, length: 3.5, thickness: 0.05, direction: "right" } },
        {
          id: "bloc", type: "block",
          anchor: { kind: "curve", id: "plan", curve: "surface", t: 0.55 },
          rotation: "auto",
          params: { w: 0.6, h: 0.4, mass: 5 },
          label: "m",
          autoForces: ["P", "N", "f"],
        },
        { id: "frame_bloc", type: "local_frame", of: "bloc", origin: "cog", mode: "surface_aligned", axes: ["x'", "y'"], length: 1.4, bidirectional: true },
        { id: "P_user", type: "force", at: { ref: "bloc.cog" }, vector: { dx: 0, dy: -1 }, label: "P" },
        { id: "proj_P", type: "projection", force: "P_user", onto: "bloc.frame", components: ["x", "y"], labels: ["Px", "Py"], showRectangle: true },
        { id: "alpha", type: "angle_arc", at: { ref: "plan.foot" }, params: { from: 0, to: 30, radius: 0.5 }, label: "α" },
      ],
      animation: {
        duration: 6, autoplay: false,
        initiallyHidden: ["frame_bloc", "P_user", "proj_P"],
        steps: [
          { at: 0.5, show: ["frame_bloc"] },
          { at: 1.5, show: ["P_user"] },
          { at: 2.5, show: ["proj_P"] },
          { at: 3.5, animate: { id: "bloc", along: "plan.surface", from: 0.55, to: 0.05, duration: 2.5 } },
        ],
      },
    } as any,
  },
  {
    key: "pulley_incline",
    label: "Poulie + plan incliné + masse suspendue",
    schema: {
      frame: { origin: { x: 0, y: 0 }, unit: "m", scale: 80, yAxis: "up", viewport: { x: -1, y: -0.5, w: 8, h: 5 } },
      components: [
        { id: "sol", type: "ground", at: { x: 3, y: 0 }, params: { length: 7, thickness: 0.05 } },
        { id: "plan", type: "incline", anchor: { ref: "sol.surface", t: 0.2 }, params: { angle: 35, length: 3.5, thickness: 0.05, direction: "right" } },
        { id: "poulie", type: "pulley", anchor: { ref: "plan.top", offset: { x: 0.1, y: 0.25 } }, params: { radius: 0.18 }, label: "P" },
        {
          id: "blocA", type: "block",
          anchor: { kind: "curve", id: "plan", curve: "surface", t: 0.5 },
          rotation: "auto",
          params: { w: 0.5, h: 0.35, mass: 4 },
          label: "A",
          autoForces: ["P"],
        },
        // bloc B suspendu, légèrement décalé sous la poulie
        { id: "blocB", type: "block", at: { x: 5.3, y: 1.4 }, params: { w: 0.5, h: 0.5, mass: 3 }, label: "B", autoForces: ["P"] },
        // corde côté plan : tangente classique (auto)
        {
          id: "cordeA", type: "rope",
          path: [
            { kind: "face", id: "blocA", face: "top" },
            { wrap: "poulie", side: "auto" },
          ],
        },
        // corde côté masse suspendue : strictement verticale (side=right)
        {
          id: "cordeB", type: "rope",
          path: [
            { wrap: "poulie", side: "right" },
            { kind: "face", id: "blocB", face: "top" },
          ],
        },
      ],
    } as any,
  },
  {
    key: "atwood",
    label: "Machine d'Atwood (cordes verticales tendues)",
    schema: {
      frame: { origin: { x: 0, y: 0 }, unit: "m", scale: 100, yAxis: "up", viewport: { x: -1.5, y: -0.5, w: 5, h: 4.5 } },
      components: [
        { id: "support", type: "wall", at: { x: 1, y: 3.5 }, params: { height: 0.05, thickness: 0.05, side: "left" } },
        { id: "poulie", type: "pulley", at: { x: 1, y: 3.3 }, params: { radius: 0.25 }, label: "P" },
        // m1 décalé légèrement à gauche, m2 décalé à droite (jamais sous la poulie pour éviter chevauchement)
        { id: "m1", type: "block", at: { x: 0.75, y: 1.4 }, params: { w: 0.5, h: 0.5, mass: 2 }, label: "m₁", autoForces: ["P"] },
        { id: "m2", type: "block", at: { x: 1.25, y: 2.0 }, params: { w: 0.5, h: 0.5, mass: 3 }, label: "m₂", autoForces: ["P"] },
        // Système poulie + 2 cordes verticales + arc supérieur en un seul composant
        {
          id: "systeme", type: "pulley_rope_system",
          pulley: "poulie",
          leftAttach: { kind: "face", id: "m1", face: "top" },
          rightAttach: { kind: "face", id: "m2", face: "top" },
        },
      ],
    } as any,
  },
  {
    key: "spring_mass",
    label: "Ressort horizontal + masse (alignés)",
    schema: {
      frame: { origin: { x: 0, y: 0 }, unit: "m", scale: 100, yAxis: "up", viewport: { x: -0.5, y: -0.5, w: 5, h: 3 } },
      components: [
        { id: "sol", type: "ground", at: { x: 2, y: 0 }, params: { length: 4.5, thickness: 0.05 } },
        // Mur de hauteur 1 → surface(0.5) à y=0.5
        { id: "mur", type: "wall", at: { x: 0.2, y: 0 }, params: { height: 1, thickness: 0.05, side: "left" } },
        // Bloc h=1 → face_left_center.y = 0.5 (parfaitement aligné avec le mur)
        { id: "bloc", type: "block", at: { x: 2.5, y: 0 }, params: { w: 0.6, h: 1, mass: 2 }, label: "m", autoForces: ["P", "N"] },
        {
          id: "ressort", type: "spring",
          from: { kind: "curve", id: "mur", curve: "surface", t: 0.5 },
          to: { kind: "face", id: "bloc", face: "left" },
          params: { coils: 10, width: 0.12 },
        },
        { id: "F", type: "force", at: { ref: "bloc.cog" }, vector: { direction: "right", magnitude: 30 }, label: "F" },
        { id: "x", type: "axis", at: { x: 1.5, y: 1.6 }, params: { angle: 0, length: 1, name: "x" } },
      ],
      constraints: [
        { type: "horizontal", object: "ressort" },
      ],
    } as any,
  },
];
