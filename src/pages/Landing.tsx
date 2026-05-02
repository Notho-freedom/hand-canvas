import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, ArrowRight, Atom } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EXAMPLES } from "@/data/examples";
import SchemaThumbnail from "@/components/schema/SchemaThumbnail";

const SUGGESTIONS = [
  "Un bloc de 5 kg glisse sur un plan incliné à 30°. Représenter le poids, la réaction normale et le frottement.",
  "Machine d'Atwood : deux masses de 2 kg et 3 kg reliées par une corde sur une poulie.",
  "Un pendule simple de longueur 1,5 m oscille avec un angle initial de 20°.",
  "Un bloc de 2 kg est relié à un mur par un ressort horizontal de raideur k=50 N/m.",
];

const CATEGORIES: Array<"Tous" | "Surfaces" | "Liaisons" | "Oscillateurs" | "Combinés"> = [
  "Tous", "Surfaces", "Liaisons", "Oscillateurs", "Combinés",
];

export default function Landing() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeCat, setActiveCat] = useState<typeof CATEGORIES[number]>("Tous");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  useEffect(() => {
    document.body.dataset.route = "landing";
    return () => { delete document.body.dataset.route; };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setPlaceholderIdx((i) => (i + 1) % SUGGESTIONS.length), 4500);
    return () => clearInterval(id);
  }, []);

  const generate = async () => {
    if (!text.trim()) {
      toast.error("Décris d'abord ton exercice");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-schema", { body: { statement: text } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const schema = data?.schema;
      if (!schema) throw new Error("Aucun schéma retourné");
      const json = JSON.stringify(schema, null, 2);
      navigate("/studio", { state: { json, statement: text } });
    } catch (e: any) {
      console.error(e);
      const msg = e?.message ?? "Erreur de génération";
      if (msg.includes("429")) toast.error("Trop de requêtes. Réessayez dans un instant.");
      else if (msg.includes("402")) toast.error("Crédits IA épuisés. Ajoutez des crédits.");
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") generate();
  };

  const filtered = activeCat === "Tous" ? EXAMPLES : EXAMPLES.filter((e) => e.category === activeCat);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* HEADER */}
      <header className="sticky top-0 z-20 backdrop-blur bg-background/70 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Atom className="h-5 w-5 text-primary" />
            <span className="font-mono font-semibold text-sm tracking-tight">Madox</span>
            <span className="text-[10px] font-mono text-muted-foreground border border-border rounded px-1.5 py-0.5 ml-1">
              physique
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/studio")} className="font-mono text-xs">
            Studio <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </div>
      </header>

      {/* HERO */}
      <section className="relative">
        <div className="absolute inset-0 grid-bg opacity-[0.07] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-6 pt-20 pb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4 text-glow-cyan">
            Décris ton exercice de physique
          </h1>
          <p className="text-muted-foreground text-base md:text-lg mb-10 max-w-xl mx-auto">
            L'IA génère le schéma, les forces, les repères et l'animation. Précis, mathématique, prêt à enseigner.
          </p>

          <div className="relative rounded-2xl border border-border bg-card/60 backdrop-blur shadow-[0_10px_60px_-20px_hsl(var(--primary)/0.3)] focus-within:border-primary/60 transition-colors">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={SUGGESTIONS[placeholderIdx]}
              spellCheck={false}
              className="min-h-[140px] bg-transparent border-0 resize-none focus-visible:ring-0 text-sm md:text-base p-5 pr-32 font-mono"
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground hidden md:inline">⌘ + ↵</span>
              <Button onClick={generate} disabled={loading} size="sm" className="font-mono text-xs">
                {loading ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-2" />}
                Générer
              </Button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <span className="text-xs font-mono text-muted-foreground self-center mr-2">Suggestions :</span>
            {["Plan incliné", "Atwood", "Pendule", "Ressort horizontal", "Poulie au bord"].map((s, i) => (
              <button
                key={s}
                onClick={() => setText(SUGGESTIONS[Math.min(i, SUGGESTIONS.length - 1)])}
                className="text-xs font-mono px-3 py-1.5 rounded-full border border-border hover:border-primary/60 hover:bg-card transition-colors text-muted-foreground hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* GALERIE */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">Exemples</h2>
          <div className="flex gap-1 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCat(cat)}
                className={`text-xs font-mono px-3 py-1.5 rounded-full border transition-colors ${
                  activeCat === cat
                    ? "border-primary/60 bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((ex) => (
            <button
              key={ex.key}
              onClick={() => navigate("/studio", { state: { exampleKey: ex.key } })}
              className="group text-left rounded-xl border border-border bg-card hover:border-primary/60 hover:bg-card/80 transition-all overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <div className="aspect-[4/3] bg-background/60 border-b border-border flex items-center justify-center p-3">
                <SchemaThumbnail schema={ex.schema as any} className="w-full h-full" />
              </div>
              <div className="p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{ex.category}</div>
                  <div className="text-sm font-mono truncate group-hover:text-primary transition-colors">{ex.label}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
            </button>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center text-[11px] font-mono text-muted-foreground">
        Madox · Schémas physiques générés par IA
      </footer>
    </div>
  );
}
