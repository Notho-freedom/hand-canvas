
# 🖐️ Projet Madox — Plan d'implémentation

## Vision
Interface web interactive permettant de manipuler des objets avec les mains via la webcam, sans matériel supplémentaire. Style minimaliste/dark avec un rendu Canvas 2D.

---

## Phase 1 — Setup & Détection des mains
- Intégrer **MediaPipe Hands** (via CDN/@mediapipe/hands) dans le projet React
- Activer la webcam en arrière-plan (flux vidéo caché, pas de rendu visible)
- Détecter les 21 points clés de chaque main en temps réel
- Afficher un **canvas plein écran** avec un fond sombre minimaliste
- Visualiser un curseur/indicateur à la position de l'index pour confirmer la détection

## Phase 2 — Canvas & Objets
- Créer un système d'objets dynamiques sur le Canvas 2D (boules colorées avec effet néon/glow)
- Permettre d'**ajouter des objets** via un bouton ou un geste
- Système de suppression d'objets
- Chaque objet a une position, taille, couleur et état (libre/saisi)
- Rendu en boucle avec `requestAnimationFrame` pour un affichage fluide

## Phase 3 — Saisie & Déplacement (Pinch)
- Détecter le **pinch** (distance pouce ↔ index) pour activer le mode "saisie"
- Quand un pinch est détecté à proximité d'un objet → l'objet est "attrapé"
- L'objet suit le mouvement de la main tant que le pinch est maintenu
- Relâcher le pinch → l'objet est "lâché" à sa position actuelle
- Support multi-mains : chaque main peut saisir un objet indépendamment

## Phase 4 — Lissage & Optimisation
- **Filtre de lissage** (moyenne mobile ou interpolation) pour éliminer les tremblements
- Optimisation du rendu pour maintenir un **FPS fluide** (60fps cible)
- Gestion efficace des collisions simples entre objets (éviter les chevauchements)

## Phase 5 — Feedback visuel & UX
- **Highlight** de l'objet le plus proche de la main (halo lumineux)
- Changement de couleur/taille de l'objet quand il est saisi
- Indicateur visuel du pinch (ex: cercle qui se referme entre pouce et index)
- Curseur de main stylisé (points connectés, style néon sur fond dark)
- Compteur d'objets et indicateur FPS discrets dans un coin
- Instructions visuelles pour guider l'utilisateur (gestes disponibles)

## Phase 6 — Gestes avancés
- **Tap** (pinch rapide) pour sélectionner/désélectionner
- **Swipe** pour "lancer" un objet dans une direction
- Physique simple : inertie quand un objet est lancé, friction pour ralentissement

---

## Design
- **Fond** : Noir/très sombre avec éventuellement une grille subtile
- **Objets** : Cercles avec des couleurs vives néon (cyan, magenta, lime) et effet glow
- **Curseur main** : Points lumineux connectés, style futuriste
- **Typographie** : Minimale, texte clair et discret
- **Animations** : Transitions douces, feedback immédiat
