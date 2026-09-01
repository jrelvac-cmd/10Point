# TenPoint

Scan cartes Pokémon → identification IA → prix marché EUR → valeur de collection.

Voir le plan de build complet : `docs/plan.md` (copie de `C:\Users\jrelv\.claude\plans\prd-tenpoint-zazzy-firefly.md`).

## Stack

- Next.js 14.2.x (App Router) + TypeScript + Tailwind CSS v3
- Supabase (Auth, Postgres + RLS, Storage) — région EU
- Paiement : Whop (checkout hébergé)
- Vision : Claude (Anthropic)
- Prix : Cardmarket via PokéTCG API
- Déploiement : Vercel

## Démarrer en local

```bash
npm install
cp .env.local.example .env.local   # puis renseigner les vraies clés
npm run dev
```

`.env.local` est ignoré par git. Sans les vraies clés Supabase, l'auth ne fonctionnera pas mais
le build/dev tourne quand même grâce aux valeurs placeholder.

## Base de données

Le schéma complet (tables, RLS, trigger de création de profil) est dans
[`supabase/schema.sql`](./supabase/schema.sql) — à exécuter dans le SQL Editor de Supabase.
