import type { Schema } from "@/types/schema";

export interface ExampleEntry {
  key: string;
  label: string;
  category: "Surfaces" | "Liaisons" | "Oscillateurs" | "Combinés";
  schema: Schema;
}

export const EXAMPLES: ExampleEntry[] = [
  // ─── Surfaces ────────────────────────────────────────────────────────────
  {
    key: "incline_block",
    label: "Bloc sur plan incliné (projections complètes)",
    category: "Surfaces",
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
        { id: "frame_bloc", type: "local_frame", of: "bloc", origin: "cog", mode: "surface_aligned", axes: ["x'", "y'"], length: 1.6, bidirectional: true },
        { id: "P_user", type: "force", at: { ref: "bloc.cog" }, vector: { dx: 0, dy: -1 }, label: "P" },
        { id: "proj_P", type: "projection", force: "P_user", onto: "bloc.frame", components: ["x", "y"], labels: ["Px", "Py"], showRectangle: true },
        { id: "alpha", type: "angle_arc", at: { ref: "plan.foot" }, params: { from: 0, to: 30, radius: 0.5 }, label: "α" },
      ],
    } as any,
  },

  // ─── Liaisons ────────────────────────────────────────────────────────────
  {
    key: "pulley_incline",
    label: "Poulie au sommet d'un plan + masse suspendue",
    category: "Liaisons",
    schema: {
      frame: { origin: { x: 0, y: 0 }, unit: "m", scale: 80, yAxis: "up", viewport: { x: -1, y: -0.5, w: 8, h: 5.2 } },
      components: [
        { id: "sol", type: "ground", at: { x: 3, y: 0 }, params: { length: 7, thickness: 0.05 } },
        { id: "plan", type: "incline", anchor: { ref: "sol.surface", t: 0.2 }, params: { angle: 35, length: 3.5, thickness: 0.05, direction: "right" } },
        // Poulie au sommet du plan, légèrement décalée pour que la corde sorte naturellement
        { id: "poulie", type: "pulley", anchor: { ref: "plan.top", offset: { x: 0.15, y: 0.22 } }, params: { radius: 0.18 }, label: "P" },
        // Bloc sur le plan, corde sortant de la face droite (côté haut, vers la poulie)
        {
          id: "blocA", type: "block",
          anchor: { kind: "curve", id: "plan", curve: "surface", t: 0.5 },
          rotation: "auto",
          params: { w: 0.5, h: 0.35, mass: 4 },
          label: "A",
          autoForces: ["P", "N"],
        },
        // Bloc B suspendu, ALIGNÉ verticalement sous le côté droit de la poulie (corde verticale)
        // Position calculée : poulie ≈ (5.4, 2.6), rayon=0.18 → bloc B à x ≈ 5.58
        { id: "blocB", type: "block", at: { x: 5.58, y: 1.0 }, params: { w: 0.5, h: 0.5, mass: 3 }, label: "B", autoForces: ["P"] },
        // Corde côté plan : tangente automatique vers le bloc A (le moteur choisit la "bonne" tangente)
        {
          id: "cordeA", type: "rope",
          path: [
            { kind: "face", id: "blocA", face: "right" },
            { wrap: "poulie", side: "auto" },
          ],
        },
        // Corde côté masse pendue : verticale stricte (side=right)
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
    label: "Machine d'Atwood (deux masses + poulie)",
    category: "Liaisons",
    schema: {
      frame: { origin: { x: 0, y: 0 }, unit: "m", scale: 100, yAxis: "up", viewport: { x: -1.5, y: -0.5, w: 5, h: 4.5 } },
      components: [
        { id: "support", type: "wall", at: { x: 1, y: 3.5 }, params: { height: 0.05, thickness: 0.05, side: "left" } },
        { id: "poulie", type: "pulley", at: { x: 1, y: 3.3 }, params: { radius: 0.25 }, label: "P" },
        // m1 décalé légèrement à gauche, m2 à droite — alignés sous les côtés gauche/droit de la poulie
        { id: "m1", type: "block", at: { x: 0.75, y: 1.4 }, params: { w: 0.5, h: 0.5, mass: 2 }, label: "m₁", autoForces: ["P"] },
        { id: "m2", type: "block", at: { x: 1.25, y: 2.0 }, params: { w: 0.5, h: 0.5, mass: 3 }, label: "m₂", autoForces: ["P"] },
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
    key: "two_blocks_pulley",
    label: "Deux blocs reliés par poulie au bord (table)",
    category: "Liaisons",
    schema: {
      frame: { origin: { x: 0, y: 0 }, unit: "m", scale: 90, yAxis: "up", viewport: { x: -1, y: -1.5, w: 7, h: 5 } },
      components: [
        { id: "table", type: "ground", at: { x: 2, y: 1.5 }, params: { length: 4, thickness: 0.08 } },
        { id: "sol", type: "ground", at: { x: 2, y: -0.5 }, params: { length: 6, thickness: 0.05 } },
        { id: "poulie", type: "pulley", at: { x: 4.05, y: 1.7 }, params: { radius: 0.18 }, label: "P" },
        { id: "blocA", type: "block", at: { x: 2.5, y: 1.5 }, params: { w: 0.6, h: 0.4, mass: 3 }, label: "A", autoForces: ["P", "N"] },
        { id: "blocB", type: "block", at: { x: 4.23, y: 0.4 }, params: { w: 0.5, h: 0.5, mass: 2 }, label: "B", autoForces: ["P"] },
        // Corde A : du bloc A horizontal → poulie (tangente auto)
        {
          id: "cordeA", type: "rope",
          path: [
            { kind: "face", id: "blocA", face: "right" },
            { wrap: "poulie", side: "auto" },
          ],
        },
        // Corde B : verticale stricte
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

  // ─── Oscillateurs ────────────────────────────────────────────────────────
  {
    key: "spring_mass",
    label: "Ressort horizontal mur ↔ bloc",
    category: "Oscillateurs",
    schema: {
      frame: { origin: { x: 0, y: 0 }, unit: "m", scale: 100, yAxis: "up", viewport: { x: -0.5, y: -0.5, w: 5, h: 3 } },
      components: [
        { id: "sol", type: "ground", at: { x: 2, y: 0 }, params: { length: 4.5, thickness: 0.05 } },
        { id: "mur", type: "wall", at: { x: 0.2, y: 0 }, params: { height: 1, thickness: 0.05, side: "left" } },
        { id: "bloc", type: "block", at: { x: 2.5, y: 0 }, params: { w: 0.6, h: 1, mass: 2 }, label: "m", autoForces: ["P", "N"] },
        {
          id: "ressort", type: "spring",
          from: { kind: "curve", id: "mur", curve: "surface", t: 0.5 },
          to: { kind: "face", id: "bloc", face: "left" },
          params: { coils: 10, width: 0.12 },
        },
      ],
      constraints: [
        { type: "horizontal", object: "ressort" },
      ],
    } as any,
  },

  {
    key: "double_spring",
    label: "Bloc entre deux ressorts (mur ↔ bloc ↔ mur)",
    category: "Oscillateurs",
    schema: {
      frame: { origin: { x: 0, y: 0 }, unit: "m", scale: 90, yAxis: "up", viewport: { x: -0.5, y: -0.5, w: 7, h: 3 } },
      components: [
        { id: "sol", type: "ground", at: { x: 3, y: 0 }, params: { length: 6.5, thickness: 0.05 } },
        { id: "murG", type: "wall", at: { x: 0.2, y: 0 }, params: { height: 1, thickness: 0.05, side: "left" } },
        { id: "murD", type: "wall", at: { x: 5.8, y: 0 }, params: { height: 1, thickness: 0.05, side: "right" } },
        { id: "bloc", type: "block", at: { x: 3, y: 0 }, params: { w: 0.7, h: 1, mass: 2 }, label: "m", autoForces: ["P", "N"] },
        {
          id: "ressortG", type: "spring",
          from: { kind: "curve", id: "murG", curve: "surface", t: 0.5 },
          to: { kind: "face", id: "bloc", face: "left" },
          params: { coils: 8, width: 0.1 },
        },
        {
          id: "ressortD", type: "spring",
          from: { kind: "face", id: "bloc", face: "right" },
          to: { kind: "curve", id: "murD", curve: "surface", t: 0.5 },
          params: { coils: 8, width: 0.1 },
        },
      ],
      constraints: [
        { type: "horizontal", object: "ressortG" },
        { type: "horizontal", object: "ressortD" },
      ],
    } as any,
  },

  {
    key: "vertical_spring",
    label: "Ressort vertical + masse suspendue",
    category: "Oscillateurs",
    schema: {
      frame: { origin: { x: 0, y: 0 }, unit: "m", scale: 100, yAxis: "up", viewport: { x: -1, y: -0.5, w: 4, h: 4.5 } },
      components: [
        { id: "plafond", type: "ground", at: { x: 1, y: 3.8 }, params: { length: 2, thickness: 0.05 } },
        { id: "bloc", type: "block", at: { x: 1, y: 1.0 }, params: { w: 0.6, h: 0.5, mass: 2 }, label: "m", autoForces: ["P"] },
        {
          id: "ressort", type: "spring",
          from: { x: 1, y: 3.8 },
          to: { kind: "face", id: "bloc", face: "top" },
          params: { coils: 10, width: 0.12 },
        },
      ],
      constraints: [
        { type: "vertical", object: "ressort" },
      ],
    } as any,
  },

  {
    key: "simple_pendulum",
    label: "Pendule simple",
    category: "Oscillateurs",
    schema: {
      frame: { origin: { x: 0, y: 0 }, unit: "m", scale: 110, yAxis: "up", viewport: { x: -1, y: -0.5, w: 4, h: 4 } },
      components: [
        { id: "plafond", type: "ground", at: { x: 1.5, y: 3.2 }, params: { length: 2.5, thickness: 0.05 } },
        { id: "pendule", type: "pendulum", pivot: { x: 1.5, y: 3.2 }, params: { length: 2, angle: 25, bobRadius: 0.18, mass: 1 }, label: "m" },
      ],
    } as any,
  },

  // ─── Combinés ───────────────────────────────────────────────────────────
  {
    key: "spring_on_incline",
    label: "Bloc sur plan incliné retenu par ressort",
    category: "Combinés",
    schema: {
      frame: { origin: { x: 0, y: 0 }, unit: "m", scale: 90, yAxis: "up", viewport: { x: -1, y: -0.5, w: 7, h: 4.5 } },
      components: [
        { id: "sol", type: "ground", at: { x: 2.5, y: 0 }, params: { length: 6.5, thickness: 0.05 } },
        { id: "plan", type: "incline", anchor: { ref: "sol.surface", t: 0.25 }, params: { angle: 25, length: 4, thickness: 0.05, direction: "right" } },
        {
          id: "bloc", type: "block",
          anchor: { kind: "curve", id: "plan", curve: "surface", t: 0.6 },
          rotation: "auto",
          params: { w: 0.55, h: 0.4, mass: 3 },
          label: "m",
          autoForces: ["P", "N"],
        },
        // Ressort le long du plan, ancré au sommet
        {
          id: "ressort", type: "spring",
          from: { ref: "plan.top" },
          to: { kind: "face", id: "bloc", face: "right" },
          params: { coils: 8, width: 0.1 },
        },
      ],
    } as any,
  },
];
