import { useMemo } from "react";
import type { Schema, Point } from "@/types/schema";
import { resolveSchema, resolvePoint } from "@/engine/resolver";
import { worldToScreen, worldLen } from "@/engine/frame";
import { buildRopePath, ropePathToSVG, ropeWaypointsFromSpec } from "@/engine/ropes";

interface Props {
  schema: Schema;
  className?: string;
}

/**
 * Mini-rendu non-interactif pour la galerie de la landing.
 * Auto-fit du viewport sur le contenu, sans grille ni axes.
 */
export default function SchemaThumbnail({ schema, className }: Props) {
  const { resolved, autoForces, fitFrame } = useMemo(() => {
    const r = resolveSchema(schema);
    // Compute bounding box from resolved origins + simple data
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const res of r.resolved.values()) {
      const pts: Point[] = [res.origin];
      for (const a of Object.values(res.anchors)) {
        if (a && typeof a !== "function" && typeof (a as any).x === "number") pts.push(a as Point);
      }
      for (const p of pts) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
    }
    if (!isFinite(minX)) { minX = -1; maxX = 6; minY = -0.5; maxY = 4; }
    const padX = (maxX - minX) * 0.1 + 0.3;
    const padY = (maxY - minY) * 0.1 + 0.3;
    const fit = {
      ...schema.frame,
      viewport: { x: minX - padX, y: minY - padY, w: (maxX - minX) + 2 * padX, h: (maxY - minY) + 2 * padY },
      scale: 60,
    };
    return { resolved: r.resolved, autoForces: r.autoForces, fitFrame: fit };
  }, [schema]);

  const frame = fitFrame as any;
  const W2S = (p: Point) => worldToScreen(p, frame);
  const L = (l: number) => worldLen(l, frame);
  const yAxisUp = frame.yAxis === "up";

  const vbW = frame.viewport.w * frame.scale;
  const vbH = frame.viewport.h * frame.scale;

  const stroke = "hsl(var(--foreground))";

  const els: JSX.Element[] = [];

  for (const r of resolved.values()) {
    const c: any = r.raw;
    if (r.type === "ground") {
      const left = W2S(r.anchors.left as Point), right = W2S(r.anchors.right as Point);
      els.push(<line key={r.id} x1={left.x} y1={left.y} x2={right.x} y2={right.y} stroke={stroke} strokeWidth={1.2} />);
    } else if (r.type === "wall") {
      const b = W2S(r.anchors.bottom as Point), t = W2S(r.anchors.top as Point);
      els.push(<line key={r.id} x1={b.x} y1={b.y} x2={t.x} y2={t.y} stroke={stroke} strokeWidth={1.2} />);
    } else if (r.type === "incline") {
      const foot = W2S(r.anchors.foot as Point), top = W2S(r.anchors.top as Point);
      const base = { x: top.x, y: foot.y };
      els.push(
        <path key={r.id} d={`M ${foot.x} ${foot.y} L ${top.x} ${top.y} L ${base.x} ${base.y} Z`}
          fill="hsl(var(--muted))" fillOpacity={0.18} stroke={stroke} strokeWidth={1} />,
      );
    } else if (r.type === "block") {
      const corners = r.data.corners;
      const bl = W2S(corners.bl), br = W2S(corners.br), tr = W2S(corners.tr), tl = W2S(corners.tl);
      els.push(
        <polygon key={r.id} points={`${bl.x},${bl.y} ${br.x},${br.y} ${tr.x},${tr.y} ${tl.x},${tl.y}`}
          fill="hsl(var(--card))" stroke={stroke} strokeWidth={1} />,
      );
    } else if (r.type === "sphere") {
      const c2 = W2S(r.origin);
      els.push(<circle key={r.id} cx={c2.x} cy={c2.y} r={L(r.data.r)} fill="hsl(var(--card))" stroke={stroke} strokeWidth={1} />);
    } else if (r.type === "pulley") {
      const c2 = W2S(r.origin);
      const rad = L(r.data.r);
      els.push(<g key={r.id}>
        <circle cx={c2.x} cy={c2.y} r={rad} fill="hsl(var(--card))" stroke={stroke} strokeWidth={1} />
        <circle cx={c2.x} cy={c2.y} r={rad * 0.25} fill={stroke} />
      </g>);
    } else if (r.type === "rope") {
      const path = c.path ?? [];
      const entries = path.map((p: any) => {
        if (p && typeof p === "object" && "wrap" in p) return p;
        return { kind: "point" as const, p: resolvePoint(p, resolved) };
      });
      const wp = ropeWaypointsFromSpec(entries, (id: string) => resolved.get(id));
      const rp = buildRopePath(wp);
      const d = ropePathToSVG(rp, W2S, L, yAxisUp);
      if (d) els.push(<path key={r.id} d={d} fill="none" stroke={stroke} strokeWidth={1} />);
    } else if (r.type === "pulley_rope_system") {
      const pulley = resolved.get(c.pulley);
      if (pulley) {
        const rad = pulley.data.r;
        const lA = W2S({ x: pulley.origin.x - rad, y: pulley.origin.y });
        const rA = W2S({ x: pulley.origin.x + rad, y: pulley.origin.y });
        const leftAttach = resolvePoint(c.leftAttach, resolved);
        const rightAttach = resolvePoint(c.rightAttach, resolved);
        const lB = W2S({ x: pulley.origin.x - rad, y: leftAttach.y });
        const rB = W2S({ x: pulley.origin.x + rad, y: rightAttach.y });
        const radPx = L(rad);
        const sweepFlag = yAxisUp ? 0 : 1;
        els.push(<g key={r.id}>
          <path d={`M ${lA.x} ${lA.y} A ${radPx} ${radPx} 0 0 ${sweepFlag} ${rA.x} ${rA.y}`}
            fill="none" stroke={stroke} strokeWidth={1} />
          <line x1={lA.x} y1={lA.y} x2={lB.x} y2={lB.y} stroke={stroke} strokeWidth={1} />
          <line x1={rA.x} y1={rA.y} x2={rB.x} y2={rB.y} stroke={stroke} strokeWidth={1} />
        </g>);
      }
    } else if (r.type === "spring") {
      const fromW = resolvePoint(c.from, resolved);
      const toW = resolvePoint(c.to, resolved);
      const A = W2S(fromW), B = W2S(toW);
      els.push(<line key={r.id} x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={stroke} strokeWidth={1} strokeDasharray="3 2" />);
    } else if (r.type === "pendulum") {
      const pivot = resolvePoint(c.pivot, resolved);
      const angleRad = ((c.params.angle ?? 20) * Math.PI) / 180;
      const len = c.params.length;
      const bob = { x: pivot.x + Math.sin(angleRad) * len, y: pivot.y - Math.cos(angleRad) * len };
      const P = W2S(pivot), B = W2S(bob);
      els.push(<g key={r.id}>
        <line x1={P.x} y1={P.y} x2={B.x} y2={B.y} stroke={stroke} strokeWidth={1} />
        <circle cx={B.x} cy={B.y} r={L(c.params.bobRadius ?? 0.15)} fill="hsl(var(--card))" stroke={stroke} strokeWidth={1} />
      </g>);
    }
  }

  for (const af of autoForces) {
    const a = W2S(af.at);
    const b = W2S({ x: af.at.x + af.dx, y: af.at.y + af.dy });
    els.push(<line key={`af-${af.id}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={af.color} strokeWidth={1.2} opacity={0.85} />);
  }

  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className={className} preserveAspectRatio="xMidYMid meet">
      {els}
    </svg>
  );
}
