
# Madox v3.2 — Animations universelles, précision géométrique, refonte UI

Trois chantiers livrés ensemble, sans pause intermédiaire.

---

## Chantier 1 — Animations dynamiques universelles

**Problème actuel** : seuls les blocs sur plan incliné s'animent. Pendule simple, machine d'Atwood, ressorts → rien ne bouge à la lecture.

**Solution** : étendre le moteur d'auto-animation pour générer un mouvement **physiquement cohérent** pour chaque type de système, et étendre le resolver pour appliquer ces overrides.

### Détection automatique du type de système
Dans `src/engine/autoAnimation.ts`, après l'apparition séquentielle (surfaces → solides → repères → forces), détecter le scénario dominant et générer la phase de mouvement :

| Système détecté | Animation générée |
|---|---|
| Pendule (`pendulum`) | Oscillation sinusoïdale de l'angle : `angle(t) = angle₀·cos(ω·t)`, ω basé sur √(g/L), 2-3 oscillations |
| Atwood (`pulley_rope_system` + 2 blocs masses différentes) | La masse lourde descend, la légère monte de la même quantité ; corde reliée recalculée à chaque frame |
| Ressort horizontal mur↔bloc | Oscillation harmonique du bloc le long de l'axe X autour de sa position d'équilibre |
| Bloc entre 2 ressorts | Oscillation harmonique centrée |
| Ressort vertical + masse | Oscillation verticale du bloc |
| Bloc sur incline + corde + poulie + masse pendue | Bloc glisse vers le haut du plan, masse descend (couplé) |
| Bloc sur incline simple | Glissement vers le bas (déjà OK) |
| 2 blocs reliés par poulie au bord de table | Bloc horizontal glisse vers la poulie, bloc vertical descend |

### Nouveaux types d'override d'animation
Étendre `AnimationStepSchema` dans `src/types/schema.ts` :
```ts
animate: {
  id: string,
  // existant
  along?: string, from?: number, to?: number, duration?: number,
  // NOUVEAU
  mode?: "slide" | "oscillate" | "rotate" | "translate",
  axis?: "x" | "y" | { dx: number, dy: number },  // direction libre
  amplitude?: number,        // pour oscillate
  frequency?: number,        // Hz pour oscillate
  angleFrom?: number, angleTo?: number,   // pour rotate (pendule)
  pivot?: { x: number, y: number } | { ref: string },
}
```

### Application des overrides
- `src/hooks/useAnimation.ts` : calculer `tValue`, `dx/dy`, ou `angle` selon le `mode`, et stocker dans `overrides`.
- `src/engine/resolver.ts` : pour chaque composant ayant un override :
  - `slide along curve` → déjà géré
  - `translate {dx, dy}` → décaler `at` du composant
  - `rotate angle` autour d'un pivot → recalculer la position pour `pendulum` (le bob suit l'angle), `block`, etc.
- `src/components/schema/SchemaCanvas.tsx` : recalculer les liens (cordes, ressorts, projections) à partir des positions overridées **à chaque frame**, pas une seule fois au montage. C'est la clé pour qu'Atwood s'anime visuellement (cordes qui bougent avec les masses).

### Détection couplée Atwood
Quand `pulley_rope_system` lie deux blocs avec masses `m1 < m2`, l'auto-animation génère :
```
{ at: 2.0, animate: { id: "m1", mode: "translate", axis: "y", from: 0, to: +0.6, duration: 3 }}
{ at: 2.0, animate: { id: "m2", mode: "translate", axis: "y", from: 0, to: -0.6, duration: 3 }}
```

---

## Chantier 2 — Précision géométrique (corde sur poulie)

**Problème actuel** : dans "deux blocs reliés par poulie au bord de table", la corde du bloc horizontal **passe sous la poulie** au lieu de passer **par-dessus**. La cause est dans `pickTangent` (`src/engine/geometry.ts`) : quand `side="auto"`, il choisit la tangente la plus proche du hint = celle du **bas** quand le bloc est en bas.

### Correction de `pickTangent` + nouveau mode "over"
Dans `geometry.ts`, ajouter un mode `"over"` qui choisit la tangente **opposée** au prochain segment vertical descendant. La logique correcte pour une poulie au bord :
- corde entrante depuis bloc à gauche/horizontal
- corde sortante verticale vers le bas (masse pendue)
- → la corde doit toucher la poulie sur l'**arc supérieur** des deux côtés

