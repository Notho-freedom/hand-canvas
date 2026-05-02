import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
import { Button } from "@/components/ui/button";
import { ArrowLeft, Atom } from "lucide-react";

export default function Studio() {
  const navigate = useNavigate();
  const location = useLocation();
  const initial = (location.state as any) ?? {};

  const initialKey = initial.exampleKey && EXAMPLES.find((e) => e.key === initial.exampleKey)
    ? initial.exampleKey
    : EXAMPLES[0].key;

  const [exampleKey, setExampleKey] = useState<string>(initialKey);
  const [text, setText] = useState<string>(() => {
    if (typeof initial.json === "string") return initial.json;
    const ex = EXAMPLES.find((e) => e.key === initialKey) ?? EXAMPLES[0];
    return JSON.stringify(ex.schema, null, 2);
  });
  const [showAxes, setShowAxes] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showAnchors, setShowAnchors] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    document.body.dataset.route = "studio";
    return () => { delete document.body.dataset.route; };
  }, []);

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
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="font-mono text-xs h-7 px-2">
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Retour
          </Button>
          <div className="flex items-center gap-1.5">
            <Atom className="h-4 w-4 text-primary" />
            <h1 className="text-sm font-mono font-semibold tracking-tight">Madox · Studio</h1>
          </div>
        </div>
        <span className="text-xs font-mono text-muted-foreground hidden md:inline">Énoncé → IA → JSON → schéma précis</span>
      </header>
      <div className="flex-1 flex min-h-0">
        {!fullscreen && (
          <aside className="w-[40%] min-w-[320px] max-w-[640px] border-r border-border flex flex-col">
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={40} minSize={20}>
                <StatementEditor onGenerated={(json) => { setText(json); }} initialStatement={initial.statement} />
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
