import { useMemo, useState } from "react";
import SchemaCanvas from "@/components/schema/SchemaCanvas";
import JsonEditor from "@/components/schema/JsonEditor";
import Toolbar from "@/components/schema/Toolbar";
import StatementEditor from "@/components/schema/StatementEditor";
import AnimationControls from "@/components/schema/AnimationControls";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { EXAMPLES } from "@/data/examples";
import { SchemaSchema, type Schema } from "@/types/schema";
import { useAnimation } from "@/hooks/useAnimation";
import { resolveSchema } from "@/engine/resolver";
import { generateAutoAnimation } from "@/engine/autoAnimation";

export default function Index() {
  const [exampleKey, setExampleKey] = useState(EXAMPLES[0].key);
  const [text, setText] = useState(() => JSON.stringify(EXAMPLES[0].schema, null, 2));
  const [showAxes, setShowAxes] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showAnchors, setShowAnchors] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const { schema, error } = useMemo<{ schema: Schema | null; error: string | null }>(() => {
    try {
      const parsed = JSON.parse(text);
      const result = SchemaSchema.safeParse(parsed);
      if (!result.success) {
        return { schema: null, error: result.error.issues.map((i) => `• ${i.path.join(".")}: ${i.message}`).join("\n") };
      }
      return { schema: result.data, error: null };
    } catch (e: any) {
      return { schema: null, error: `JSON invalide: ${e.message}` };
    }
  }, [text]);

  // Auto-animation : si pas définie dans le schéma, on en génère une
  const animation = useMemo(() => {
    if (!schema) return undefined;
    const userAnim = (schema as any).animation;
    if (userAnim) return userAnim;
    try {
      const resolved = resolveSchema(schema);
      return generateAutoAnimation(schema, resolved);
    } catch {
      return undefined;
    }
  }, [schema]);

  const animControls = useAnimation(animation);

  const handleExample = (k: string) => {
    const ex = EXAMPLES.find((e) => e.key === k);
    if (!ex) return;
    setExampleKey(k);
    setText(JSON.stringify(ex.schema, null, 2));
  };

  const onToggle = (k: "axes" | "grid" | "labels" | "anchors" | "fullscreen") => {
    if (k === "axes") setShowAxes((v) => !v);
    if (k === "grid") setShowGrid((v) => !v);
    if (k === "labels") setShowLabels((v) => !v);
    if (k === "anchors") setShowAnchors((v) => !v);
    if (k === "fullscreen") setFullscreen((v) => !v);
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <header className="px-4 py-2 border-b border-border flex items-center justify-between">
        <h1 className="text-sm font-mono font-semibold tracking-tight">Madox · Moteur de schémas physiques</h1>
        <span className="text-xs font-mono text-muted-foreground">Énoncé → IA → JSON → schéma précis</span>
      </header>
      <div className="flex-1 flex min-h-0">
        {!fullscreen && (
          <aside className="w-[40%] min-w-[320px] max-w-[640px] border-r border-border flex flex-col">
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={40} minSize={20}>
                <StatementEditor onGenerated={(json) => { setText(json); }} />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={60} minSize={20}>
                <div className="flex flex-col h-full">
                  <div className="px-3 py-2 border-b border-border bg-card text-xs font-mono text-muted-foreground">
                    Schéma JSON
                  </div>
                  <JsonEditor value={text} onChange={setText} error={error} />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </aside>
        )}
        <main className="flex-1 flex flex-col min-w-0">
          <Toolbar
            showAxes={showAxes}
            showGrid={showGrid}
            showLabels={showLabels}
            showAnchors={showAnchors}
            fullscreen={fullscreen}
            examples={EXAMPLES.map((e) => ({ key: e.key, label: e.label, category: e.category }))}
            currentExample={exampleKey}
            onToggle={onToggle}
            onExample={handleExample}
          />
          <AnimationControls controls={animControls} hasAnimation={!!animation} />
          <div className="flex-1 min-h-0">
            {schema ? (
              <SchemaCanvas
                schema={schema}
                showAxes={showAxes}
                showGrid={showGrid}
                showLabels={showLabels}
                showAnchors={showAnchors}
                animState={animation ? animControls.state : undefined}
                initiallyHidden={animation?.initiallyHidden}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground font-mono text-sm p-8">
                Corrigez le JSON pour afficher le schéma.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
