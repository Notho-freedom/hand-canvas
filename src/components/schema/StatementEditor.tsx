import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  onGenerated: (json: string) => void;
}

export default function StatementEditor({ onGenerated }: Props) {
  const [text, setText] = useState(
    "Un bloc de masse 5 kg est posé sur un plan incliné formant un angle de 30° avec l'horizontale. Représenter le bloc, le plan, le sol, le poids, la réaction normale, le frottement, le repère local et la projection du poids sur les axes du repère local.",
  );
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-schema", {
        body: { statement: text },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const schema = data?.schema;
      if (!schema) throw new Error("Aucun schéma retourné");
      const json = JSON.stringify(schema, null, 2);
      onGenerated(json);
      toast.success("Schéma généré");
    } catch (e: any) {
      console.error(e);
      const msg = e?.message ?? "Erreur de génération";
      if (msg.includes("429")) toast.error("Trop de requêtes. Réessayez dans un instant.");
      else if (msg.includes("402")) toast.error("Crédits IA épuisés. Ajoutez des crédits dans Settings → Workspace.");
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border bg-card text-xs font-mono text-muted-foreground flex items-center gap-2">
        <Sparkles className="h-3 w-3" /> Énoncé physique → schéma JSON
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        placeholder="Décrivez le système physique en langage naturel…"
        className="flex-1 font-mono text-xs resize-none rounded-none border-0 focus-visible:ring-0 bg-card text-card-foreground"
      />
      <div className="px-3 py-2 border-t border-border bg-card flex justify-end">
        <Button size="sm" onClick={generate} disabled={loading} className="font-mono text-xs">
          {loading ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Sparkles className="h-3 w-3 mr-2" />}
          Générer le schéma
        </Button>
      </div>
    </div>
  );
}
