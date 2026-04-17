Parfait, on va transformer ton plan en une **spec béton, exploitable direct par Lovable**, avec zéro zone floue et aucun comportement implicite dangereux.

Je garde ta structure, mais je l’upgrade en **v2.1 — production-ready**, avec les correctifs critiques intégrés.

---

# 🚀 Madox v2.1 — Solveur géométrique contraint (spec finale)

## 🧠 Objectif

Passer de :

```text
Renderer déterministe

```

à :

```text
Solveur géométrique + moteur de contraintes + visualisation physique exacte

```

Avec :

- précision géométrique stricte
- cohérence physique visuelle
- stabilité numérique

---

# 1. 🔁 PIPELINE MULTI-PASS (AMÉLIORÉ)

```text
PASS 1  Placement brut
PASS 2  Géométrie dérivée
PASS 3  Résolution contraintes (pondérée)
PASS 4  Snapping & stabilisation
PASS 5  Finalisation géométrique (paths)
PASS 6  Génération forces (autoForces)
PASS 7  Render SVG

```

---

## 🔥 NOUVEAU : boucle de convergence

```ts
for (let i = 0; i < MAX_ITER; i++) {
  applyConstraintsWeighted()
  if (converged()) break
}

```

```ts
const MAX_ITER = 5
const EPSILON = 1e-6

```

---

# 2. 🧠 CONTRAINTES AVEC PRIORITÉ & POIDS

## Nouveau format :

```json
{
  "type": "horizontal",
  "object": "ressort1",
  "priority": 10,
  "weight": 1.0
}

```

---

## 🎯 Règles moteur :

- tri par `priority DESC`
- application avec **relaxation pondérée**
- correction partielle :

```ts
position += correction * weight

```

---

## ⚠️ Gestion conflits :

- contraintes incompatibles → warning console + fallback
- log dev mode :

```text
[ConstraintConflict] ressort1: horizontal vs colinear

```

---

# 3. 🧩 ANCHOR DSL (FINAL)

## Type complet :

```ts
type AnchorRef =
  | { kind: "point"; id: string; anchor: string; offset?: Point }
  | { kind: "curve"; id: string; curve: string; t: number }
  | { kind: "tangent"; from: string; to: string; side?: "external"|"internal"|"auto" }
  | { kind: "face"; id: string; face: "top"|"bottom"|"left"|"right"; align?: "center" }
  | { kind: "normal"; id: string; at?: AnchorRef; length?: number }

```

---

## 🔥 NOUVEAU : sélection automatique intelligente

```json
{
  "type": "attach_best_face",
  "object": "bloc",
  "towards": "poulie"
}

```

👉 Choix :

```text
max(dot(normal_face, direction_target))

```

---

# 4. 📐 ANCHORS PAR COMPOSANT (COMPLÉTÉ)

## Block

```text
- cog
- face_*_center
- normal_*
- contact_surface

```

---

## Incline

```text
- surface(t)
- normal(t)
- tangent(t)
- top
- foot

```

---

## Pulley

```text
- center
- tangent_point(target, side)
- arc(startAngle, endAngle)

```

---

# 5. 🧵 ROPE ENGINE (CRITIQUE)

## Nouveau modèle :

```ts
type RopePath = [
  LineSegment,
  ArcSegment,
  LineSegment
]

```

---

## 🔥 Solveur global :

```ts
solveRopePath(A, pulley, B)

```

Retourne :

- tangente A → poulie
- arc sur poulie
- tangente poulie → B

---

## 🎯 Contraintes supportées :

- `tension`
- `tension_equal`
- `vertical`
- `horizontal`

---

## ⚠️ Règles :

- corde = inextensible (`stretch = 0`)
- segments toujours continus
- tangence exacte (pas d’approx)

---

# 6. 🌀 RESSORT (FIX CRITIQUE)

## Axe défini par contraintes :

```json
{ "type": "horizontal", "object": "ressort" }

```

---

## Rendu :

- spirale projetée sur axe
- jamais basé sur from→to brut

---