### Refonte de `buildRopePath` (`src/engine/ropes.ts`)
Quand la séquence est `[point, pulley(side="auto"), point/pulley]` :
1. Détecter si l'attache suivante est **en dessous** de la poulie (Δy < 0).
2. Si oui, forcer la tangente entrante sur la **moitié haute** du cercle (côté opposé à la sortie verticale).
3. Si la sortie est `side="right"` (verticale descendante côté droit), la tangente entrante doit être sur le **quart haut-gauche** du cercle. Calculer l'arc supérieur reliant les deux points de contact.

Concrètement :
- Nouvelle fonction `pickTangentOver(P, C, r, exitDir)` qui retourne la tangente sur l'hémisphère opposé à `exitDir`.
- Dans `buildRopePath`, après résolution des contacts, si une poulie a un côté `"left"`/`"right"` (vertical strict) ET un autre côté `"auto"`, on **résout l'auto en fonction du vertical** : la corde s'enroule par-dessus → contact entrant dans le quart haut opposé.

### Cas spéciaux validés
- Poulie en haut d'un plan incliné + masse pendue à droite : corde côté plan = tangente sur le quart **haut-gauche** ; corde côté masse = verticale stricte côté droit (déjà OK).
- Atwood : `pulley_rope_system` génère déjà 2 verticales + arc supérieur, on vérifie que l'arc dessine bien la **moitié haute** du cercle (et pas la moitié basse).
- 2 blocs + poulie au bord de table : corde horizontale arrive sur le côté **gauche-haut** de la poulie, traverse l'arc supérieur, ressort verticale stricte côté droit.

### Validation visuelle
Ajouter dans `src/engine/anchors.ts` un check console.warn si une corde calculée traverse géométriquement un solide (test simple : segment de corde vs AABB du bloc/sol).

---

## Chantier 3 — Refonte UI "Lovable de la physique"

**Objectif** : transformer la page d'accueil pour qu'elle ressemble à Lovable — une grande zone de saisie centrale ("Décris ton exercice de physique"), une galerie d'exemples en bas, et l'éditeur/canvas accessibles dans un second temps.

### Nouvelle structure de routing
- `/` → **Landing** (style Lovable) : hero + textarea géant + galerie d'exemples + sélecteur catégories
- `/studio` → l'éditeur actuel (StatementEditor + JsonEditor + Canvas + Toolbar)

Routing dans `src/App.tsx` (déjà sur `BrowserRouter` ou à ajouter).

### Page Landing (`src/pages/Landing.tsx` — nouveau)

