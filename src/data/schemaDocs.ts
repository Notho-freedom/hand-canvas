/**
 * Documentation complète du schéma JSON Madox.
 * Sert de system prompt pour l'IA et de référence dans l'UI.
 */
export const SCHEMA_DOCS = `# Madox — Schéma JSON pour diagrammes de physique

Tu génères un objet JSON conforme au schéma ci-dessous. RENDS UNIQUEMENT du JSON valide.

## Structure racine
{
  "frame": { ... },
  "components": [ ... ],
  "constraints": [ ... ],   // optionnel
  "animation": { ... }       // optionnel
}

## frame
{ "origin": {"x":0,"y":0}, "unit": "m", "scale": 90, "yAxis": "up",
  "viewport": {"x":-1, "y":-0.5, "w":7, "h":4.5} }
- "yAxis": "up" (mathématique) recommandé.
- "scale" : pixels par unité (typique 80-100).
- "viewport" : zone monde visible.

## Composants disponibles (champ "type")

### "ground" (sol horizontal)
{ "id":"sol", "type":"ground", "at":{"x":2,"y":0},
  "params":{ "length":6, "thickness":0.05 } }
Anchors: left, right, surface(t), cog, top, bottom, face_top_center, normal_top.

### "wall" (mur vertical)
{ "id":"mur", "type":"wall", "at":{"x":0.2,"y":0},
  "params":{ "height":1, "thickness":0.05, "side":"left" } }
"side": "left" = mur dont la face active regarde à droite.
Anchors: bottom, top, surface(t), face_left_center, face_right_center.

### "incline" (plan incliné)
{ "id":"plan", "type":"incline",
  "anchor":{"ref":"sol.surface","t":0.25},
  "params":{ "angle":30, "length":3.5, "thickness":0.05, "direction":"right" } }
"angle" en degrés, "direction": "right" monte vers la droite.
Anchors: foot, top, surface(t), normal, tangent, cog.

### "block" (solide rectangulaire)
{ "id":"bloc", "type":"block",
  "anchor":{"kind":"curve","id":"plan","curve":"surface","t":0.5},
  "rotation":"auto",
  "params":{ "w":0.6, "h":0.4, "mass":5 },
  "label":"m",
  "autoForces":["P","N","f","T"] }
"rotation":"auto" sur un plan incliné = aligné sur la pente.
"autoForces": génère P (poids), N (réaction normale), f (frottement), T (tension de corde).
Anchors: cog, top, bottom, face_top_center, face_bottom_center, face_left_center, face_right_center.

### "sphere"
{ "id":"boule", "type":"sphere", "at":{"x":2,"y":1},
  "params":{ "radius":0.3, "mass":1 } }

### "pulley" (poulie)
{ "id":"poulie", "type":"pulley",
  "anchor":{"ref":"plan.top","offset":{"x":0.1,"y":0.25}},
  "params":{ "radius":0.18 }, "label":"P" }

### "rope" (corde) — 2 modes

Mode 1 — chemin libre avec wrap autour de poulie :
{ "id":"corde", "type":"rope",
  "path":[
    { "kind":"face","id":"blocA","face":"top" },
    { "wrap":"poulie", "side":"auto" },
    { "kind":"face","id":"blocB","face":"top" }
  ] }
"side" sur wrap : "auto"|"upper"|"lower"|"left"|"right".
*** IMPORTANT : pour une masse SUSPENDUE sous une poulie, utiliser "side":"left" ou "right".
Cela force la corde à être STRICTEMENT VERTICALE (gravité). ***

Exemple masse pendue :
{ "id":"cordeB", "type":"rope",
  "path":[
    { "wrap":"poulie", "side":"right" },
    { "kind":"face","id":"blocB","face":"top" }
  ] }

### "pulley_rope_system" (raccourci Atwood)
Génère 2 cordes verticales + arc supérieur en une seule entité.
{ "id":"systeme", "type":"pulley_rope_system",
  "pulley":"poulie",
  "leftAttach":{"kind":"face","id":"m1","face":"top"},
  "rightAttach":{"kind":"face","id":"m2","face":"top"} }
Les blocs doivent être décalés horizontalement (pas alignés sous la poulie).

### "spring" (ressort)
{ "id":"ressort", "type":"spring",
  "from":{"kind":"curve","id":"mur","curve":"surface","t":0.5},
  "to":{"kind":"face","id":"bloc","face":"left"},
  "params":{ "coils":10, "width":0.12 } }
*** Important : pour un ressort horizontal, ajouter une contrainte
{ "type":"horizontal", "object":"ressort" } ET aligner les hauteurs : si bloc h=1
et bloc.at.y=0, alors face_left_center est à y=0.5 — ancrer le mur surface(0.5) avec mur.height=1. ***

### "rigid_rod"
{ "id":"tige", "type":"rigid_rod", "from":{...}, "to":{...} }

### "force" / "velocity" / "acceleration"
{ "id":"F", "type":"force", "at":{"ref":"bloc.cog"},
  "vector":{ "direction":"right", "magnitude":30 }, "label":"F" }
"vector" peut être : { "direction":"up|down|left|right", "magnitude":N }
                     | { "angle":deg, "magnitude":N }
                     | { "dx":N, "dy":N }

### "axis"
{ "id":"x", "type":"axis", "at":{"x":1.5,"y":1.6},
  "params":{ "angle":0, "length":1, "name":"x" } }

### "angle_arc"
{ "id":"alpha", "type":"angle_arc", "at":{"ref":"plan.foot"},
  "params":{ "from":0, "to":30, "radius":0.5 }, "label":"α" }

### "label"
{ "id":"l1", "type":"label", "at":{"x":1,"y":2},
  "params":{ "text":"A" } }

### "dimension"
{ "id":"d1", "type":"dimension", "from":{...}, "to":{...},
  "params":{ "text":"L", "offset":0.3 } }

### "local_frame" (repère local attaché à un solide)
{ "id":"frame_bloc", "type":"local_frame", "of":"bloc", "origin":"cog",
  "mode":"surface_aligned", "axes":["x'","y'"], "length":1.4, "bidirectional":true }
"mode": "surface_aligned" (x'=tangente, y'=normale du support) ou "world_aligned".
"length": longueur de chaque demi-axe (sera dessiné aussi en négatif si bidirectional).

### "projection" (projection d'une force sur un repère)
{ "id":"proj_P", "type":"projection",
  "force":"P_user", "onto":"bloc.frame",
  "components":["x","y"], "labels":["Px","Py"], "showRectangle":true }
"force" = id d'un composant force ; "onto" = "<solideId>.frame".

### "pendulum"
{ "id":"pendule", "type":"pendulum", "pivot":{"x":2,"y":3},
  "params":{ "length":1.5, "angle":20, "bobRadius":0.15 } }

## Références (anchors)
- Forme courte : {"ref":"objetId.anchorName"} ou {"ref":"objetId.curveName","t":0.5}
- Forme typée :
  {"kind":"point","id":"bloc","anchor":"cog"}
  {"kind":"curve","id":"plan","curve":"surface","t":0.5}
  {"kind":"face","id":"bloc","face":"top"|"bottom"|"left"|"right"}
  {"kind":"normal","id":"bloc","length":0.5}
  {"kind":"tangent","from":"poulie","to":"bloc","side":"upper"|"lower"|"auto"}
  {"kind":"best_face","id":"bloc","towards":"poulie"}
- offset optionnel : {"ref":"...","offset":{"x":0,"y":0.1}}

## constraints (contraintes)
[ { "type":"horizontal", "object":"ressort" },
  { "type":"vertical", "object":"corde" },
  { "type":"colinear", "points":["A.cog","B.cog"] },
  { "type":"tangent", "rope":"c1", "pulley":"p1", "side":"external" },
  { "type":"attach_face_center", "rope":"c1", "object":"bloc", "face":"top", "end":"from" },
  { "type":"tension", "rope":"c1" },
  { "type":"tension_equal", "rope":"c1" } ]

## animation (timeline d'apparition + mouvements)
{ "duration":6, "autoplay":false,
  "initiallyHidden":["frame_bloc","P_user","proj_P"],
  "steps":[
    { "at":0.5, "show":["frame_bloc"] },
    { "at":1.5, "show":["P_user"] },
    { "at":2.5, "show":["proj_P"] },
    { "at":3.5, "animate":{"id":"bloc","along":"plan.surface","from":0.55,"to":0.05,"duration":2.5} }
  ] }
"animate.along" : un id de courbe au format "<objetId>.<curveName>" (ex "plan.surface").
"from"/"to" : valeurs de t le long de la courbe (0..1).

## RÈGLES PHYSIQUES À RESPECTER

1. Une masse PENDUE sous une poulie tire la corde STRICTEMENT VERTICALEMENT.
   → utiliser "side":"left"/"right" sur le wrap, OU le composant "pulley_rope_system".

2. Pour un ressort horizontal entre mur et bloc :
   - Ajouter contrainte { "type":"horizontal", "object":"<springId>" }.
   - Aligner verticalement : mur.height = bloc.h, et tous deux posés à at.y=0.

3. Sur un plan incliné, un bloc DOIT avoir "rotation":"auto" et un anchor en "curve":"surface".

4. Pour montrer les forces et projections sur plan incliné, AJOUTER systématiquement :
   - un "local_frame" avec mode:"surface_aligned" et length>=1.2, bidirectional:true ;
   - une force "P" pointant vers le bas ;
   - une "projection" de P sur le frame du solide.

5. Pour une machine d'Atwood, utiliser "pulley_rope_system" et décaler les deux blocs
   horizontalement pour qu'ils ne soient pas alignés sous la poulie.

6. Toujours inclure le sol "ground" sous tout système avec gravité visible.

Génère un JSON COMPLET et VALIDE qui répond à l'énoncé fourni.
`;
