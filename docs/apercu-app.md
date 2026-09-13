# MintCard — vue d'ensemble

*Généré le 10/09/2026. Sert de résumé pour reprendre le projet rapidement ; le détail du build historique reste dans `docs/plan.md`.*

## En une phrase

Scanner de cartes Pokémon en PWA : une photo donne le nom, la variante et la cote du marché européen en euros, et la collection suit sa valeur dans le temps.

## Stack

- **Framework** : Next.js 15.5 (App Router) + React 19 + TypeScript, Tailwind CSS v3
- **Base de données / auth** : Supabase (Postgres + RLS, Auth, région Francfort — cdg1 côté Vercel)
- **Vision (reconnaissance de carte)** : Claude (Anthropic), via `lib/anthropic.ts`
- **Prix** : Cardmarket via l'API TCGdex (toutes langues, reverse, 1re édition) ; cote « carte française » via TCGGO (Cardmarket sur RapidAPI, `lib/tcggo.ts`, 100 requêtes/jour en gratuit)
- **Paiement** : Lemon Squeezy — checkout hébergé, Merchant of Record (pas besoin d'entreprise ; migré depuis Whop le 10/09/2026, voir `docs/plan.md`)
- **Emails** : Resend
- **Erreurs** : Sentry
- **Déploiement** : Vercel

## Fonctionnement en un coup d'œil

1. **Scan** (`app/(scan)/scan`, `components/scan/`) — la caméra détecte un rectangle net et immobile (`lib/card-detect.ts`, seuils calibrés pour éviter qu'un visage ou un objet carré ne déclenche le scan), prend la photo, l'envoie à Claude pour identifier la carte (nom, extension, numéro, variante), puis va chercher son prix.
2. **Prix** (`lib/tcgdex.ts`, `lib/tcggo.ts`, `lib/pricing.ts`) — cote Cardmarket toutes langues par défaut ; avec la clé TCGGO, la fiche affiche l'annonce Cardmarket française near mint la moins chère (ignorée si elle dépasse 2 × la moyenne 30 jours, cas des annonces FR isolées ; cache 24 h par carte, cron groupé par 20).
3. **Fiche résultat** (`CardSheet.tsx`) — carte en grand, cote de référence, variation, détails (rareté, type, set, date). Ajout à la collection en un geste.
4. **Collection** (`app/(app)/collection`, `components/collection/`) — valeur totale, variation 30 jours, tri, jusqu'à 100 cartes en Free / illimité en Pro.
5. **Accueil** (`app/(app)/home`) — jauge de valeur, top 5, dernières cartes scannées.
6. **Profil public** (`app/u/[username]`) — collection partageable si l'utilisateur l'active dans Paramètres.
7. **Alertes de prix** — cron quotidien (`api/cron/price-alerts`) qui notifie par email au-delà d'un seuil de variation configurable.
8. **Rafraîchissement des prix** — cron quotidien (`api/cron/refresh-prices`) qui remet à jour les cotes en cache.

## Plans et quotas (`lib/plans.ts`)

| Plan | Scans/mois | Collection | Prix |
|---|---|---|---|
| Free | 20 | 100 cartes | 0 € |
| Pro Mensuel | illimité | illimitée | 3,99 €/mois, essai 7 j |
| Pro Annuel | illimité | illimitée | 24,99 €/an, essai 7 j |
| Lifetime | illimité | illimitée | 59,99 € (paiement unique) |

## Paiement — Lemon Squeezy

- `lib/lemonsqueezy.ts` : liens de checkout hébergés (configurés, jamais devinés), vérification de signature HMAC, normalisation des statuts d'abonnement.
- `app/api/checkout/route.ts` : redirige vers le lien du plan choisi, avec l'identifiant Supabase et le plan en données personnalisées (`checkout[custom][...]`).
- `app/api/webhooks/lemonsqueezy/route.ts` : reçoit `subscription_*` (Pro mensuel/annuel) et `order_created`/`order_refunded` (Lifetime), signature obligatoire, met à jour `profiles.plan`.
- `lib/subscription.ts` : réconciliation au chargement des Paramètres si un webhook a pu se perdre (jamais de rétrogradation sur simple erreur réseau).
- `app/api/portal/route.ts` : renvoie vers l'espace client Lemon Squeezy (résiliation, changement de carte).
- Colonnes profil : `ls_customer_id`, `ls_subscription_id`, `ls_order_id` (migration `005_lemonsqueezy.sql`).
- Variables d'env : `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_WEBHOOK_SECRET`, `LEMONSQUEEZY_CHECKOUT_URL_MONTHLY/YEARLY/LIFETIME`.
- Test : `node scripts/test-lemonsqueezy-webhook.mjs` (compte jetable, simule les événements signés, vérifie que `profiles.plan` suit).
- **Reste à faire côté tableau de bord Lemon Squeezy** : créer le store et les 3 produits, récupérer la clé API et le secret webhook, copier les liens de checkout, configurer l'URL du webhook (`/api/webhooks/lemonsqueezy`).

## Tutoriel d'installation PWA (`components/onboarding/`)

- S'ouvre une seule fois, ~900 ms après le premier chargement sur mobile (jamais sur desktop, jamais si déjà installée) — mémorisé dans `localStorage` (`mintcard:install-tour`).
- Premier écran : logo + choix explicite Safari / Chrome (celui détecté est mis en avant), pour que le guide corresponde vraiment au navigateur utilisé plutôt qu'à l'appareil.
- Parcours dédiés : Safari iOS (Partager → Sur l'écran d'accueil → Ajouter), Chrome iOS (variante du bouton Partager), Chrome Android (menu ⋮ → Ajouter à l'écran d'accueil, ou le vrai bouton natif `beforeinstallprompt` quand Chrome le propose), desktop (icône dans la barre d'adresse).
- Chaque étape montre une maquette du navigateur avec le bouton à presser cerné d'un anneau qui pulse, plus une flèche au bord de l'écran vers le vrai bouton.
- Bouton « Passer » discret, en haut à droite.
- Rejouable depuis Paramètres (`InstallTourButton.tsx`), qui affiche aussi si l'app est déjà installée sur l'appareil (`display-mode: standalone` / `navigator.standalone`).
- Icônes du manifeste (`icon-192.svg`, `icon-512.svg`) : logo MintCard (losange bleu) sur fond blanc, remplaçant l'ancien « 10 » de TenPoint. `theme_color` violet (`#4F5FE6`), `background_color` blanc.

## Identité de marque

- Nom affiché partout : **MintCard** (`lib/constants.ts` → `APP_NAME`, fixe, sans variable d'environnement — corrigé le 09/09/2026 après un résidu « TenPoint »).
- Répertoire de travail encore nommé `10Point` en local ; sans effet sur l'app (nom du dossier ≠ nom affiché).
- Palette : blanc + violet accent (`#4F5FE6`) + panneaux crème/glassmorphism (`--glass-*` dans `globals.css`). Les jetons de design « Apple » testés en septembre ont été **annulés par le fondateur le 09/09** et ne sont pas déployés (gardés en git stash) — ne pas les réappliquer sans demande explicite.
- Mouvement : ressorts `--ease-spring*` définis dans `globals.css`/`lib/motion.ts`, classe utilitaire `.pressable` pour le retour tactile, animations dédiées au scan (`materialize`, `card-shine`, `price-pop`) et au verrouillage de carte (`card-edge`, `lock-corners`).

## Sécurité et fiabilité notables

- Webhooks (Lemon Squeezy) : signature HMAC obligatoire, sinon 503/401 — jamais d'accès Pro sans signature valide.
- Un abonnement/commande ne peut retirer l'accès que du profil auquel il est réellement rattaché (empêche qu'un tiers résilie un essai lié à un autre compte pour le faire tomber en Free).
- `api/cron/env-check` : diagnostic qui repère une variable d'environnement corrompue (puces invisibles copiées depuis un dashboard, espaces parasites) — symptôme sinon trompeur (Supabase échoue silencieusement).
- Photos de scan jamais conservées : traitées par Claude puis supprimées immédiatement (mentionné dans `legal/confidentialite`).
- RGPD : suppression de compte sur demande depuis Paramètres (`api/account/delete-request`, envoi manuel par email faute d'automatisation complète).

## Scripts utiles

- `npm run dev` — serveur local
- `npm run smoke` (`scripts/smoke-test.mjs`) — suite de bout en bout : auth, scan, collection, partage public, paiement/webhooks, cron
- `node scripts/test-lemonsqueezy-webhook.mjs [url]` — test isolé des webhooks de paiement
- `node scripts/screenshots.mjs` — génère les captures `public/screenshots/*.webp` utilisées sur la landing page (caméra simulée via `canvas.captureStream`, compte jetable avec collection réelle)

## Déploiement

- Vercel, région `cdg1` (Paris) — cf. `vercel.json`
- Crons Vercel : `refresh-prices` (4h), `price-alerts` (6h)
- `rm -rf .next` avant tout aperçu local — le dossier OneDrive corrompt parfois les liens symboliques du build ; ne jamais lancer `next build` pendant qu'un aperçu tourne (`.next` partagé)

## Historique récent (reconstruit depuis les échanges)

- Migration complète du paiement Whop → Lemon Squeezy (10/09/2026), le fondateur n'ayant pas de structure d'entreprise et Lemon Squeezy agissant comme revendeur officiel.
- Tutoriel d'installation PWA ajouté avec choix de navigateur et parcours dédiés (10/09/2026).
- Correction de la détection de carte : un visage ou un objet carré ne doit plus déclencher le scan automatique (`lib/card-detect.ts`).
- Cote « carte française » passée d'eBay (accès API jamais accordé) à TCGGO/Cardmarket (13/09/2026).
- Landing page : carrousel de téléphones dans le héros, recentrage des zooms, prix vitrine du Dracaufeu fixé à 1 349 €.
- Nom d'affichage figé sur « MintCard » partout, y compris en ligne (résidu « TenPoint » supprimé).

## Ce qu'il reste à faire (connu, non traité)

- Configurer le store et les produits Lemon Squeezy côté tableau de bord (clé API, secret webhook, 3 liens de checkout).
- Vérifier en conditions réelles (vrai téléphone) le tutoriel d'installation sur Android et Chrome iOS.
- Whop retiré du code ; vérifier qu'aucune variable `WHOP_*` ne traîne encore sur Vercel/production après le déploiement.