```
┌──────────────────────────────────────────────────────────────┐
│  Madox · Schémas physiques générés par IA       [Studio →]   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│              Décris ton exercice de physique                 │
│         L'IA génère le schéma, les forces et l'animation     │
│                                                              │
│   ┌──────────────────────────────────────────────────────┐   │
│   │  Un bloc de 5 kg glisse sur un plan incliné à 30°…  │   │
│   │                                                      │   │
│   │                              [↑ Générer le schéma]   │   │
│   └──────────────────────────────────────────────────────┘   │
│                                                              │
│   Suggestions :                                              │
│   [Plan incliné] [Atwood] [Pendule] [Ressort] [Poulie]      │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   Exemples · Surfaces · Liaisons · Oscillateurs · Combinés  │
│                                                              │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│   │ mini    │ │ mini    │ │ mini    │ │ mini    │           │
│   │ canvas  │ │ canvas  │ │ canvas  │ │ canvas  │           │
│   │ Atwood  │ │ Pendule │ │Ressort  │ │ Plan    │           │
│   └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

- **Hero** : titre + sous-titre, fond avec une légère grille SVG (rappelle un papier millimétré).
- **Textarea géant** : centré, max-width ~720px, placeholder rotatif (3-4 énoncés réalistes), bouton "Générer" intégré en bas-droite, raccourci ⌘+Entrée.
- **Suggestions cliquables** : pré-remplissent la textarea.
- **Galerie d'exemples** : cartes cliquables avec **mini-rendu SVG** (réutilise `SchemaCanvas` en mode `readOnly` + `noControls` + viewport zoomé). Filtres par catégorie (tabs en haut de la galerie).
- Click sur un exemple ou "Générer" → navigate vers `/studio` avec le schéma pré-chargé (state ou query param).

### Page Studio (`src/pages/Index.tsx` renommée → `Studio.tsx`, route `/studio`)
- Header : breadcrumb "← Retour" + nom du schéma actif + bouton "Nouveau" (revient à la landing).
- Layout existant conservé (StatementEditor + JsonEditor + Canvas + Animation).
- Petit bouton "Plein écran canvas" déjà présent → conservé.

### Style cohérent avec Lovable
- Police : Inter (déjà dans Tailwind par défaut) pour le texte, mono pour le JSON.
- Palette sombre conservée, accent (boutons "Générer") en couleur primaire vive.
- Cartes d'exemple avec hover-scale + border ring sur focus.
- Fond de la landing : `bg-background` avec un overlay grille SVG très subtil (opacity 5%).

### Galerie : mini-rendu
Pour ne pas dupliquer la logique, créer `src/components/schema/SchemaThumbnail.tsx` qui rend un `SchemaCanvas` avec :
- `interactive={false}`, `showAxes={false}`, `showGrid={false}`, `showLabels={true}`
- viewport recalculé pour fit-to-content
- pas de contrôles d'animation, mais affiche l'état t=0 ou t=duration/2 selon l'exemple

---

## Fichiers touchés

| Fichier | Action |
|---|---|
| `src/types/schema.ts` | Étendre `AnimationStepSchema` avec `mode`, `axis`, `amplitude`, `frequency`, `angleFrom`, `angleTo`, `pivot` |
| `src/engine/autoAnimation.ts` | Détection multi-systèmes (pendule, Atwood, ressorts, couplés) + génération adaptée |
| `src/engine/resolver.ts` | Appliquer les overrides translate/rotate/oscillate aux composants |
| `src/hooks/useAnimation.ts` | Calculer overrides selon `mode` |
| `src/components/schema/SchemaCanvas.tsx` | Recalculer cordes/ressorts/projections à chaque frame depuis positions overridées |
| `src/engine/geometry.ts` | + `pickTangentOver(P, C, r, exitDir)` |
| `src/engine/ropes.ts` | Résoudre `auto` en fonction des sides verticaux voisins (forcer enroulement par-dessus) |
| `src/engine/anchors.ts` | Warn console si corde traverse un solide |
| `src/data/examples.ts` | Vérifier les 9 exemples, ajuster si besoin |
| `src/App.tsx` | Ajouter route `/` → Landing, `/studio` → Studio |
| `src/pages/Landing.tsx` | **Nouveau** — page d'accueil style Lovable |
| `src/pages/Index.tsx` → `src/pages/Studio.tsx` | Renommer + ajouter bouton retour |
| `src/components/schema/SchemaThumbnail.tsx` | **Nouveau** — mini-rendu pour la galerie |
| `src/components/landing/HeroPrompt.tsx` | **Nouveau** — textarea géante + suggestions |
| `src/components/landing/ExampleGallery.tsx` | **Nouveau** — galerie filtrable |
| `supabase/functions/generate-schema/index.ts` | Ajuster prompt : insister sur passage **par-dessus** poulie quand masse pend en dessous |

## Livrables vérifiables

1. **Pendule simple** : appuyer sur Play → le bob oscille de gauche à droite, la corde suit.
2. **Atwood** : Play → m₂ (3 kg) descend, m₁ (2 kg) monte, les cordes s'allongent/raccourcissent autour de la poulie.
3. **Ressort horizontal** : Play → le bloc oscille, le ressort se comprime/détend.
4. **2 blocs + poulie au bord de table** : la corde passe **par-dessus** la poulie (visuel correct), Play → bloc B descend, bloc A glisse vers la droite.
5. **Page d'accueil refondue** : hero + textarea + galerie cliquable, navigation vers `/studio` au clic.
6. **Tous les exemples** générés depuis la landing s'animent automatiquement sans configuration manuelle.

Aucune clé API requise (Lovable AI déjà branché). Tout est livré en une seule passe.
