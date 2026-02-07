
# Projet Madox -- Des boules aux vrais widgets interactifs

## Le changement
On remplace les simples boules dessinées sur le Canvas par de **vrais composants React** (fenêtres, gadgets, panneaux d'info) positionnés en overlay sur le canvas. Les gestes de la main permettent de les **sélectionner, déplacer, zoomer, cliquer, et relâcher**.

## Architecture hybride

Le rendu sera séparé en deux couches :
- **Canvas (arrière-plan)** : grille, squelette de la main, indicateurs visuels des gestes
- **DOM (premier plan)** : les vrais widgets React positionnés en `absolute`, manipulables avec les mains

```text
+---------------------------------------------+
|  Canvas (z-index: 0)                        |
|  - Grille de fond                           |
|  - Squelette main (points + connexions)     |
|  - Indicateur de pinch                      |
+---------------------------------------------+
|  Widget Layer (z-index: 1)                  |
|  - [Horloge]     [Notes]     [Info]         |
|  - Chaque widget = composant React          |
|  - Position/taille controlees par le state  |
+---------------------------------------------+
|  Hand Cursor Overlay (z-index: 2)           |
|  - Curseur de la main au-dessus de tout     |
+---------------------------------------------+
```

## Ce qui change dans le code

### 1. Nouveau type `MadoxWidget` (remplace `MadoxObject`)

Le type `MadoxObject` avec `radius`, `color`, `glowColor` est remplace par un type `MadoxWidget` :

- `id`, `x`, `y`, `width`, `height` -- position et dimensions en pixels
- `scale` -- pour le zoom (pinch-to-zoom)
- `type` -- le type de widget (`'clock'`, `'notes'`, `'info'`, `'weather'`, `'image'`, etc.)
- `title` -- titre affiche dans la barre du widget
- `grabbed`, `grabbedByHand` -- etat de saisie (comme avant)
- `selected` -- etat de selection (highlight quand la main survole)
- `zIndex` -- pour gerer l'empilement des fenetres
- `vx`, `vy` -- inertie quand relache (comme avant)
- `minimized` -- possibilite de reduire le widget

### 2. Nouveau hook `useWidgetManager` (remplace `useObjectManager`)

Gere la collection de widgets avec :
- `addWidget(type, x, y)` -- ajouter un widget d'un type donne
- `removeWidget(id)` -- supprimer un widget
- `updateWidget(id, updates)` -- mettre a jour position, taille, etc.
- `bringToFront(id)` -- amener un widget au premier plan
- `getWidgets()` -- recuperer tous les widgets

### 3. Nouveau hook `useHandInteraction`

Decouple la logique d'interaction main/widgets du rendu :
- Detecte quel widget est sous le curseur de la main (hit-testing rectangulaire)
- Gere les etats : **hover** (main proche), **grab** (pinch sur widget), **drag** (deplacement), **release** (lacher)
- Gere le **pinch-to-zoom** : ecartement de deux doigts pour redimensionner
- Gere le **tap** : pinch rapide pour "cliquer" sur un element du widget
- Emet des evenements que les widgets peuvent ecouter

### 4. Composant `MadoxWidgetRenderer` (remplace le dessin Canvas des boules)

Un composant React qui :
- Rend chaque widget comme un `div` positionne en `absolute`
- Applique `transform: translate(x, y) scale(s)` pour position et zoom
- Ajoute un contour lumineux neon quand le widget est selectionne/saisi
- Affiche une barre de titre avec le nom du widget et un bouton fermer

### 5. Widgets de demonstration

Plusieurs types de widgets pour montrer la polyvalence :

| Widget | Contenu | Interactions |
|--------|---------|-------------|
| **Horloge** | Heure en temps reel, style digital neon | Deplacer, zoomer |
| **Notes** | Zone de texte editable | Deplacer, zoomer, taper pour editer |
| **Info systeme** | FPS, nombre de mains, stats | Deplacer, zoomer |
| **Palette couleurs** | Grille de couleurs | Deplacer, taper pour selectionner |
| **Image** | Affiche une image/placeholder | Deplacer, zoomer |
| **Compteur** | Boutons +/- avec un compteur | Deplacer, taper les boutons |

### 6. Canvas simplifie

Le `MadoxCanvas` est simplifie :
- Ne dessine plus les boules (supprime tout le code de rendu des objets)
- Garde la grille de fond, le squelette de la main, l'indicateur de pinch
- Ajoute un curseur de main dessine au-dessus de tout (sur un canvas separe en z-index 2)

### 7. Gestes supportes

| Geste | Action |
|-------|--------|
| **Main ouverte + survol** | Highlight du widget le plus proche |
| **Pinch (pouce+index) sur un widget** | Saisir et deplacer le widget |
| **Relacher le pinch** | Lacher le widget (avec inertie) |
| **Pinch rapide (tap)** | Cliquer sur un element interactif du widget |
| **Deux mains en pinch sur le meme widget** | Zoom (pinch-to-zoom) |
| **Main ouverte + balayage** | Lancer/pousser le widget |

### 8. HUD mis a jour

Le HUD est adapte :
- Remplace "Ajouter objet" par un menu de types de widgets a ajouter
- Affiche le nombre de widgets au lieu d'objets
- Instructions mises a jour pour les gestes

## Fichiers concernes

| Fichier | Action |
|---------|--------|
| `src/types/madox.ts` | Remplacer `MadoxObject` par `MadoxWidget`, ajouter les types de widgets |
| `src/hooks/useObjectManager.ts` | Remplacer par `src/hooks/useWidgetManager.ts` |
| `src/hooks/useHandInteraction.ts` | Nouveau -- logique interaction main/widgets |
| `src/components/MadoxCanvas.tsx` | Simplifier -- garder grille + mains, supprimer rendu boules |
| `src/components/MadoxWidgetRenderer.tsx` | Nouveau -- rend les widgets React en overlay |
| `src/components/widgets/WidgetWrapper.tsx` | Nouveau -- enveloppe chaque widget (barre titre, glow, etc.) |
| `src/components/widgets/ClockWidget.tsx` | Nouveau -- gadget horloge |
| `src/components/widgets/NotesWidget.tsx` | Nouveau -- gadget notes |
| `src/components/widgets/InfoWidget.tsx` | Nouveau -- gadget infos systeme |
| `src/components/widgets/CounterWidget.tsx` | Nouveau -- gadget compteur |
| `src/components/widgets/ImageWidget.tsx` | Nouveau -- gadget image |
| `src/components/MadoxHUD.tsx` | Modifier -- menu d'ajout de widgets |
| `src/pages/Index.tsx` | Adapter -- utiliser les nouveaux hooks et composants |

## Detail technique important

Le hit-testing (savoir si la main est sur un widget) se fait en comparant la position de l'index (convertie en pixels ecran) avec les rectangles `{x, y, width * scale, height * scale}` de chaque widget. On teste du `zIndex` le plus haut au plus bas pour que le widget au premier plan soit prioritaire.

La physique (inertie + friction + rebonds sur les bords) reste la meme mais s'applique aux rectangles au lieu des cercles.
