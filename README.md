# Madox — Physics Diagram Studio

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/) [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/) [![Supabase](https://img.shields.io/badge/Supabase-2-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/) [![Vitest](https://img.shields.io/badge/Vitest-3-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)

**Décris un exercice de physique. Madox génère un schéma exploitable dans un studio interactif.**

Le dépôt `hand-canvas` contient l'interface web de **Madox**, un outil orienté enseignement de la physique. L'utilisateur décrit un exercice en langage naturel ; l'application envoie l'énoncé à une fonction Supabase `generate-schema`, récupère un schéma structuré, puis l'ouvre dans le Studio pour inspection et manipulation.

## Comment ça marche

```text
Énoncé de physique
       ↓
Landing Madox
       ↓
Supabase Edge Function
   generate-schema
       ↓
Schéma structuré
       ↓
Studio interactif
```

La page d'accueil fournit également une galerie d'exemples classés par catégories : surfaces, liaisons, oscillateurs et problèmes combinés.

## Exemples pris en charge

Le dépôt contient notamment des exemples pour :

- plan incliné avec forces ;
- machine d'Atwood ;
- pendule simple ;
- ressort horizontal ;
- systèmes avec poulie.

L'interface présente les catégories et ouvre les exemples directement dans le Studio.

## Fonctionnalités visibles

- génération de schémas à partir d'un énoncé ;
- Studio séparé de la landing page ;
- galerie d'exemples réutilisables ;
- filtrage par catégorie ;
- génération via Supabase Edge Functions ;
- gestion des erreurs de génération et des limites de requêtes ;
- interface responsive construite avec Tailwind et des composants UI réutilisables.

## Stack technique

- **Frontend:** React 18 + TypeScript
- **Build:** Vite 5
- **Backend:** Supabase, notamment les Edge Functions
- **UI:** Tailwind CSS + Radix UI / shadcn-style components
- **Data fetching:** TanStack Query
- **Forms & validation:** React Hook Form + Zod
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Testing:** Vitest + Testing Library

## Routes

| Route | Rôle |
| --- | --- |
| `/` | Landing page et génération d'un schéma |
| `/studio` | Studio de travail sur les schémas |
| `*` | Page 404 |

## Développement

Prérequis : Node.js et npm.

```bash
npm install
npm run dev
```

Build de production :

```bash
npm run build
```

Lint et tests :

```bash
npm run lint
npm test
```

## Configuration backend

La génération utilise une Edge Function Supabase nommée `generate-schema`. Une configuration Supabase fonctionnelle est donc nécessaire pour utiliser la génération IA depuis l'interface.

Ne committez jamais de clés ou secrets Supabase dans le dépôt ; utilisez les variables d'environnement prévues par l'application.

## Structure

```text
src/
├── components/       # UI, schémas et composants du Studio
├── data/             # Exemples de problèmes physiques
├── integrations/     # Client Supabase
├── pages/            # Landing et Studio
└── App.tsx           # Providers et routing
```

## État du projet

Madox est un prototype/app web expérimental centré sur la génération et l'édition de schémas de physique assistés par IA. Le nom du dépôt historique est `hand-canvas`, mais l'identité produit visible dans le code est **Madox**.

## Auteur

**Ravel Momo** — [@Notho-freedom](https://github.com/Notho-freedom)
