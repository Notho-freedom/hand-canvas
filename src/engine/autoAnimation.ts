import type { Schema, Animation, AnimationStepSchema } from "@/types/schema";
import type { ResolveResult } from "./resolver";

/**
 * Génère une animation par défaut depuis le schéma résolu si aucune n'est fournie.
 * Logique :
 *  - étape 1 (t=0)   : structures statiques (sol, mur, plan, poulie, ressort, corde, pendule)
 *  - étape 2 (t=0.6) : solides (block, sphere)
 *  - étape 3 (t=1.4) : repères locaux
 *  - étape 4 (t=2.0) : forces (incl. autoForces) et projections
 *  - étape 5 (t=3.0) : mouvement déduit (glissement bloc sur incline, oscillation ressort)
 */
export function generateAutoAnimation(schema: Schema, resolved: ResolveResult): Animation {
  const STATIC = new Set(["ground", "wall", "incline", "pulley", "rope", "pulley_rope_system", "spring", "rigid_rod", "axis", "angle_arc", "label", "dimension", "pendulum"]);
  const SOLIDS = new Set(["block", "sphere"]);
  const FRAMES = new Set(["local_frame"]);
  const FORCES = new Set(["force", "velocity", "acceleration", "projection"]);

  const groups = { staticIds: [] as string[], solidIds: [] as string[], frameIds: [] as string[], forceIds: [] as string[] };

  for (const c of schema.components) {
    if (STATIC.has(c.type)) groups.staticIds.push(c.id);
    else if (SOLIDS.has(c.type)) groups.solidIds.push(c.id);
    else if (FRAMES.has(c.type)) groups.frameIds.push(c.id);
    else if (FORCES.has(c.type)) groups.forceIds.push(c.id);
  }

  // Tout est masqué initialement sauf le frame du repère monde (déjà dessiné par axes)
  const initiallyHidden = [
    ...groups.staticIds,
    ...groups.solidIds,
    ...groups.frameIds,
    ...groups.forceIds,
  ];

  const steps: any[] = [];
  if (groups.staticIds.length) steps.push({ at: 0, show: groups.staticIds });
  if (groups.solidIds.length) steps.push({ at: 0.6, show: groups.solidIds });
  if (groups.frameIds.length) steps.push({ at: 1.4, show: groups.frameIds });
  if (groups.forceIds.length) steps.push({ at: 2.0, show: groups.forceIds });

  // Mouvement déduit : un bloc sur incline glisse vers le bas
  let duration = 4.0;
  for (const c of schema.components) {
    if (c.type !== "block") continue;
    const cc: any = c;
    const ref = cc.anchor ?? cc.at;
    if (!ref || typeof ref !== "object") continue;
    const targetId = ref.kind ? ref.id : (ref.ref ? String(ref.ref).split(".")[0] : null);
    if (!targetId) continue;
    const target = resolved.resolved.get(targetId);
    if (!target) continue;
    if (target.type === "incline") {
      const tStart = ref.kind === "curve" ? ref.t : (typeof ref.t === "number" ? ref.t : 0.55);
      steps.push({
        at: 3.0,
        animate: { id: c.id, along: `${targetId}.surface`, from: tStart, to: 0.05, duration: 2.5 },
      });
      duration = 6.0;
    }
  }

  return {
    duration,
    autoplay: false,
    steps,
    initiallyHidden,
  };
}
