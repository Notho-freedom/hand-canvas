import { useMemo } from "react";
import type { Schema, Point } from "@/types/schema";
import { resolveSchema, resolvePoint } from "@/engine/resolver";
import { worldToScreen, viewBox, worldLen } from "@/engine/frame";
import { buildRopePath, ropePathToSVG, ropeWaypointsFromSpec } from "@/engine/ropes";
import { norm, sub, dot, snap } from "@/engine/geometry";
import Frame from "./Frame";
import type { AnimationState } from "@/hooks/useAnimation";

interface Props {
  schema: Schema;
  showAxes: boolean;
  showGrid: boolean;
  showLabels: boolean;
  showAnchors: boolean;
  animState?: AnimationState;
  initiallyHidden?: string[];
}

export default function SchemaCanvas({ schema, showAxes, showGrid, showLabels, showAnchors, animState, initiallyHidden: initiallyHiddenProp }: Props) {
  // Apply animation overrides to components before resolving
  const effectiveSchema = useMemo(() => {
    if (!animState || animState.overrides.size === 0) return schema;
    const components = schema.components.map((c) => {
      const ov = animState.overrides.get(c.id);
      if (!ov) return c;

      // 1) slide along curve : remplace l'anchor
      if (typeof ov.tValue === "number" && ov.along) {
        const [targetId, curveName] = ov.along.split(".");
        const newAnchor = { kind: "curve" as const, id: targetId, curve: curveName, t: ov.tValue };
        return { ...c, anchor: newAnchor } as any;
      }

      // 2) translate : décale at/anchor d'un offset (dx, dy)
      if ((ov.dx !== undefined || ov.dy !== undefined)) {
        const dx = ov.dx ?? 0;
        const dy = ov.dy ?? 0;
        const cc: any = c;
        const target = cc.at ?? cc.anchor;
        if (target && typeof target === "object") {
          if (typeof target.x === "number" && typeof target.y === "number") {
            const next = { ...target, x: target.x + dx, y: target.y + dy };
            return cc.at ? { ...cc, at: next } : { ...cc, anchor: next };
          }
          // ref-based : on ajoute/écrase un offset cumulatif
          const prevOff = target.offset ?? { x: 0, y: 0 };
          const newOff = { x: prevOff.x + dx, y: prevOff.y + dy };
          const next = { ...target, offset: newOff };
          return cc.at ? { ...cc, at: next } : { ...cc, anchor: next };
        }
        return c;
      }

      // 3) rotate : pour pendule, on override params.angle
      if (typeof ov.angle === "number" && c.type === "pendulum") {
        const cc: any = c;
        return { ...cc, params: { ...cc.params, angle: ov.angle } };
      }
      // rotate pour bloc : ajuste rotation
      if (typeof ov.angle === "number" && c.type === "block") {
        const cc: any = c;
        return { ...cc, rotation: ov.angle };
      }

      return c;
    });
    return { ...schema, components };
  }, [schema, animState?.overrides]);

  const { resolved, order, errors, facts, autoForces } = useMemo(
    () => resolveSchema(effectiveSchema),
    [effectiveSchema],
  );
  const frame = schema.frame;
  const W2S = (p: Point) => worldToScreen(p, frame);
  const L = (l: number) => worldLen(l, frame);
  const yAxisUp = frame.yAxis === "up";

  const initiallyHidden = initiallyHiddenProp ?? (schema as any).animation?.initiallyHidden ?? [];
  const isVisible = (id: string): boolean => {
    if (!animState) return true;
    if (!initiallyHidden.includes(id)) return true;
    return animState.visibleIds.has(id);
  };

  const renderArrow = (
    key: string,
    at: Point,
    dxw: number,
    dyw: number,
    color: string,
    label?: string,
    sw = 1.8,
  ) => {
    const tip = { x: at.x + dxw, y: at.y + dyw };
    const pA = W2S(at);
    const pB = W2S(tip);
    const markerId = `arrow-${key}`;
    const lx = pB.x + (pB.x - pA.x) * 0.05 + 6;
    const ly = pB.y + (pB.y - pA.y) * 0.05 - 4;
    return (
      <g key={key}>
        <defs>
          <marker id={markerId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
          </marker>
        </defs>
        <line x1={pA.x} y1={pA.y} x2={pB.x} y2={pB.y} stroke={color} strokeWidth={sw} markerEnd={`url(#${markerId})`} />
        {label && (
          <text x={lx} y={ly} fontSize={11} fontFamily="monospace" fill={color} fontWeight="bold">{label}</text>
        )}
      </g>
    );
  };

  const renderComp = (id: string) => {
    if (!isVisible(id)) return null;
    const r = resolved.get(id);
    if (!r) return null;
    const c: any = r.raw;
    const stroke = c.style?.stroke ?? "hsl(var(--foreground))";
    const fill = c.style?.fill ?? "hsl(var(--muted))";
    const sw = c.style?.strokeWidth ?? 1.5;
    const op = c.style?.opacity ?? 1;

    switch (r.type) {
      case "ground": {
        const left = W2S(r.anchors.left as Point);
        const right = W2S(r.anchors.right as Point);
        const len = right.x - left.x;
        const hatchSpacing = 8;
        const hatches = [];
        for (let x = 0; x < len; x += hatchSpacing) {
          hatches.push(
            <line key={x} x1={left.x + x} y1={left.y} x2={left.x + x - 6} y2={left.y + 8} stroke={stroke} strokeWidth={0.6} opacity={0.7} />,
          );
        }
        return (
          <g key={id} opacity={op}>
            <line x1={left.x} y1={left.y} x2={right.x} y2={right.y} stroke={stroke} strokeWidth={sw} />
            {hatches}
          </g>
        );
      }
      case "wall": {
        const bottom = W2S(r.anchors.bottom as Point);
        const top = W2S(r.anchors.top as Point);
        const len = bottom.y - top.y;
        const side = r.data.side ?? 1;
        const hatchSpacing = 8;
        const hatches = [];
        for (let y = 0; y < len; y += hatchSpacing) {
          hatches.push(
            <line key={y} x1={bottom.x} y1={top.y + y} x2={bottom.x - 8 * side} y2={top.y + y - 6}
              stroke={stroke} strokeWidth={0.6} opacity={0.7} />,
          );
        }
        return (
          <g key={id} opacity={op}>
            <line x1={bottom.x} y1={bottom.y} x2={top.x} y2={top.y} stroke={stroke} strokeWidth={sw} />
            {hatches}
          </g>
        );
      }
      case "incline": {
        const foot = W2S(r.anchors.foot as Point);
        const top = W2S(r.anchors.top as Point);
        const base = { x: top.x, y: foot.y };
        const path = `M ${foot.x} ${foot.y} L ${top.x} ${top.y} L ${base.x} ${base.y} Z`;
        return (
          <g key={id} opacity={op}>
            <path d={path} fill={fill} fillOpacity={0.18} stroke={stroke} strokeWidth={sw} />
          </g>
        );
      }
      case "block": {
        const corners = r.data.corners;
        const bl = W2S(corners.bl), br = W2S(corners.br), tr = W2S(corners.tr), tl = W2S(corners.tl);
        return (
          <g key={id} opacity={op}>
            <polygon
              points={`${bl.x},${bl.y} ${br.x},${br.y} ${tr.x},${tr.y} ${tl.x},${tl.y}`}
              fill="hsl(var(--card))"
              stroke={stroke}
              strokeWidth={sw}
            />
            {showLabels && c.label && (
              <text x={(bl.x + tr.x) / 2} y={(bl.y + tr.y) / 2 + 4} textAnchor="middle" fontSize={11} fontFamily="monospace" fill={stroke}>
                {c.label}
              </text>
            )}
          </g>
        );
      }
      case "sphere": {
        const c2 = W2S(r.origin);
        return (
          <g key={id} opacity={op}>
            <circle cx={c2.x} cy={c2.y} r={L(r.data.r)} fill="hsl(var(--card))" stroke={stroke} strokeWidth={sw} />
            {showLabels && c.label && (
              <text x={c2.x} y={c2.y + 4} textAnchor="middle" fontSize={11} fontFamily="monospace" fill={stroke}>{c.label}</text>
            )}
          </g>
        );
      }
      case "pulley": {
        const c2 = W2S(r.origin);
        const rad = L(r.data.r);
        return (
          <g key={id} opacity={op}>
            <circle cx={c2.x} cy={c2.y} r={rad} fill="hsl(var(--card))" stroke={stroke} strokeWidth={sw} />
            <circle cx={c2.x} cy={c2.y} r={rad * 0.25} fill={stroke} />
            {showLabels && c.label && (
              <text x={c2.x + rad + 4} y={c2.y + 4} fontSize={11} fontFamily="monospace" fill={stroke}>{c.label}</text>
            )}
          </g>
        );
      }
      case "rope": {
        let entries: any[] = [];
        if (Array.isArray(c.path) && c.path.length) {
          entries = c.path.map((p: any) => {
            if (p && typeof p === "object" && "wrap" in p) return p;
            return { kind: "point" as const, p: resolvePoint(p, resolved) };
          });
        } else {
          if (c.from) entries.push({ kind: "point" as const, p: resolvePoint(c.from, resolved) });
          for (const v of c.via ?? []) entries.push({ kind: "point" as const, p: resolvePoint(v, resolved) });
          if (c.to) entries.push({ kind: "point" as const, p: resolvePoint(c.to, resolved) });
        }
        const waypoints = ropeWaypointsFromSpec(entries, (id: string) => resolved.get(id));
        const path = buildRopePath(waypoints);
        const d = ropePathToSVG(path, W2S, L, yAxisUp);
        if (!d) {
          const pts = entries.filter((e: any) => e.kind === "point").map((e: any) => W2S(e.p));
          const dd = pts.map((p: Point, i: number) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
          return <path key={id} d={dd} fill="none" stroke={stroke} strokeWidth={sw} opacity={op} />;
        }
        return <path key={id} d={d} fill="none" stroke={stroke} strokeWidth={sw} opacity={op} />;
      }
      case "pulley_rope_system": {
        // Generates 2 vertical ropes + top arc on the pulley
        const pulley = resolved.get(c.pulley);
        if (!pulley) return null;
        const rad = pulley.data.r;
        const leftAttachP = resolvePoint(c.leftAttach, resolved);
        const rightAttachP = resolvePoint(c.rightAttach, resolved);
        const leftContact = { x: pulley.origin.x - rad, y: pulley.origin.y };
        const rightContact = { x: pulley.origin.x + rad, y: pulley.origin.y };
        // Force vertical: align attach.x with contact.x
        const leftFrom = { x: leftContact.x, y: leftAttachP.y };
        const rightFrom = { x: rightContact.x, y: rightAttachP.y };

        const lA = W2S(leftContact), lB = W2S(leftFrom);
        const rA = W2S(rightContact), rB = W2S(rightFrom);
        const radPx = L(rad);

        // Top arc: from leftContact (180°) to rightContact (0°), going through top (90° in math)
        // In SVG screen coords with y-flipped, sweep adjusts.
        const arcStart = W2S(leftContact);
        const arcEnd = W2S(rightContact);
        const sweepFlag = yAxisUp ? 0 : 1;

        return (
          <g key={id} opacity={op}>
            <path d={`M ${arcStart.x} ${arcStart.y} A ${radPx} ${radPx} 0 0 ${sweepFlag} ${arcEnd.x} ${arcEnd.y}`}
              fill="none" stroke={stroke} strokeWidth={sw} />
            <line x1={lA.x} y1={lA.y} x2={lB.x} y2={lB.y} stroke={stroke} strokeWidth={sw} />
            <line x1={rA.x} y1={rA.y} x2={rB.x} y2={rB.y} stroke={stroke} strokeWidth={sw} />
          </g>
        );
      }
      case "spring": {
        const fromW = resolvePoint(c.from, resolved);
        const toW = resolvePoint(c.to, resolved);
        const fact = facts.get(id);
        let axis = norm(sub(toW, fromW));
        if (fact?.axis) axis = norm(fact.axis);
        const mid = { x: (fromW.x + toW.x) / 2, y: (fromW.y + toW.y) / 2 };
        const lenAxis = Math.hypot(toW.x - fromW.x, toW.y - fromW.y);
        const a = fact?.axis
          ? { x: snap(mid.x - axis.x * lenAxis / 2), y: snap(mid.y - axis.y * lenAxis / 2) }
          : fromW;
        const b = fact?.axis
          ? { x: snap(mid.x + axis.x * lenAxis / 2), y: snap(mid.y + axis.y * lenAxis / 2) }
          : toW;
        const A = W2S(a), B = W2S(b);
        const coils = c.params?.coils ?? 8;
        const width = L(c.params?.width ?? 0.15);
        const dx = B.x - A.x, dy = B.y - A.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len, uy = dy / len;
        const px = -uy, py = ux;
        const pad = 12;
        const usable = Math.max(0, len - 2 * pad);
        const pts: string[] = [];
        pts.push(`M ${A.x} ${A.y}`);
        pts.push(`L ${A.x + ux * pad} ${A.y + uy * pad}`);
        const seg = usable / coils;
        for (let i = 0; i < coils; i++) {
          const t1 = pad + (i + 0.5) * seg;
          const side = i % 2 === 0 ? 1 : -1;
          pts.push(`L ${A.x + ux * t1 + px * width * side} ${A.y + uy * t1 + py * width * side}`);
        }
        pts.push(`L ${A.x + ux * (pad + usable)} ${A.y + uy * (pad + usable)}`);
        pts.push(`L ${B.x} ${B.y}`);
        return <path key={id} d={pts.join(" ")} fill="none" stroke={stroke} strokeWidth={sw} opacity={op} />;
      }
      case "rigid_rod": {
        const from = W2S(resolvePoint(c.from, resolved));
        const to = W2S(resolvePoint(c.to, resolved));
        return <line key={id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={stroke} strokeWidth={Math.max(2, sw + 1)} opacity={op} />;
      }
      case "force":
      case "velocity":
      case "acceleration": {
        const at = resolvePoint(c.at, resolved);
        const v = c.vector ?? {};
        let dxw = 0, dyw = 0;
        const baseMag = Math.max(0.6, Math.min(2, (v.magnitude ?? 1) / 50));
        if (typeof v.dx === "number" || typeof v.dy === "number") {
          dxw = v.dx ?? 0; dyw = v.dy ?? 0;
        } else if (typeof v.angle === "number") {
          const a = (v.angle * Math.PI) / 180;
          dxw = Math.cos(a) * baseMag;
          dyw = Math.sin(a) * baseMag;
        } else {
          const dir = v.direction ?? "up";
          if (dir === "up") dyw = baseMag;
          else if (dir === "down") dyw = -baseMag;
          else if (dir === "right") dxw = baseMag;
          else if (dir === "left") dxw = -baseMag;
        }
        const colorMap: Record<string, string> = {
          force: "hsl(0, 80%, 60%)",
          velocity: "hsl(140, 70%, 50%)",
          acceleration: "hsl(35, 90%, 55%)",
        };
        const color = c.style?.stroke ?? colorMap[r.type];
        return renderArrow(`${r.type}-${id}`, at, dxw, dyw, color, c.label, sw + 0.5);
      }
      case "axis": {
        const at = resolvePoint(c.at, resolved);
        const a = (c.params.angle * Math.PI) / 180;
        const len = c.params.length;
        const tip = { x: at.x + Math.cos(a) * len, y: at.y + Math.sin(a) * len };
        const pA = W2S(at), pB = W2S(tip);
        const markerId = `arrow-axis-${id}`;
        return (
          <g key={id} opacity={op}>
            <defs>
              <marker id={markerId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill={stroke} />
              </marker>
            </defs>
            <line x1={pA.x} y1={pA.y} x2={pB.x} y2={pB.y} stroke={stroke} strokeWidth={1.2} strokeDasharray="4 3" markerEnd={`url(#${markerId})`} />
            {c.params.name && <text x={pB.x + 5} y={pB.y - 5} fontSize={11} fontFamily="monospace" fill={stroke}>{c.params.name}</text>}
          </g>
        );
      }
      case "angle_arc": {
        const at = resolvePoint(c.at, resolved);
        const a1 = (c.params.from * Math.PI) / 180;
        const a2 = (c.params.to * Math.PI) / 180;
        const N = 24;
        const pts: string[] = [];
        for (let i = 0; i <= N; i++) {
          const a = a1 + ((a2 - a1) * i) / N;
          const wp = { x: at.x + Math.cos(a) * c.params.radius, y: at.y + Math.sin(a) * c.params.radius };
          const sp = W2S(wp);
          pts.push(`${i === 0 ? "M" : "L"} ${sp.x} ${sp.y}`);
        }
        const midA = (a1 + a2) / 2;
        const labelW = { x: at.x + Math.cos(midA) * (c.params.radius + 0.15), y: at.y + Math.sin(midA) * (c.params.radius + 0.15) };
        const lp = W2S(labelW);
        return (
          <g key={id} opacity={op}>
            <path d={pts.join(" ")} fill="none" stroke={stroke} strokeWidth={1} />
            {c.label && <text x={lp.x} y={lp.y} fontSize={11} fontFamily="monospace" fill={stroke} textAnchor="middle">{c.label}</text>}
          </g>
        );
      }
      case "label": {
        const at = resolvePoint(c.at, resolved);
        const off = c.params.offset ?? { x: 0, y: 0 };
        const p = W2S({ x: at.x + off.x, y: at.y + off.y });
        return <text key={id} x={p.x} y={p.y} fontSize={12} fontFamily="monospace" fill={stroke}>{c.params.text}</text>;
      }
      case "dimension": {
        const from = resolvePoint(c.from, resolved);
        const to = resolvePoint(c.to, resolved);
        const off = c.params?.offset ?? 0.3;
        const dx = to.x - from.x, dy = to.y - from.y;
        const d = Math.hypot(dx, dy) || 1;
        const nx = -dy / d, ny = dx / d;
        const fO = { x: from.x + nx * off, y: from.y + ny * off };
        const tO = { x: to.x + nx * off, y: to.y + ny * off };
        const a = W2S(fO), b = W2S(tO);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 4 };
        const text = c.params?.text ?? `${d.toFixed(2)} ${frame.unit}`;
        return (
          <g key={id} opacity={op}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={stroke} strokeWidth={0.8} />
            <line x1={W2S(from).x} y1={W2S(from).y} x2={a.x} y2={a.y} stroke={stroke} strokeWidth={0.5} strokeDasharray="2 2" />
            <line x1={W2S(to).x} y1={W2S(to).y} x2={b.x} y2={b.y} stroke={stroke} strokeWidth={0.5} strokeDasharray="2 2" />
            <text x={mid.x} y={mid.y} fontSize={10} fontFamily="monospace" fill={stroke} textAnchor="middle">{text}</text>
          </g>
        );
      }
      case "local_frame": {
        const obj = resolved.get(c.of);
        if (!obj) return null;
        const originName: string = c.origin ?? "cog";
        const origin = (obj.anchors[originName] as Point) ?? obj.origin;
        const length = c.length ?? 1.2;
        const bidir = c.bidirectional !== false;
        let ux: Point, uy: Point;
        if (c.mode === "world_aligned") {
          ux = { x: 1, y: 0 };
          uy = { x: 0, y: 1 };
        } else {
          ux = obj.data?.tangent ?? { x: 1, y: 0 };
          uy = obj.data?.normal ?? { x: 0, y: 1 };
        }
        const tipXp = { x: origin.x + ux.x * length, y: origin.y + ux.y * length };
        const tipXn = { x: origin.x - ux.x * length, y: origin.y - ux.y * length };
        const tipYp = { x: origin.x + uy.x * length, y: origin.y + uy.y * length };
        const tipYn = { x: origin.x - uy.x * length, y: origin.y - uy.y * length };
        const O = W2S(origin);
        const Xp = W2S(tipXp), Xn = W2S(tipXn);
        const Yp = W2S(tipYp), Yn = W2S(tipYn);
        const mkId = (s: string) => `lf-${id}-${s}`;
        const color = c.style?.stroke ?? "hsl(var(--accent))";
        const labels = c.axes ?? ["x'", "y'"];
        return (
          <g key={id} opacity={op}>
            <defs>
              <marker id={mkId("arr")} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
              </marker>
            </defs>
            {bidir && (
              <line x1={Xn.x} y1={Xn.y} x2={O.x} y2={O.y} stroke={color} strokeWidth={0.8} strokeDasharray="2 3" opacity={0.7} />
            )}
            <line x1={O.x} y1={O.y} x2={Xp.x} y2={Xp.y} stroke={color} strokeWidth={1.1} strokeDasharray="3 2" markerEnd={`url(#${mkId("arr")})`} />
            {bidir && (
              <line x1={Yn.x} y1={Yn.y} x2={O.x} y2={O.y} stroke={color} strokeWidth={0.8} strokeDasharray="2 3" opacity={0.7} />
            )}
            <line x1={O.x} y1={O.y} x2={Yp.x} y2={Yp.y} stroke={color} strokeWidth={1.1} strokeDasharray="3 2" markerEnd={`url(#${mkId("arr")})`} />
            <text x={Xp.x + 4} y={Xp.y + 4} fontSize={10} fontFamily="monospace" fill={color}>{labels[0]}</text>
            <text x={Yp.x + 4} y={Yp.y - 4} fontSize={10} fontFamily="monospace" fill={color}>{labels[1]}</text>
          </g>
        );
      }
      case "projection": {
        const forceComp = effectiveSchema.components.find((cc) => cc.id === c.force) as any;
        if (!forceComp) return null;
        const at = resolvePoint(forceComp.at, resolved);
        const v = forceComp.vector ?? {};
        const baseMag = Math.max(0.6, Math.min(2, (v.magnitude ?? 1) / 50));
        let dxw = 0, dyw = 0;
        if (typeof v.dx === "number" || typeof v.dy === "number") {
          dxw = v.dx ?? 0; dyw = v.dy ?? 0;
        } else if (typeof v.angle === "number") {
          const a = (v.angle * Math.PI) / 180;
          dxw = Math.cos(a) * baseMag; dyw = Math.sin(a) * baseMag;
        } else {
          const dir = v.direction ?? "up";
          if (dir === "up") dyw = baseMag;
          else if (dir === "down") dyw = -baseMag;
          else if (dir === "right") dxw = baseMag;
          else if (dir === "left") dxw = -baseMag;
        }
        const ontoId = String(c.onto).split(".")[0];
        const obj = resolved.get(ontoId);
        if (!obj) return null;
        const ux = obj.data?.tangent ?? { x: 1, y: 0 };
        const uy = obj.data?.normal ?? { x: 0, y: 1 };
        const F = { x: dxw, y: dyw };
        const sx = dot(F, norm(ux));
        const sy = dot(F, norm(uy));
        const labels = c.labels ?? [`${forceComp.label ?? "F"}x`, `${forceComp.label ?? "F"}y`];
        const color = c.style?.stroke ?? "hsl(35, 90%, 55%)";
        const components = c.components ?? ["x", "y"];
        const showRect = c.showRectangle !== false;
        const out: JSX.Element[] = [];
        const tipX = { x: at.x + ux.x * sx, y: at.y + ux.y * sx };
        const tipY = { x: at.x + uy.x * sy, y: at.y + uy.y * sy };
        const Ftip = { x: at.x + dxw, y: at.y + dyw };
        if (components.includes("x")) {
          out.push(<g key="px">{renderArrow(`projx-${id}`, at, ux.x * sx, ux.y * sx, color, labels[0], 1.2)}</g>);
        }
        if (components.includes("y")) {
          out.push(<g key="py">{renderArrow(`projy-${id}`, at, uy.x * sy, uy.y * sy, color, labels[1], 1.2)}</g>);
        }
        if (showRect && components.includes("x") && components.includes("y")) {
          // Projection rectangle: from F tip drop perpendiculars to axes
          const Tx = W2S(tipX), Ty = W2S(tipY), F2 = W2S(Ftip);
          out.push(
            <g key="rect" opacity={0.7}>
              <line x1={Tx.x} y1={Tx.y} x2={F2.x} y2={F2.y} stroke={color} strokeWidth={0.7} strokeDasharray="2 3" />
              <line x1={Ty.x} y1={Ty.y} x2={F2.x} y2={F2.y} stroke={color} strokeWidth={0.7} strokeDasharray="2 3" />
            </g>
          );
        }
        return <g key={id} opacity={op}>{out}</g>;
      }
      case "pendulum": {
        const pivot = resolvePoint(c.pivot, resolved);
        const angleRad = ((c.params.angle ?? 20) * Math.PI) / 180;
        const len = c.params.length;
        // angle from vertical (downward), positive = right
        const bob = { x: pivot.x + Math.sin(angleRad) * len, y: pivot.y - Math.cos(angleRad) * len };
        const P = W2S(pivot), B = W2S(bob);
        const r = L(c.params.bobRadius ?? 0.15);
        return (
          <g key={id} opacity={op}>
            <line x1={P.x} y1={P.y} x2={B.x} y2={B.y} stroke={stroke} strokeWidth={sw} />
            <circle cx={P.x} cy={P.y} r={3} fill={stroke} />
            <circle cx={B.x} cy={B.y} r={r} fill="hsl(var(--card))" stroke={stroke} strokeWidth={sw} />
            {c.label && <text x={B.x + r + 4} y={B.y + 4} fontSize={11} fontFamily="monospace" fill={stroke}>{c.label}</text>}
          </g>
        );
      }
      default:
        return null;
    }
  };

  const anchorDots = showAnchors
    ? Array.from(resolved.values()).flatMap((r) =>
        Object.entries(r.anchors)
          .filter(([name, v]) => typeof v !== "function" && !name.startsWith("normal"))
          .map(([name, v]) => {
            const p = W2S(v as Point);
            return (
              <g key={`${r.id}-${name}`}>
                <circle cx={p.x} cy={p.y} r={2} fill="hsl(var(--accent))" />
                <text x={p.x + 4} y={p.y - 4} fontSize={8} fontFamily="monospace" fill="hsl(var(--accent))">
                  {r.id}.{name}
                </text>
              </g>
            );
          }),
      )
    : null;

  // Filter autoForces by their owner visibility (and self id format <ownerId>__<NAME>)
  const autoForceEls = autoForces
    .filter((af) => isVisible(af.ownerId))
    .map((af) => renderArrow(`af-${af.id}`, af.at, af.dx, af.dy, af.color, af.label, 1.8));

  return (
    <div className="relative w-full h-full bg-background">
      <svg viewBox={viewBox(frame)} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <Frame frame={frame} showAxes={showAxes} showGrid={showGrid} />
        {order.map(renderComp)}
        {autoForceEls}
        {anchorDots}
      </svg>
      {errors.length > 0 && (
        <div className="absolute bottom-2 left-2 right-2 max-h-32 overflow-auto bg-destructive/10 border border-destructive/40 rounded px-2 py-1 text-xs font-mono text-destructive">
          {errors.map((e, i) => (
            <div key={i}>⚠ {e}</div>
          ))}
        </div>
      )}
    </div>
  );
}