## 🔥 Force automatique :

```text
F = -k * (longueur - longueur_repos)

```

---

# 7. 🧲 AUTO FORCES (CORRIGÉ)

## Dépend de :

- PASS 2 (normales)
- PASS 3 (contraintes)

---

## Génération :

### Bloc :

- poids (↓)
- normale (⊥ surface)
- frottement (// surface)

---

### Corde :

- tension (direction locale corde)

---

### Ressort :

- force alignée sur axe

---

## ⚠️ Interdiction :

❌ pas de direction hardcodée  
✅ toujours dérivée

---

# 8. 📍 REPÈRES LOCAUX (UPGRADE)

## Nouveau format :

```json
{
  "type": "local_frame",
  "of": "bloc",
  "origin": "cog",
  "mode": "surface_aligned",
  "style": "dashed"
}

```

---

## Axes :

- `surface_aligned` → tangent + normal
- `world_aligned` → X/Y global

---

## 🔥 Projection :

```json
{
  "type": "projection",
  "force": "P",
  "onto": "bloc.frame",
  "components": ["x", "y"]
}

```

---

## Rendu :

- pointillés
- labels Px / Py
- angles visibles

---

# 9. 📏 SNAP & STABILITÉ NUMÉRIQUE

## Global :

```ts
const EPSILON = 1e-6

```

---

## Règles :

```ts
if (Math.abs(dx) < EPSILON) dx = 0
if (Math.abs(dy) < EPSILON) dy = 0

```

---

## Effets :

- lignes parfaitement horizontales/verticales
- pas de jitter
- rendu propre

---

# 10. ⚙️ PROPRIÉTÉS PHYSIQUES

## Nouveau champ :

```json
"physics": {
  "rigid": true,
  "stretch": 0
}

```

---

## Usage :


| Objet   | Propriété    |
| ------- | ------------ |
| corde   | stretch = 0  |
| ressort | stretch > 0  |
| bloc    | rigid = true |


---

# 11. 🧭 FRAME (FINAL)

```json
"frame": {
  "world": { "unit": "m", "yAxis": "up" },
  "camera": { "x": 0, "y": 0, "zoom": 100 },
  "screen": { "auto": true }
}

```

---

# 12. 🧠 CAS LIMITES (OBLIGATOIRE)

Dans `geometry.ts` :

```ts
if (distance < EPSILON) fallback()
if (angle ≈ 0) simplify()
if (vertical) snap()

```

---

# 13. 📦 FICHIERS (FINAL)

### Core engine

- `resolver.ts` → pipeline multi-pass + convergence
- `constraints.ts` → solveurs pondérés
- `geometry.ts` → primitives robustes
- `ropes.ts` → solveur complet corde
- `autoForces.ts` → forces dérivées

---

### Rendering

- `Rope.tsx` → path SVG (line + arc)
- `Spring.tsx` → spirale alignée
- `LocalFrame.tsx`
- `Projection.tsx`

---

# 14. 🎯 CORRECTIONS DIRECTES DE TES BUGS

## ✔ Ressort incliné

→ contrainte `horizontal` + axe imposé

## ✔ Mauvais point d’attache

→ `attach_best_face`

## ✔ Cordes pas tendues

→ `tension` + rope solver

## ✔ Atwood faux

→ une seule corde + arc poulie

## ✔ Forces manquantes

→ `autoForces`

## ✔ Pas de repères locaux

→ `local_frame`

## ✔ Directions fausses

→ dérivées via contraintes

---

# 🧠 VERDICT FINAL

👉 Cette version :

```text
v2.1 = moteur géométrique robuste + solveur stable + rendu physiquement cohérent

```

---

# 🔥 Niveau atteint

Avec ça tu es à :

```text
GeoGebra physique programmable + moteur pédagogique

```

---

# 🚀 Next step (quand tu seras prêt)

- génération automatique des équations
- export PDF exercices
- mode “résolution guidée”

---

Si tu veux, je peux te faire ensuite :

👉 un **exemple JSON v2.1 parfait (Atwood + projections + contraintes)**  
👉 ou carrément **le pseudo-code complet du solveur**

Là, ton moteur est prêt à devenir un vrai produit.  
  
  
  
Madox v2 — Du renderer au solveur géométrique avec contraintes

## Diagnostic accepté

Le moteur v1 est un **placement engine** : `JSON → topo sort → resolve → render`. Il ne sait pas garantir qu'une corde est *réellement* tangente, qu'un ressort est *vraiment* horizontal, ou qu'une corde Atwood est *continue* sur la poulie. On passe à un **constraint-driven geometric engine** multi-pass.

## Les 6 chantiers

### 1. Pipeline multi-pass (cœur)

Remplacer le single-pass par 5 passes :

```text
PASS 1  Placement brut       (ancrages simples : at, anchor.ref → point)
PASS 2  Géométrie dérivée    (faces, normales, tangentes candidates)
PASS 3  Résolution contraintes (alignements, tangentes, tension, vertical/horizontal)
PASS 4  Finalisation         (positions corrigées + chemins de cordes/ressorts)
PASS 5  Render SVG
```

Itératif si nécessaire (relaxation 2-3 tours pour contraintes couplées).

### 2. AnchorRef typé (DSL géométrique)

Remplacer `{ ref: "bloc1.cog" }` (string parser fragile) par une **union discriminée** :

```ts
type AnchorRef =
  | { kind: "point";   id: string; anchor: string; offset?: Point }
  | { kind: "curve";   id: string; curve: string;  t: number }
  | { kind: "tangent"; from: string; to: string; side?: "external"|"internal"|"upper"|"lower" }
  | { kind: "face";    id: string; face: "top"|"bottom"|"left"|"right"; align?: "center"|"start"|"end" }
  | { kind: "normal";  id: string; at?: AnchorRef; length?: number }
```

Validation Zod stricte → erreurs **compile-time / parse-time**, plus à l'exécution.

### 3. Anchors enrichis par composant

Ajouts obligatoires :


| Composant | Nouveaux anchors                                                                                                                               |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `block`   | `face_top_center`, `face_bottom_center`, `face_left_center`, `face_right_center`, `normal_top`, `normal_bottom`, `normal_left`, `normal_right` |
| `incline` | `surface(t)`, `normal(t)`, `tangent(t)`, `top`, `foot`, `face_top_center`                                                                      |
| `pulley`  | `tangent_point(dirRef, side)`, `arc(angleStart, angleEnd)`, `contact_point(angle)`                                                             |
| `sphere`  | `normal(angle)`, `tangent_point(targetRef)`                                                                                                    |


### 4. Système de contraintes (nouveau bloc JSON)

```json
"constraints": [
  { "type": "horizontal", "object": "ressort1" },
  { "type": "vertical",   "object": "corde2" },
  { "type": "colinear",   "points": ["A", "B", "C"] },
  { "type": "tangent",    "rope": "c1", "pulley": "p1", "side": "external" },
  { "type": "attach_face_center", "rope": "c1", "object": "bloc1", "face": "top" },
  { "type": "tension",    "rope": "c1" },
  { "type": "tension_equal", "rope": "c1" }
]
```

**Solveur** : pour chaque contrainte, fonction de projection qui ajuste les ancrages calculés en PASS 1-2.

### 5. Cordes & ressorts comme chemins multi-segments

Au lieu d'une simple ligne `from → to` :

```ts
type RopePath = Array<
  | { type: "line"; from: Point; to: Point }
  | { type: "arc";  center: Point; radius: number; startAngle: number; endAngle: number; sweep: 0|1 }
>
```

- **Atwood** : 1 seule corde `path: ["m1.top", "p1.arc", "m2.top"]` → résolution auto des deux tangentes + arc supérieur.
- **Ressort** : axe défini par contrainte (`horizontal`/`vertical`/`colinear`) → spirale alignée le long de cet axe, **jamais oblique par accident**.
- **Tangente réelle** : choix correct entre les 2 solutions via le champ `side` ou heuristique (côté opposé à la masse).

### 6. Repères locaux + projections (feature pédagogique majeure)

Nouveau composant :

```json
{ "type": "local_frame", "of": "bloc1", "mode": "surface_aligned", "axes": ["x'", "y'"], "style": "dashed" }
```

- `surface_aligned` : x' = tangente du support sous-jacent, y' = normale.
- `world_aligned` : x' = horizontal, y' = vertical.

Et la projection automatique :

```json
{ "type": "projection", "force": "P", "onto": "bloc1.frame", "show": ["x", "y"], "labels": ["Px", "Py"] }
```

Rendu : composantes en pointillés + labels.

### 7. Forces automatiques (bonus pédagogique)

Champ `autoForces: true` sur un objet → génère :

- **Bloc sur surface** : poids `P`, normale `N`, frottement `f` (si déclaré).
- **Ressort** : force `F = -k·x` aux deux extrémités, le long de l'axe.
- **Corde** : tension `T` aux extrémités, le long de la tangente locale.

### 8. Caméra séparée du monde (nettoyage repère)

Refactor `frame` :

```json
"frame": {
  "world":  { "unit": "m", "yAxis": "up" },
  "camera": { "x": 0, "y": 0, "zoom": 100 },
  "screen": { "auto": true }
}
```

`scale` → `camera.zoom`. Préparation zoom/pan dynamique futur.

## Fichiers touchés


| Fichier                                      | Action                                                                                                            |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `src/types/schema.ts`                        | AnchorRef typé (union), `constraints[]`, `local_frame`, `projection`, `frame.camera`, refactor cordes en `path[]` |
| `src/engine/anchors.ts`                      | Ajouter face_centers, normals, tangent_point, arc, surface(t)/normal(t)/tangent(t)                                |
| `src/engine/resolver.ts`                     | Réécrit en 5 passes                                                                                               |
| `src/engine/constraints.ts`                  | **Nouveau** — solveurs : horizontal, vertical, colinear, tangent, attach_face_center, tension                     |
| `src/engine/geometry.ts`                     | **Nouveau** — primitives : tangente cercle-point, projection, intersection, arc-path                              |
| `src/engine/ropes.ts`                        | **Nouveau** — construction de `RopePath` multi-segments (lignes + arcs)                                           |
| `src/engine/autoForces.ts`                   | **Nouveau** — génération forces P, N, T, F_ressort                                                                |
| `src/components/schema/parts/Rope.tsx`       | Render path multi-segments (line + arc en SVG)                                                                    |
| `src/components/schema/parts/Spring.tsx`     | Spirale alignée sur axe résolu                                                                                    |
| `src/components/schema/parts/LocalFrame.tsx` | **Nouveau** — repère local pointillé                                                                              |
| `src/components/schema/parts/Projection.tsx` | **Nouveau** — composantes + labels                                                                                |
| `src/data/examples.ts`                       | Réécrire les 4 exemples avec contraintes + repères locaux + autoForces                                            |


## Stratégie de migration

- **Rétrocompatibilité** : l'ancien format string (`{ ref: "bloc1.cog" }`) reste accepté → normalisé en interne vers `{ kind: "point", id, anchor }`. Pas de casse pour les exemples existants.
- **Opt-in** : `constraints[]`, `autoForces`, `local_frame` sont optionnels. Un schéma v1 continue de marcher.
- **Validation** : Zod produit des messages d'erreur précis pointant la ligne/champ fautif.

## Livrables de l'itération

1. Solveur multi-pass fonctionnel + 8 types de contraintes.
2. AnchorRef typé partout (rétrocompat string preservée).
3. Cordes Atwood **réellement continues** sur poulie (arc + 2 tangentes).
4. Ressort horizontal **garanti horizontal** par contrainte.
5. Tangente corde-poulie **mathématiquement exacte** (choix de side).
6. Repères locaux + projection des forces sur 1 exemple (bloc sur incliné).
7. AutoForces sur les 4 exemples (P, N, T générés automatiquement).
8. Frame refactoré (`world`/`camera`/`screen`).