

# Madox v3.1 — Animations universelles + systèmes combinés précis + bibliothèque d'exemples

## Diagnostic des bugs actuels

J'ai analysé les exemples actuels en lisant `src/data/examples.ts` et `src/engine/ropes.ts` :

1. **Pas d'animation sur ressort/Atwood** : seul l'exemple "incline" a un bloc `animation`. Les autres n'en ont pas.
2. **Poulie + plan incliné cassé** :
   - Corde attachée à `face_top_center` du bloc au lieu de `face_right_center` (face qui regarde la poulie en haut du plan).
   - Corde passe au-dessus de la poulie alors qu'elle doit s'enrouler par-dessous-côté (tangente naturelle).
   - Masse suspendue mal reliée → décalage visuel.
3. **Pas assez d'exemples** : 4 seulement, pas de combinaisons (2 ressorts, ressort+poulie, double masse…).

## Plan

### 1. Animation universelle & automatique
- **Auto-génération d'animation par défaut** : si aucun champ `animation` n'existe dans le schéma, le moteur en construit une **automatiquement** depuis les composants présents :
  - Apparition séquentielle : surfaces → objets → liens → repères locaux → forces → projections.
  - Mouvement déduit du contexte : bloc sur plan incliné → glisse vers le bas ; ressort horizontal → oscille ; Atwood → masses montent/descendent en opposition ; pendule → balancement.
- **Nouveau** : `src/engine/autoAnimation.ts` qui inspecte le schéma résolu et génère un `Animation` cohérent.
- Le bouton Play marche **partout** sans configuration JSON.

### 2. Correction des systèmes combinés (le vrai chantier)
- **Refonte poulie + plan incliné** dans `examples.ts` :
  - Bloc sur plan : corde partant de `face_right_center` (face haute le long du plan).
  - Poulie placée précisément au sommet du plan, légèrement au-dessus.
  - Corde 1 : du bloc à la poulie en **tangente côté plan** (calcul réel via `pickTangent`).
  - Corde 2 : verticale stricte (`side: "right"`) jusqu'à la masse suspendue.
  - Liaison continue : `pulley_rope_system` étendu pour accepter **un côté = tangente quelconque, un côté = vertical**.
- **Amélioration `ropes.ts`** :
  - Nouveau mode `side: "tangent_to:<id>"` → tangente exacte vers un autre objet du schéma.
  - Détection automatique du « bon côté » de la poulie selon la position relative des deux attaches (pas d'enroulement par-dessus si une masse pend en bas).
- **Validation géométrique** : avertir dans la console si une corde traverse un solide ou si un point d'attache n'est pas sur une face exposée.

### 3. Bibliothèque d'exemples enrichie (10+ scénarios)
Ajouts dans `examples.ts` :
1. Bloc sur plan incliné (existant, corrigé)
2. Poulie + plan incliné + masse suspendue (corrigé)
3. Atwood (existant)
4. Ressort horizontal mur-bloc (existant)
5. **Bloc entre deux ressorts** (gauche + droite)
6. **Deux ressorts en série** + masse
7. **Pendule simple**
8. **Double pendule** (pivot → masse → masse)
9. **Deux blocs reliés par corde** sur plan horizontal avec poulie au bord
10. **Ressort vertical** + masse suspendue
11. **Bloc sur ressort sur plan incliné**
12. **Système Atwood asymétrique** avec frottement

Chaque exemple : forces auto, repère local, projections, animation auto.

### 4. Améliorations IA
- Enrichir `schemaDocs.ts` avec :
  - Section « Systèmes combinés » : patterns recommandés (ressort+bloc, poulie+plan, double ressort…).
  - Règles d'attache par défaut : « ressort horizontal sur bloc → `face_left_center` ou `face_right_center` selon position du mur ».
  - Liste explicite des **noms français** d'objets physiques que l'IA doit reconnaître (poulie, ressort, masse, plan incliné, fil, tige, pendule, sol, mur…).
- Système prompt enrichi pour forcer l'IA à choisir la bonne **face d'attache** selon la géométrie.

### 5. Améliorations UX
- **Sélecteur d'exemples** : passe à un menu déroulant catégorisé (Surfaces, Liaisons, Oscillateurs, Combinés).
- **Bouton « Reset animation »** clairement séparé.
- **Indicateur de validité** : badge vert « Schéma valide » / rouge « erreur » à côté du bouton Generate.

## Fichiers touchés

| Fichier | Action |
|---|---|
| `src/engine/autoAnimation.ts` | **Nouveau** — génération automatique de timeline |
| `src/engine/ropes.ts` | + mode `tangent_to:<id>`, détection auto du bon côté |
| `src/engine/anchors.ts` | Ajouter validations de cohérence |
| `src/data/examples.ts` | Réécrire poulie+plan, ajouter 8 nouveaux exemples |
| `src/data/schemaDocs.ts` | + section systèmes combinés + vocabulaire FR |
| `src/components/schema/Toolbar.tsx` | Sélecteur catégorisé |
| `src/hooks/useAnimation.ts` | Lire animation auto si pas définie |
| `src/components/schema/SchemaCanvas.tsx` | Brancher autoAnimation |
| `supabase/functions/generate-schema/index.ts` | Prompt enrichi |

## Livrables
- Tous les exemples sont **animés automatiquement** sans rien écrire dans le JSON.
- Poulie + plan incliné + masse pendue : visuellement parfait (faces correctes, corde réellement tangente, masse alignée verticalement).
- 12 exemples couvrant les principaux cas de la mécanique du lycée/prépa.
- IA capable de générer des systèmes combinés depuis un énoncé en français.

