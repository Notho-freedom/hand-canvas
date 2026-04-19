import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Maximize2, Minimize2, Grid3x3, Compass, Tag, Crosshair } from "lucide-react";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface ExampleItem { label: string; key: string; category?: string }

interface Props {
  showAxes: boolean;
  showGrid: boolean;
  showLabels: boolean;
  showAnchors: boolean;
  fullscreen: boolean;
  examples: ExampleItem[];
  currentExample: string;
  onToggle: (k: "axes" | "grid" | "labels" | "anchors" | "fullscreen") => void;
  onExample: (k: string) => void;
}

export default function Toolbar({
  showAxes, showGrid, showLabels, showAnchors, fullscreen,
  examples, currentExample, onToggle, onExample,
}: Props) {
  // Group by category preserving insertion order
  const groups = new Map<string, ExampleItem[]>();
  for (const ex of examples) {
    const cat = ex.category ?? "Exemples";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(ex);
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card">
      <Select value={currentExample} onValueChange={onExample}>
        <SelectTrigger className="w-[280px] h-8 text-xs font-mono">
          <SelectValue placeholder="Choisir un exemple" />
        </SelectTrigger>
        <SelectContent>
          {Array.from(groups.entries()).map(([cat, items]) => (
            <SelectGroup key={cat}>
              <SelectLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">{cat}</SelectLabel>
              {items.map((ex) => (
                <SelectItem key={ex.key} value={ex.key} className="text-xs font-mono">{ex.label}</SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
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
