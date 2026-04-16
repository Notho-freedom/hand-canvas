import { useMemo } from "react";
import type { Schema } from "@/types/schema";
import { resolveSchema, resolvePoint } from "@/engine/resolver";
import { worldToScreen, viewBox, worldLen } from "@/engine/frame";
import Frame from "./Frame";

interface Props {
  schema: Schema;
  showAxes: boolean;
  showGrid: boolean;
  showLabels: boolean;
  showAnchors: boolean;
}

export default function SchemaCanvas({ schema, showAxes, showGrid, showLabels, showAnchors }: Props) {
  const { resolved, order, errors } = useMemo(() => resolveSchema(schema), [schema]);
  const frame = schema.frame;
  const W2S = (p: { x: number; y: number }) => worldToScreen(p, frame);
  const L = (l: number) => worldLen(l, frame);

  const renderComp = (id: string) => {
    const r = resolved.get(id);
    if (!r) return null;
    const c: any = r.raw;
    const stroke = c.style?.stroke ?? "hsl(var(--foreground))";
    const fill = c.style?.fill ?? "hsl(var(--muted))";
    const sw = c.style?.strokeWidth ?? 1.5;
    const op = c.style?.opacity ?? 1;

    switch (r.type) {
      case "ground": {
        const left = W2S(r.anchors.left as any);
        const right = W2S(r.anchors.right as any);
        const thick = L(r.data.thick);
        const len = right.x - left.x;
        // hatching below ground line
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
        const bottom = W2S(r.anchors.bottom as any);
        const top = W2S(r.anchors.top as any);
        const len = bottom.y - top.y;
        const hatchSpacing = 8;
        const hatches = [];
        for (let y = 0; y < len; y += hatchSpacing) {
          hatches.push(
            <line key={y} x1={bottom.x} y1={top.y + y} x2={bottom.x - 8} y2={top.y + y - 6} stroke={stroke} strokeWidth={0.6} opacity={0.7} />,
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
        const foot = W2S(r.anchors.foot as any);
        const top = W2S(r.anchors.top as any);
        const base = { x: top.x, y: foot.y };
        const path = `M ${foot.x} ${foot.y} L ${top.x} ${top.y} L ${base.x} ${base.y} Z`;
        // hatching under hypotenuse
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
        const from = W2S(resolvePoint(c.from, resolved));
        const to = W2S(resolvePoint(c.to, resolved));
        const via = (c.via ?? []).map((v: any) => W2S(resolvePoint(v, resolved)));
        const pts = [from, ...via, to];
        const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
        return <path key={id} d={d} fill="none" stroke={stroke} strokeWidth={sw} opacity={op} />;
      }
      case "spring": {
        const from = resolvePoint(c.from, resolved);
        const to = resolvePoint(c.to, resolved);
        const a = W2S(from), b = W2S(to);
        const coils = c.params?.coils ?? 8;
        const width = L(c.params?.width ?? 0.15);
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy);
        const ux = dx / len, uy = dy / len;
        const px = -uy, py = ux; // perpendicular
        const pad = 12; // straight ends
        const usable = Math.max(0, len - 2 * pad);
        const pts: string[] = [];
        pts.push(`M ${a.x} ${a.y}`);
        pts.push(`L ${a.x + ux * pad} ${a.y + uy * pad}`);
        const seg = usable / coils;
        for (let i = 0; i < coils; i++) {
          const t1 = pad + (i + 0.5) * seg;
          const side = i % 2 === 0 ? 1 : -1;
          pts.push(`L ${a.x + ux * t1 + px * width * side} ${a.y + uy * t1 + py * width * side}`);
        }
        pts.push(`L ${a.x + ux * (pad + usable)} ${a.y + uy * (pad + usable)}`);
        pts.push(`L ${b.x} ${b.y}`);
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
        const v = c.vector;
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
        const tip = { x: at.x + dxw, y: at.y + dyw };
        const pA = W2S(at);
        const pB = W2S(tip);
        const colorMap: Record<string, string> = {
          force: "hsl(0, 80%, 60%)",
          velocity: "hsl(140, 70%, 50%)",
          acceleration: "hsl(35, 90%, 55%)",
        };
        const color = c.style?.stroke ?? colorMap[r.type];
        const markerId = `arrow-${r.type}-${id}`;
        // label positioning slightly past tip
        const lx = pB.x + (pB.x - pA.x) * 0.05 + 6;
        const ly = pB.y + (pB.y - pA.y) * 0.05 - 4;
        return (
          <g key={id} opacity={op}>
            <defs>
              <marker id={markerId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
              </marker>
            </defs>
            <line x1={pA.x} y1={pA.y} x2={pB.x} y2={pB.y} stroke={color} strokeWidth={sw + 0.5} markerEnd={`url(#${markerId})`} />
            {(c.label || showLabels) && c.label && (
              <text x={lx} y={ly} fontSize={11} fontFamily="monospace" fill={color} fontWeight="bold">{c.label}</text>
            )}
          </g>
        );
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
        const rad = L(c.params.radius);
        const a1 = (c.params.from * Math.PI) / 180;
        const a2 = (c.params.to * Math.PI) / 180;
        const center = W2S(at);
        // SVG arc: y is flipped vs math; build polyline
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
        return (
          <text key={id} x={p.x} y={p.y} fontSize={12} fontFamily="monospace" fill={stroke}>
            {c.params.text}
          </text>
        );
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
      default:
        return null;
    }
  };

  const anchorDots = showAnchors
    ? Array.from(resolved.values()).flatMap((r) =>
        Object.entries(r.anchors)
          .filter(([, v]) => typeof v !== "function")
          .map(([name, v]) => {
            const p = W2S(v as any);
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

  return (
    <div className="relative w-full h-full bg-background">
      <svg viewBox={viewBox(frame)} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <Frame frame={frame} showAxes={showAxes} showGrid={showGrid} />
        {order.map(renderComp)}
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
