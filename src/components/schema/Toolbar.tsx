import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Maximize2, Minimize2, Grid3x3, Compass, Tag, Crosshair } from "lucide-react";

interface Props {
  showAxes: boolean;
  showGrid: boolean;
  showLabels: boolean;
  showAnchors: boolean;
  fullscreen: boolean;
  examples: { label: string; key: string }[];
  currentExample: string;
  onToggle: (k: "axes" | "grid" | "labels" | "anchors" | "fullscreen") => void;
  onExample: (k: string) => void;
}

export default function Toolbar({
  showAxes, showGrid, showLabels, showAnchors, fullscreen,
  examples, currentExample, onToggle, onExample,
}: Props) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card">
      <select
        value={currentExample}
        onChange={(e) => onExample(e.target.value)}
        className="text-xs font-mono bg-background border border-border rounded px-2 py-1 text-foreground"
      >
        {examples.map((ex) => (
          <option key={ex.key} value={ex.key}>{ex.label}</option>
        ))}
      </select>
      <div className="flex-1" />
      <Toggle pressed={showAxes} onPressedChange={() => onToggle("axes")} size="sm" aria-label="Repère">
        <Compass className="h-4 w-4" />
      </Toggle>
      <Toggle pressed={showGrid} onPressedChange={() => onToggle("grid")} size="sm" aria-label="Grille">
        <Grid3x3 className="h-4 w-4" />
      </Toggle>
      <Toggle pressed={showLabels} onPressedChange={() => onToggle("labels")} size="sm" aria-label="Labels">
        <Tag className="h-4 w-4" />
      </Toggle>
      <Toggle pressed={showAnchors} onPressedChange={() => onToggle("anchors")} size="sm" aria-label="Ancrages">
        <Crosshair className="h-4 w-4" />
      </Toggle>
      <Button variant="ghost" size="icon" onClick={() => onToggle("fullscreen")} aria-label="Plein écran">
        {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </Button>
    </div>
  );
}
