import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SCHEMA_DOCS = `# Madox — Schéma JSON pour diagrammes de physique

Tu génères un objet JSON conforme au schéma. RENDS UNIQUEMENT du JSON valide via l'outil "emit_schema".

## Structure : { "frame":{...}, "components":[...], "constraints":[...], "animation":{...} }

## frame
{ "origin":{"x":0,"y":0}, "unit":"m", "scale":90, "yAxis":"up",
  "viewport":{"x":-1,"y":-0.5,"w":7,"h":4.5} }

## Composants (type)
- ground: at, params:{length, thickness}
- wall: at, params:{height, thickness, side:"left"|"right"}
- incline: anchor, params:{angle, length, thickness, direction:"right"|"left"}
- block: anchor|at, rotation:"auto"|number, params:{w,h,mass}, label, autoForces:["P","N","f","T"]
- sphere: at, params:{radius, mass}
- pulley: anchor|at, params:{radius}
- rope: path:[ref|{wrap:"id",side:"auto"|"upper"|"lower"|"left"|"right"}]
- pulley_rope_system: pulley, leftAttach, rightAttach   ← raccourci Atwood
- spring: from, to, params:{coils,width}
- rigid_rod: from, to
- force/velocity/acceleration: at, vector:{direction|angle|dx|dy, magnitude}, label
- axis / angle_arc / label / dimension
- local_frame: of, origin:"cog", mode:"surface_aligned"|"world_aligned", axes:["x'","y'"], length:1.4, bidirectional:true
- projection: force, onto:"<solidId>.frame", components:["x","y"], labels:["Px","Py"], showRectangle:true
- pendulum: pivot, params:{length, angle, bobRadius, mass}

## Refs : {"ref":"id.anchor"} | {"ref":"id.surface","t":0.5}
       | {"kind":"face","id":"bloc","face":"top|bottom|left|right"}
       | {"kind":"curve","id":"plan","curve":"surface","t":0.5}
       | {"kind":"point","id":"bloc","anchor":"cog"}

## Vocabulaire FR → composants
- "sol", "plancher", "table" → ground
- "mur", "paroi" → wall
- "plan incliné", "pente", "rampe" → incline
- "bloc", "solide", "caisse", "masse" (rectangulaire) → block
- "boule", "sphère", "balle" → sphere
- "poulie" → pulley
- "corde", "fil", "câble" → rope
- "ressort" → spring
- "tige rigide", "barre" → rigid_rod
- "pendule" → pendulum

## RÈGLES STRICTES (systèmes combinés)

### A. Cordes & poulies
- Masse pendue VERTICALEMENT sous une poulie → \`side:"left"\` ou \`side:"right"\` (corde stricte verticale).
- Atwood (2 masses + poulie au-dessus) → \`pulley_rope_system\` + blocs DÉCALÉS horizontalement (un sous chaque côté de la poulie).
- Bloc sur plan incliné relié à une poulie au sommet : la corde sort de \`face:"right"\` (face haute le long du plan, pas \`face:"top"\`), wrap \`side:"auto"\`.

### B. Ressorts
- Ressort horizontal mur↔bloc : \`face:"left"\` ou \`face:"right"\` du bloc + ancrage \`curve:"surface", t:0.5\` du mur, ALIGNER mur.height = bloc.h, et bloc.at.y = 0. Toujours ajouter \`{type:"horizontal",object:"ressort"}\`.
- Ressort vertical : utiliser \`face:"top"\` ou \`face:"bottom"\`. Ajouter \`{type:"vertical",object:"ressort"}\`.
- Bloc entre 2 ressorts : un ressort à gauche (\`face:"left"\` du bloc), un ressort à droite (\`face:"right"\`).

### C. Plan incliné
- Bloc sur incline : \`rotation:"auto"\` + anchor \`curve:"surface"\`.
- AJOUTER systématiquement : \`local_frame\` surface_aligned (length≥1.4, bidirectional:true) + force P + projection P sur le frame.

### D. Géométrie
- Toujours un \`ground\` sous les systèmes avec gravité.
- Aligner précisément : si bloc B est suspendu sous le côté droit d'une poulie de rayon r en (px,py), alors blocB.at.x = px+r (et w/2 ne décale pas car center).

### E. Animation (optionnel — l'app génère déjà une animation par défaut)
Format : { "duration":6, "autoplay":false, "initiallyHidden":[ids],
  "steps":[ {"at":0.5,"show":["id"]}, {"at":3,"animate":{"id":"bloc","along":"plan.surface","from":0.9,"to":0.05,"duration":2}} ] }
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { statement } = await req.json();
    if (!statement || typeof statement !== "string") {
      return new Response(JSON.stringify({ error: "statement requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY manquante" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SCHEMA_DOCS },
          { role: "user", content: `Énoncé :\n${statement}\n\nGénère le schéma JSON Madox via l'outil emit_schema.` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "emit_schema",
              description: "Émet un schéma Madox JSON valide.",
              parameters: {
                type: "object",
                properties: {
                  schema: {
                    type: "object",
                    description: "L'objet schéma complet : frame, components, constraints, animation.",
                  },
                },
                required: ["schema"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "emit_schema" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "429 — Trop de requêtes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "402 — Crédits IA épuisés." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: `AI gateway error ${response.status}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "Pas de tool call retourné" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const args = JSON.parse(toolCall.function.arguments);
    const schema = args.schema;

    return new Response(JSON.stringify({ schema }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-schema error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
