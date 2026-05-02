import type { Schema, Animation } from "@/types/schema";
import type { ResolveResult } from "./resolver";

/**
 * Auto-generate a physically meaningful animation from any schema.
 * Phases (sequential):
 *   t=0     : structures statiques (sol, mur, plan, poulie, ressort, corde, pendule)
 *   t=0.6   : solides (block, sphere)
 *   t=1.4   : repères locaux
 *   t=2.0   : forces, projections
 *   t=3.0   : mouvement déduit (oscillation, glissement, Atwood, pendule…)
 */
export function generateAutoAnimation(schema: Schema, resolved: ResolveResult): Animation {
  const STATIC = new Set([
    "ground", "wall", "incline", "pulley", "rope", "pulley_rope_system",
    "spring", "rigid_rod", "axis", "angle_arc", "label", "dimension",
  ]);
  const SOLIDS = new Set(["block", "sphere", "pendulum"]);
  const FRAMES = new Set(["local_frame"]);
  const FORCES = new Set(["force", "velocity", "acceleration", "projection"]);

  const groups = { staticIds: [] as string[], solidIds: [] as string[], frameIds: [] as string[], forceIds: [] as string[] };

  for (const c of schema.components) {
    if (STATIC.has(c.type)) groups.staticIds.push(c.id);
    else if (SOLIDS.has(c.type)) groups.solidIds.push(c.id);
    else if (FRAMES.has(c.type)) groups.frameIds.push(c.id);
    else if (FORCES.has(c.type)) groups.forceIds.push(c.id);
  }

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

  const moveStart = 3.0;
  const moveDur = 4.0;
  let needsMove = false;

  // ─── Détection des scénarios de mouvement ────────────────────────────────

  // 1. Pendule simple
  for (const c of schema.components) {
    if (c.type !== "pendulum") continue;
    const cc: any = c;
    const angle0 = cc.params?.angle ?? 20;
    steps.push({
      at: moveStart,
      animate: {
        id: c.id,
        mode: "rotate",
        amplitude: angle0,
        cycles: 2.5,
        duration: moveDur,
      },
    });
    needsMove = true;
  }

  // 2. Atwood : pulley_rope_system avec 2 blocs
  for (const c of schema.components) {
    if (c.type !== "pulley_rope_system") continue;
    const cc: any = c;
    const leftId = cc.leftAttach?.id ?? cc.leftAttach?.ref?.split(".")[0];
    const rightId = cc.rightAttach?.id ?? cc.rightAttach?.ref?.split(".")[0];
    if (!leftId || !rightId) continue;
    const lComp = schema.components.find((x) => x.id === leftId) as any;
    const rComp = schema.components.find((x) => x.id === rightId) as any;
    if (!lComp || !rComp) continue;
    const mL = lComp.params?.mass ?? 1;
    const mR = rComp.params?.mass ?? 1;
    if (Math.abs(mL - mR) < 1e-6) continue;
    const heavyDown = mL > mR ? leftId : rightId;
    const lightUp = mL > mR ? rightId : leftId;
    // Amplitude raisonnable : 0.5 m
    steps.push({ at: moveStart, animate: { id: heavyDown, mode: "translate", axis: "y", from: 0, to: -0.5, duration: moveDur } });
    steps.push({ at: moveStart, animate: { id: lightUp, mode: "translate", axis: "y", from: 0, to: 0.5, duration: moveDur } });
    needsMove = true;
  }

  // 3. Bloc sur incline (existant amélioré) — couplage avec masse pendue détecté
  for (const c of schema.components) {
    if (c.type !== "block") continue;
    const cc: any = c;
    const ref = cc.anchor ?? cc.at;
    if (!ref || typeof ref !== "object") continue;
    const targetId =
      ref.kind === "curve" || ref.kind === "face" || ref.kind === "point"
        ? ref.id
        : ref.ref ? String(ref.ref).split(".")[0] : null;
    if (!targetId) continue;
    const target = resolved.resolved.get(targetId);
    if (!target || target.type !== "incline") continue;
    const tStart = ref.kind === "curve" ? ref.t : (typeof ref.t === "number" ? ref.t : 0.55);
    // Détection : ce bloc est-il relié par corde à une poulie + masse pendue ?
    const linkedToHangingMass = isLinkedToHangingMass(c.id, schema);
    const tEnd = linkedToHangingMass ? Math.min(0.9, tStart + 0.3) : 0.05;
    steps.push({
      at: moveStart,
      animate: { id: c.id, along: `${targetId}.surface`, from: tStart, to: tEnd, duration: moveDur },
    });
    if (linkedToHangingMass) {
      // Trouver la masse suspendue → la fait descendre
      const hanging = findHangingMass(c.id, schema);
      if (hanging) {
        steps.push({ at: moveStart, animate: { id: hanging, mode: "translate", axis: "y", from: 0, to: -0.4, duration: moveDur } });
      }
    }
    needsMove = true;
  }

  // 4. Ressorts horizontaux/verticaux : oscillation du bloc lié
  for (const c of schema.components) {
    if (c.type !== "spring") continue;
    const cc: any = c;
    const targets = [refTargetId(cc.from), refTargetId(cc.to)].filter(Boolean) as string[];
    for (const tid of targets) {
      const tComp = schema.components.find((x) => x.id === tid);
      if (!tComp || tComp.type !== "block") continue;
      // Skip if this block is already animated
      if (steps.some((s) => s.animate?.id === tid)) continue;
      // Determine spring axis from resolved geometry
      const fromR = resolveAnchorWorld(cc.from, resolved);
      const toR = resolveAnchorWorld(cc.to, resolved);
      if (!fromR || !toR) continue;
      const dx = toR.x - fromR.x;
      const dy = toR.y - fromR.y;
      const horizontal = Math.abs(dx) >= Math.abs(dy);
      steps.push({
        at: moveStart,
        animate: {
          id: tid,
          mode: "oscillate",
          axis: horizontal ? "x" : "y",
          amplitude: 0.25,
          cycles: 2.5,
          duration: moveDur,
        },
      });
      needsMove = true;
    }
  }

  // 5. 2 blocs reliés par corde + poulie au bord (table) : un horizontal, un vertical
  // Détection : corde liant un bloc avec face=right/left (sur une table) à un bloc avec face=top (pendu)
  for (const c of schema.components) {
    if (c.type !== "rope") continue;
    const cc: any = c;
    if (!Array.isArray(cc.path) || cc.path.length < 2) continue;
    const horizBlock = findFaceBlock(cc.path, ["right", "left"], schema);
    const vertBlock = findFaceBlock(cc.path, ["top"], schema);
    if (horizBlock && vertBlock && horizBlock !== vertBlock) {
      // Vérifier qu'ils ne sont pas déjà animés
      if (!steps.some((s) => s.animate?.id === horizBlock) && !steps.some((s) => s.animate?.id === vertBlock)) {
        // Direction du glissement horizontal : vers la poulie
        const horizComp = schema.components.find((x) => x.id === horizBlock) as any;
        const vertComp = schema.components.find((x) => x.id === vertBlock) as any;
        const horizR = resolved.resolved.get(horizBlock);
        const vertR = resolved.resolved.get(vertBlock);
        // Trouver la poulie
        const wrapEntry = cc.path.find((p: any) => p && p.wrap);
        const pulley = wrapEntry ? resolved.resolved.get(wrapEntry.wrap) : null;
        let slideDx = 0.6;
        if (horizR && pulley) slideDx = pulley.origin.x - horizR.origin.x > 0 ? 0.6 : -0.6;
        steps.push({ at: moveStart, animate: { id: horizBlock, mode: "translate", axis: "x", from: 0, to: slideDx, duration: moveDur } });
        steps.push({ at: moveStart, animate: { id: vertBlock, mode: "translate", axis: "y", from: 0, to: -0.6, duration: moveDur } });
        needsMove = true;
      }
    }
  }

  const duration = needsMove ? moveStart + moveDur + 0.5 : 4.0;

  return {
    duration,
    autoplay: false,
    steps,
    initiallyHidden,
  };
}

