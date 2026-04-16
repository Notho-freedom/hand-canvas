import type { Frame as FrameT } from "@/types/schema";
import { worldToScreen, viewSize } from "@/engine/frame";

interface Props {
  frame: FrameT;
  showAxes: boolean;
  showGrid: boolean;
}

export default function Frame({ frame, showAxes, showGrid }: Props) {
  const { w, h } = viewSize(frame);
  const { viewport, scale } = frame;

  // Grid lines at every 1 world unit
  const gridLines: JSX.Element[] = [];
  if (showGrid) {
    const xStart = Math.ceil(viewport.x);
    const xEnd = Math.floor(viewport.x + viewport.w);
    const yStart = Math.ceil(viewport.y);
    const yEnd = Math.floor(viewport.y + viewport.h);
    for (let xi = xStart; xi <= xEnd; xi++) {
      const a = worldToScreen({ x: xi, y: viewport.y }, frame);
      const b = worldToScreen({ x: xi, y: viewport.y + viewport.h }, frame);
      gridLines.push(
        <line
          key={`gx-${xi}`}
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke="hsl(var(--muted-foreground))"
          strokeOpacity={xi === 0 ? 0.35 : 0.1}
          strokeWidth={0.5}
        />,
      );
    }
    for (let yi = yStart; yi <= yEnd; yi++) {
      const a = worldToScreen({ x: viewport.x, y: yi }, frame);
      const b = worldToScreen({ x: viewport.x + viewport.w, y: yi }, frame);
      gridLines.push(
        <line
          key={`gy-${yi}`}
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke="hsl(var(--muted-foreground))"
          strokeOpacity={yi === 0 ? 0.35 : 0.1}
          strokeWidth={0.5}
        />,
      );
    }
  }

  let axes: JSX.Element | null = null;
  if (showAxes) {
    const O = worldToScreen({ x: 0, y: 0 }, frame);
    const Xend = worldToScreen({ x: viewport.x + viewport.w - 0.1, y: 0 }, frame);
    const Yend = worldToScreen({ x: 0, y: viewport.y + viewport.h - 0.1 }, frame);
    axes = (
      <g>
        <defs>
          <marker id="arrow-axis" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--primary))" />
          </marker>
        </defs>
        <line x1={O.x} y1={O.y} x2={Xend.x} y2={Xend.y} stroke="hsl(var(--primary))" strokeWidth={1.2} markerEnd="url(#arrow-axis)" />
        <line x1={O.x} y1={O.y} x2={Yend.x} y2={Yend.y} stroke="hsl(var(--primary))" strokeWidth={1.2} markerEnd="url(#arrow-axis)" />
        <text x={Xend.x + 6} y={Xend.y + 4} fontSize={11} fill="hsl(var(--primary))" fontFamily="monospace">x</text>
        <text x={Yend.x + 4} y={Yend.y - 4} fontSize={11} fill="hsl(var(--primary))" fontFamily="monospace">y</text>
        <circle cx={O.x} cy={O.y} r={2.5} fill="hsl(var(--primary))" />
        <text x={O.x - 10} y={O.y + 12} fontSize={10} fill="hsl(var(--primary))" fontFamily="monospace">O</text>
      </g>
    );
  }

  return (
    <g>
      {gridLines}
      {axes}
    </g>
  );
}
