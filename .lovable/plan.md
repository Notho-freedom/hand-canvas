
# Madox v2.2 — Corrections géométriques + IA + Animations

Je vais lire les fichiers clés pour bien cadrer le plan.
<lov-tool-use id="toolu_vrtx_01Suw5wNJsdZqNeUYFe7ch59" name="code--view" integration-id="code" data="{\"file_path\": \"src/engine/ropes.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01CHcwUjjEkYCLLbgwnx7RLT" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/schema/SchemaCanvas.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_017PuSNTMc4eBfP9V858zL4s" name="code--view" integration-id="code" data="{\"file_path\": \"src/types/schema.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_016nzRH1rJCz9jNKAW2fZep7" name="code--view" integration-id="code" data="{\"file_path\": \"src/engine/ropes.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01RPEHmNs4FX87RFkGHZ2did" name="code--view" integration-id="code" data="{\"file_path\": \"src/types/schema.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01CUg3qqekMRqq72yZtEX1iM" name="code--view" integration-id="code" data="{\"file_path\": \"src/engine/autoForces.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01H7ThJdywmx8rqd9Kv2Yomx" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/schema/SchemaCanvas.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01P87rieZ5PvXpApL8mM4ng5" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/schema/JsonEditor.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01HGe7E6mR39Vu963Psyjx11" name="code--view" integration-id="code" data="{\"file_path\": \"src/engine/anchors.ts\"}">
</lov-tool-use>
J'ai assez de contexte. Le plan est clair. Je présente directement.

<lov-plan>

# Madox v3 — Cordes verticales sous masse + projections complètes + animations + IA

## Analyse des bugs visuels actuels

1. **Atwood** : la corde unique avec `wrap` génère 2 tangentes obliques. Or physiquement, une masse pendue tire **strictement vertical**. Il faut donc passer à **2 cordes verticales indépendantes** attachées en `face_top_center` du bloc et au point tangent **vertical** de la poulie (côté gauche/droit), reliées par un **arc en haut** de la poulie.
2. **Ressort horizontal** : le ressort se connecte au sommet du bloc parce que `face_left_center` est calculé correctement, mais le **bloc est posé au sol** (origin.y=0) et `face_left_center.y = h/2` → en fait c'est correct… le souci visuel vient du `bloc` placé `at.y = 0` avec hauteur 0.5 alors que le ressort est ancré `wall.surface(t=0.5)` à mi-hauteur du mur (1.5/2 = 0.75). Donc fix : aligner les hauteurs (réduire le mur ou monter le bloc). Mieux : ajouter une **contrainte d'alignement vertical ressort↔bloc** ou simplement corriger l'exemple.
3. **Plan incliné** : axes locaux trop courts et **unidirectionnels** (pas de partie négative), pas de projection visible du poids `P` sur `x'`/`y'`.

## Plan d'implémentation

### Partie 1 — Corrections visuelles (cordes, ressort, repère)

**A. Cordes "tendues sous masse" (refactor `ropes.ts`)**
- Nouveau mode de waypoint : `{ wrap: pulleyId, side: "left" | "right" }` → force le point de tangence **vertical** (angle 90° gauche, -90° droit dans repère y-up) et la corde sortante est **strictement verticale** (snap dx=0).
- Pour Atwood : 2 cordes séparées dans le JSON, chacune `[blocX.face_top_center, { wrap: poulie, side: "left"|"right" }]`. La corde s'arrête au point de tangence vertical, **plus l'arc supérieur** rendu via une 3ᵉ entité ou une nouvelle option `linkArc: true` qui dessine l'arc reliant les 2 cordes.
- Solution plus propre : nouveau composant `pulley_rope_system` qui prend `{ pulley, leftAttach, rightAttach }` et génère automatiquement les 2 cordes verticales + arc supérieur reliés. Plus simple à écrire en JSON.

**B. Forces de tension automatiques sur cordes**
- Dans `autoForces.ts`, ajouter cas `rope` : pour chaque extrémité attachée à un bloc, générer une force `T` au point d'attache, **dans la direction de la tangente locale** de la corde (vers la poulie). Couleur dédiée.

**C. Ressort horizontal — fix des exemples**
- Dans l'exemple `spring_mass`, ajuster les hauteurs : `mur.height = 1` et `bloc.at.y = 0` avec `h=1` → `face_left_center.y = 0.5` = `surface(0.5)` du mur.
- Snap horizontal/vertical déjà géré par contrainte `horizontal`, on garde.

**D. Repère local étendu (axes ±, projections visibles)**
- `LocalFrame` rendu : passer de demi-axes à **axes complets** (de `-length` à `+length`) avec graduations.
- Augmenter la longueur par défaut à `1.2`.
- Auto-générer une `projection` pour chaque `force` ayant un `local_frame` sur le même solide (champ `autoProject: true` sur le `local_frame`).
- Améliorer le rendu `projection` : pointillés des composantes `Px`, `Py`, **rectangle de projection** en pointillés reliant la pointe de F aux pointes de Px et Py.

### Partie 2 — Animations Play/Pause

**E. Système d'animation par composant**
- Nouveau champ optionnel `animation` au niveau du schéma : `{ duration: 6, autoplay: false, steps: [...] }` avec timeline.
- `steps` : `[{ at: 0, show: ["frame_bloc"] }, { at: 1, show: ["P", "N"] }, { at: 2, show: ["projection_P"] }, { at: 3, animate: { id: "bloc", along: "plan.surface", from: 0.9, to: 0.05 } }]`.
- Nouveau hook `useAnimation` côté React qui maintient un `t` (0→duration) et expose `visibleIds: Set<string>` + overrides de position.
- Le resolver accepte un `animationOverrides?: Map<id, Partial<Component>>` qui modifie les `at`/`anchor` à chaque frame.
- Bouton **Play / Pause / Reset** dans le `Toolbar`. Slider de progression.

**F. Animations spécifiques par type**
- `block` : `slide` le long d'une `surface` (param `from→to` en t).
- `spring` : oscillation `compress` (param `amplitude`, `frequency`) — module la `restLength` virtuelle.
- `force` : apparition progressive (fade + grow de longueur).
- `local_frame` / `projection` : fade-in.
- Indicateur de glissement : petite flèche fantôme sur le bloc, parallèle à `tangent`, dans le sens du mouvement.

### Partie 3 — Génération JSON par IA depuis énoncé

**G. Split de la colonne d'édition**
- `Index.tsx` : la colonne gauche devient un `<ResizablePanelGroup direction="vertical">` :
  - **Haut (40%)** : zone de texte "Énoncé" + bouton "Générer le schéma".
  - **Bas (60%)** : éditeur JSON existant.

**H. Backend IA (Lovable Cloud)**
- Edge function `generate-schema` qui :
  - Reçoit `{ statement: string }`.
  - Appelle **Lovable AI Gateway** (modèle par défaut `google/gemini-2.5-flash`, gratuit jusqu'au 13/10).
  - Système prompt = **documentation complète du schéma JSON** (composants, anchors, contraintes, valeurs admises, exemples).
  - Retourne du JSON structuré (via `tool_choice` forcé) → schéma Madox.
  - Le frontend pousse le résultat dans l'éditeur.
- Streaming optionnel pour feedback live.

**I. Documentation embarquée du schéma**
- Nouveau fichier `src/data/schemaDocs.ts` exportant un long string Markdown qui décrit :
  - Tous les `type` de composants + leurs `params` (avec valeurs admises et défauts).
  - Tous les anchors disponibles par composant.
  - Tous les types de `constraints`.
  - Le format `frame`, `local_frame`, `projection`, `animation`.
  - 4-5 mini-exemples annotés.
- Ce string sert de **system prompt** pour l'IA + s'affiche dans un onglet "Doc" du `Toolbar`.

### Partie 4 — Composants additionnels

**J. Ajouts à la bibliothèque** (anticipant les énoncés variés)
- `pendulum` (pivot + tige + masse).
- `arc_track` / `loop` (rail courbe).
- `pulley_system` (combo pratique : poulie + 2 cordes verticales + arc).
- `friction_zone` (zone hachurée μ).
- `vector_sum` (somme graphique de plusieurs forces, méthode du parallélogramme).

## Fichiers à toucher

| Fichier | Action |
|---|---|
| `src/engine/ropes.ts` | Sides `left`/`right` verticales, snap vertical strict |
| `src/engine/autoForces.ts` | Ajouter tension `T` sur cordes |
| `src/engine/anchors.ts` | + `pulley_system`, `pendulum`, `arc_track`, `friction_zone` |
| `src/components/schema/SchemaCanvas.tsx` | Repère local bidirectionnel, projection avec rectangle, nouveaux composants, hook anim |
| `src/components/schema/Toolbar.tsx` | + Play/Pause/Reset/Slider |
| `src/components/schema/JsonEditor.tsx` | Inchangé |
| `src/components/schema/StatementEditor.tsx` | **Nouveau** — textarea énoncé + bouton générer |
| `src/components/schema/AnimationControls.tsx` | **Nouveau** — Play/Pause/seek |
| `src/hooks/useAnimation.ts` | **Nouveau** — moteur de timeline |
| `src/types/schema.ts` | + `animation` field, + nouveaux composants, + `pulley_system` |
| `src/data/examples.ts` | Réécrire Atwood (2 cordes verticales), corriger ressort, ajouter projections complètes au plan incliné, ajouter exemples animés |
| `src/data/schemaDocs.ts` | **Nouveau** — doc complète embarquée |
| `src/pages/Index.tsx` | Split vertical de la colonne gauche |
| `supabase/functions/generate-schema/index.ts` | **Nouveau** — edge function IA |

## Backend requis
Activer **Lovable Cloud** (Supabase) pour héberger l'edge function et utiliser **Lovable AI Gateway** (clé `LOVABLE_API_KEY` auto-injectée). Aucun compte tiers à connecter.

## Livrables
- 4 exemples corrigés visuellement (Atwood réaliste, ressort aligné, plan incliné avec projections complètes).
- Bouton Play/Pause fonctionnel sur l'exemple "plan incliné" (apparition forces → projections → glissement).
- Génération JSON depuis énoncé en français : "Un bloc de 5 kg glisse sur un plan incliné à 30°…" → schéma valide affiché.
- Doc complète du schéma accessible et utilisée par l'IA.