function refTargetId(v: any): string | null {
  if (!v || typeof v !== "object") return null;
  if ("kind" in v && (v.kind === "face" || v.kind === "point" || v.kind === "curve" || v.kind === "normal")) return v.id;
  if ("ref" in v) return String(v.ref).split(".")[0];
  return null;
}

function resolveAnchorWorld(ref: any, resolved: ResolveResult) {
  const id = refTargetId(ref);
  if (!id) {
    if (ref && typeof ref.x === "number" && typeof ref.y === "number") return { x: ref.x, y: ref.y };
    return null;
  }
  const r = resolved.resolved.get(id);
  return r?.origin ?? null;
}

function isLinkedToHangingMass(blockId: string, schema: Schema): boolean {
  for (const c of schema.components) {
    if (c.type !== "rope") continue;
    const cc: any = c;
    if (!Array.isArray(cc.path)) continue;
    const refs = cc.path.map((p: any) => p?.id ?? null);
    if (!refs.includes(blockId)) continue;
    // a wrap (pulley) AND another face=top block elsewhere = hanging
    if (cc.path.some((p: any) => p?.wrap)) return true;
  }
  return false;
}

function findHangingMass(blockId: string, schema: Schema): string | null {
  for (const c of schema.components) {
    if (c.type !== "rope") continue;
    const cc: any = c;
    if (!Array.isArray(cc.path)) continue;
    for (const p of cc.path) {
      if (p?.kind === "face" && p.face === "top" && p.id !== blockId) {
        const tComp = schema.components.find((x) => x.id === p.id);
        if (tComp?.type === "block") return p.id;
      }
    }
  }
  // Try other ropes (e.g. blocA in rope1, blocB in rope2)
  return null;
}

function findFaceBlock(path: any[], faces: string[], schema: Schema): string | null {
  for (const p of path) {
    if (p?.kind === "face" && faces.includes(p.face)) {
      const c = schema.components.find((x) => x.id === p.id);
      if (c?.type === "block") return p.id;
    }
  }
  return null;
}
