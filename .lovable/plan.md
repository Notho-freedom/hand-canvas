
# Pivot Madox → Moteur de schémas physiques

## Vision
Remplacer toute la logique hand-tracking/widgets par un **moteur de rendu de schémas physiques** piloté par JSON, avec un repère cartésien configurable par schéma. Objectif : précision absolue de positionnement (forces au CdG, poulies au sommet exact d'un plan incliné, cordes alignées sur les ancrages, etc.).

## Architecture

```text
+-----------------------------------------------------------+
| App = split-screen toggleable                             |
|                                                           |
| [ Editeur JSON ]  |  [ Canvas SVG plein ecran ]           |
|  - Schema valide  |   - Repere (toggle on/off)            |
|  - Erreurs live   |   - Grille + graduations              |
|  - Exemples       |   - Composants positionnes au pixel   |
|                   |   - Toggle: repere / grille / labels  |
+-----------------------------------------------------------+
```

## Modèle JSON (précis et scalable)

```json
{
  "frame": {
    "origin": { "x": 0, "y": 0 },         // origine en unites monde
    "unit": "m",
    "scale": 100,                          // 1 unite = 100 px
    "yAxis": "up",                         // "up" (math) ou "down" (ecran)
    "viewport": { "x": -2, "y": -1, "w": 8, "h": 5 }
  },
  "components": [
    {
      "id": "sol",
      "type": "ground",
      "at": { "x": 0, "y": 0 },
      "params": { "length": 6, "thickness": 0.05 }
    },
    {
      "id": "plan1",
      "type": "incline",
      "anchor": { "ref": "sol.right" },    // ancrage nomme
      "params": { "angle": 30, "length": 4, "thickness": 0.05 }
    },
    {
      "id": "bloc1",
      "type": "block",
      "anchor": { "ref": "plan1.surface", "t": 0.5 }, // 50% le long de la surface
      "params": { "w": 0.6, "h": 0.4, "mass": 5 },
      "rotation": "auto"                   // s'aligne sur le plan
    },
    {
      "id": "poulie1",
      "type": "pulley",
      "anchor": { "ref": "plan1.top" },
      "params": { "radius": 0.2 }
    },
    {
      "id": "corde1",
      "type": "rope",
      "from": { "ref": "bloc1.cog" },
      "to":   { "ref": "poulie1.tangent_to:bloc1" }
    },
    {
      "id": "poids_bloc1",
      "type": "force",
      "at": { "ref": "bloc1.cog" },
      "vector": { "magnitude": 49, "direction": "down" },
      "label": "P"
    }
  ]
}
```

**Clés de la précision** :
- **Ancrages nommés** par composant (`.cog`, `.top`, `.bottom`, `.left`, `.right`, `.surface`, `.tangent_to:X`) — chaque type expose ses points caractéristiques.
- **Référencement** (`anchor.ref`) résolu dans un graphe de dépendances → topological sort avant rendu.
- **Coordonnées paramétriques** (ex: `t: 0.5` le long d'une surface) pour positionner sur des courbes/segments.
- **Rotation auto** : un objet posé sur une surface inclinée hérite de l'angle.
- **Vecteurs ancrés** : forces toujours appliquées à un point logique (`.cog`, `.contact_point`).

## Bibliothèque de composants

| Catégorie | Composants | Ancrages exposés |
|---|---|---|
| Surfaces | `ground`, `wall`, `incline`, `curve` | `.left`, `.right`, `.top`, `.bottom`, `.surface(t)`, `.normal(t)` |
| Objets | `block`, `sphere`, `pulley`, `pendulum_bob` | `.cog`, `.contact_point`, `.tangent_to:X` |
| Liens | `rope`, `spring`, `rigid_rod`, `chain` | `.from`, `.to`, `.midpoint` |
| Vecteurs | `force`, `velocity`, `acceleration`, `axis`, `angle_arc` | (consomment des refs) |
| Annotations | `label`, `dimension`, `coordinate_marker` | — |

## Moteur de résolution (le cœur du projet)

1. **Parse JSON** → validation schéma (Zod).
2. **Build dependency graph** des `anchor.ref`.
3. **Topological sort** : on calcule les composants sans deps d'abord.
4. **Resolve anchors** : chaque composant calcule ses points en coordonnées monde, puis ses ancrages dérivés.
5. **Apply frame transform** : monde → écran (origine, scale, yAxis).
6. **Render SVG** : chaque composant = fonction pure `(resolved) => <g>...</g>`.

## Interface

- **Layout split** : éditeur JSON Monaco à gauche (40%), canvas SVG à droite (60%).
- **Toolbar canvas** :
  - Toggle repère (axes X/Y avec flèches et labels)
  - Toggle grille (subdivisions selon `scale`)
  - Toggle labels composants
  - Toggle ancrages (debug : affiche tous les points nommés)
  - Bouton plein écran (cache l'éditeur)
  - Sélecteur d'exemples (plan incliné simple, Atwood, pendule, poulie+plan, ressort+masse...)
- **Validation live** : erreurs JSON + erreurs sémantiques (ref introuvable, cycle, etc.) affichées en bas de l'éditeur.

## Fichiers à créer

| Fichier | Rôle |
|---|---|
| `src/types/schema.ts` | Types TS + schéma Zod du JSON |
| `src/engine/frame.ts` | Transform monde↔écran selon `frame` |
| `src/engine/resolver.ts` | Graphe deps + topo sort + résolution ancrages |
| `src/engine/anchors.ts` | Calcul des ancrages par type de composant |
| `src/components/schema/Frame.tsx` | Repère, grille, axes (SVG) |
| `src/components/schema/SchemaCanvas.tsx` | Canvas SVG principal + viewBox |
| `src/components/schema/parts/Ground.tsx` | + `Wall`, `Incline`, `Block`, `Sphere`, `Pulley`, `Rope`, `Spring`, `Rod`, `Force`, `Velocity`, `Axis`, `Label`, `Dimension` (un fichier par composant) |
| `src/components/schema/JsonEditor.tsx` | Éditeur (textarea stylé ou Monaco light) + validation |
| `src/components/schema/Toolbar.tsx` | Toggles repère/grille/labels/ancrages + plein écran |
| `src/data/examples.ts` | Schémas JSON d'exemple |
| `src/pages/Index.tsx` | Réécrit : split-screen éditeur + canvas |

## Fichiers à supprimer (ancien projet)
`src/hooks/useHandTracking.ts`, `useHandInteraction.ts`, `useWidgetManager.ts`, `src/components/MadoxCanvas.tsx`, `MadoxHUD.tsx`, `MadoxWidgetRenderer.tsx`, `NavLink.tsx`, tout `src/components/widgets/*`, `src/lib/smoothing.ts`, `src/types/madox.ts`. Désinstaller `@mediapipe/*`.

## Détails techniques de précision

- **SVG plutôt que Canvas** : positionnement vectoriel exact, zoom infini sans pixellisation, sélection/inspection facile.
- **viewBox dynamique** : calculé depuis `frame.viewport` → garantit que les coordonnées monde mappent exactement à l'écran.
- **Y-flip** : si `yAxis: "up"`, on applique `transform="scale(1,-1)"` au groupe racine, et on contre-flip les textes.
- **Ancrage `tangent_to`** : pour une corde sur poulie, calcul géométrique réel de la tangente (pas une approximation).
- **Rotation auto** : un bloc sur incline reçoit `rotation = incline.angle` et son point de contact = base centrée.
- **Centre de gravité** : chaque type a une formule (`block.cog = centre`, `incline.cog = barycentre triangle`, etc.).

## Livrable de cette itération
Le moteur complet + 4 exemples fonctionnels : (1) bloc sur plan incliné avec poids/normale/frottement, (2) poulie en sommet de plan + masse suspendue + corde, (3) Atwood (deux masses + poulie), (4) ressort horizontal sur sol avec masse.
