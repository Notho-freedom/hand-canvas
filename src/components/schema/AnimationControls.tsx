import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, RotateCcw } from "lucide-react";
import type { AnimationControls as AC } from "@/hooks/useAnimation";

interface Props {
  controls: AC;
  hasAnimation: boolean;
}

export default function AnimationControls({ controls, hasAnimation }: Props) {
  if (!hasAnimation) return null;
  const { state, play, pause, reset, seek } = controls;
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-card/50">
      <Button
        size="icon" variant="ghost"
        onClick={() => (state.playing ? pause() : play())}
        aria-label={state.playing ? "Pause" : "Play"}
        className="h-7 w-7"
      >
        {state.playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </Button>
      <Button size="icon" variant="ghost" onClick={reset} aria-label="Reset" className="h-7 w-7">
        <RotateCcw className="h-3.5 w-3.5" />
      </Button>
      <span className="text-[10px] font-mono text-muted-foreground w-10">{state.t.toFixed(1)}s</span>
      <Slider
        value={[state.t]}
        max={state.duration}
        step={0.05}
        onValueChange={(v) => seek(v[0])}
        className="flex-1"
      />
      <span className="text-[10px] font-mono text-muted-foreground w-10 text-right">{state.duration.toFixed(1)}s</span>
    </div>
  );
}
