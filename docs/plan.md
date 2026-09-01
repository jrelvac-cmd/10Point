# Plan de build — TenPoint MVP (production-ready)

## Contexte

SaaS greenfield pour collectionneurs Pokémon français : scan photo → identification IA → prix marché EUR → valeur de collection. Dossier de travail vide ; repo GitHub existant : `https://github.com/jrelvac-cmd/10Point.git`. Le PRD v1.3 sert de base, **amendé par les décisions du fondateur** ci-dessous. Objectif : un produit pro, déployable en production, la qualité prime sur le délai (~6–7 jours de build réalistes).

### Décisions actées (remplacent le PRD là où ça diffère)

| Sujet | Décision |
|---|---|
| Paiement | **Whop checkout hébergé** + webhooks + API membership (évolutif vers embedded plus tard). Affiliation Whop activée dès le MVP. Prix inchangés : Free / 3,99 €/mois / 24,99 €/an / 59,99 € lifetime. Trial 7j (mensuel + annuel). Annulation via hub client Whop. |
| Badge Fondateur | **Supprimé** |
| Conseil TenPoint | **SUPPRIMÉ — aucun bloc conseil IA dans l'app** |
| Prix | **Cardmarket via PokéTCG API** (`cardmarket.prices` : trendPrice, lowPrice, avg1/avg7/avg30, EUR). Zéro eBay. Variation 30j = (trend − avg30)/avg30. |
| Refresh prix | Cartes détenues par des users **Pro : 24h** ; users **Free : 48h** (un cron quotidien qui rafraîchit les caches expirés) |
| Vision LLM | **Claude (Anthropic)** — `claude-haiku-4-5`, extraction JSON strict, jamais d'invention |
| Langues cartes | **FR uniquement** (pas de JP ni d'EN, pour éviter les confusions) |
| État des cartes (NM/LP…) | **Pas géré au MVP** — prix unique brut non gradé ; colonne `condition` conservée en base (défaut 'NM') pour le futur, aucune UI |
| Variantes reverse/holo | **Incluses, mais non détectées par l'IA** : au moment de valider la carte scannée, l'utilisateur coche deux cases — Holo oui/non et Reverse oui/non. Si Reverse, on utilise les prix `reverseHolo*` de Cardmarket (fournis par la PokéTCG API). |
| Quota Free | 20 scans/mois — **seuls les scans valides (identification réussie) comptent** ; 100 cartes max |
| Downgrade Pro→Free avec >100 cartes | Affiche les 100 premières + bandeau invitant à supprimer le surplus |
| Bulk scan | Pro uniquement, **max 50 cartes/session** |
| Photos scannées | **Supprimées après identification** ; l'app affiche le visuel officiel PokéTCG (`images.large`) partout (bibliothèque triée par set) |
| Username | Choisi à l'inscription (slug unique) |
| Suppression compte | Bouton « Demander la suppression » → email (Resend) vers une adresse admin ; traitement manuel |
| UI | 100 % français, glassmorphisme sombre (palette PRD §9), icônes **Lucide**, chiffres en monospace. **Une maquette sera fournie par le fondateur → l'UI de la home sera ajustée à réception.** |
| PWA | Installable uniquement (manifest + SW minimal), pas d'offline |
| Notifications prix | Code livré « dormant » (P2), activé quand l'historique interne existe |
| Domaine | **Nom non définitif** → brander via une constante unique (`APP_NAME`) + déployer sur `*.vercel.app` ; domaine branché plus tard |
| Infra | Vercel Hobby (gratuit), Supabase Free (région EU), Resend, **Sentry inclus au MVP**, pas d'analytics |
| Légal | Mentions légales + CGV + politique de confidentialité générées (FR), page /legal ; statut juridique ajouté plus tard |
| Si on doit couper | Le partage public `/u/[username]` saute en premier |

---

## Phase 0 — Prérequis comptes (à lancer J1, délais d'approbation)

1. **Whop** : créer le compte vendeur + la company, créer 3 plans (mensuel 3,99 € recurring trial 7j, annuel 24,99 € recurring trial 7j, lifetime 59,99 € one-time), activer l'affiliation, récupérer `WHOP_API_KEY`, `WHOP_WEBHOOK_SECRET`, les `plan_id`. ⚠️ Délai d'approbation possible → à faire en premier.
2. **Anthropic** : clé API + alerte budget 20 €.
3. **PokéTCG** (pokemontcg.io) : clé API gratuite (rate limit meilleur).
4. **Supabase** : projet région EU (Frankfurt).
5. **Vercel** : connecter le repo GitHub `jrelvac-cmd/10Point`.
6. **Resend** : compte + vérif DNS du domaine d'envoi (24h) — en attendant, mode sandbox.
7. **Sentry** : projet Next.js gratuit.

---

## Arborescence cible

```
app/
  (marketing)/page.tsx            # Landing FR (non connecté) : hero, démo, pricing, FAQ
  (marketing)/pricing/page.tsx    # 3 plans, Lifetime en avant, CTA → checkout Whop
  (marketing)/legal/...           # mentions légales, CGV, confidentialité
  (app)/home/page.tsx             # Dashboard : hero gauge + Top 5 switchable (PAS de bloc conseil)
  (app)/collection/page.tsx       # Bibliothèque : visuels officiels, filtres (set/rareté/holo/reverse), tri
  (app)/scan/page.tsx             # Caméra mobile + upload desktop, mode bulk (Pro)
  (app)/parametres/page.tsx       # Plan actuel, toggle partage, toggle notifs, hub Whop, bouton suppression compte
  u/[username]/page.tsx           # Collection publique (opt-in, RLS)
  login/page.tsx                  # Google OAuth + email/password + choix username
  api/scan/route.ts               # image → Claude vision → matching PokéTCG → carte + prix
  api/collection/route.ts + [id]/ # CRUD collection
  api/prices/refresh/route.ts     # Cron quotidien (Vercel cron) : refresh caches expirés 24h/48h
  api/webhooks/whop/route.ts      # Webhooks Whop signés → profiles.plan
  api/checkout/route.ts           # Redirection vers checkout Whop selon plan
  api/account/delete-request/...  # Email Resend vers admin
lib/
  supabase/ (client, server, middleware)   # @supabase/ssr
  whop.ts        # vérif signature webhook + GET membership (fallback au login)
  anthropic.ts   # appel vision, prompt extraction JSON strict
  poketcg.ts     # recherche cartes, extraction cardmarket.prices
  pricing.ts     # calcul variation 30j, agrégats gauge, valeur totale
  plans.ts       # gating Free/Pro (quota scans, limite 100 cartes, bulk)
components/
  gauge/HeroGauge.tsx        # SVG demi-cercle (hausse/baisse/stable)
  home/TopFiveSwitcher.tsx   # toggle Lucide Trophy ↔ TrendingUp, état local
  scan/…, collection/…, ui/… (shadcn)
middleware.ts                # protection routes (tout sauf marketing/login/u/*)
```

---

## Schéma base de données (Supabase, RLS partout)

Adapter le schéma du PRD §6 :
- `profiles` : remplacer les champs Stripe par `whop_user_id`, `whop_membership_id` ; garder `plan ('free'|'pro'|'lifetime')`, `plan_expires_at`, `scans_this_month` (+ `scans_reset_at`), `share_collection`, `username unique` ; retirer les champs notif jusqu'à P2 (ou les garder dormants).
- `pokemon_cards` : id PokéTCG, noms, set, numéro, rareté, `image_small`, `image_large`.
- `card_prices` : `trend, low, avg1, avg7, avg30` + `reverse_trend, reverse_low, reverse_avg1, reverse_avg7, reverse_avg30`, `currency 'EUR', cached_at, expires_at` (24h ou 48h selon le tier du détenteur le plus exigeant).
- `price_history` : snapshot quotidien `(card_id, trend, avg30, reverse_trend, reverse_avg30, snapshot_date)` — construit notre propre historique dès J1 pour la V1 et les notifs dormantes.
- `collection_items` : `is_holo boolean default false`, `is_reverse boolean default false`, `unique(user_id, card_id, is_holo, is_reverse)` ; `condition` conservée avec défaut 'NM', sans UI ; `language` fixée à 'FR'.
- `scan_logs` : uniquement les scans **valides** (pour le quota).
- Policies RLS : own-data sur profiles/collection/scan_logs ; lecture publique de `collection_items` si `profiles.share_collection = true` ; `pokemon_cards`/`card_prices`/`price_history` en lecture publique, écriture service-role uniquement.

---

## Pipeline scan (route `POST /api/scan`)

1. Auth + vérif quota (Free : `scans_this_month < 20` — vérifié AVANT, incrémenté seulement si succès).
2. Image (JPG/PNG/WEBP ≤ 10 Mo) → Claude `claude-haiku-4-5` vision, prompt : extraire `{name, number, set_total}` en JSON strict, `null` si illisible — jamais d'invention (cartes FR uniquement).
3. Matching PokéTCG : `q=number:{n} name:{name*}` →
   - 1 résultat → confirmé, upsert `pokemon_cards`.
   - 2–5 → renvoyer les candidats avec visuels officiels, sélecteur côté client.
   - 0 → recherche par nom seul → sélecteur manuel ; sinon erreur propre + recherche texte libre (le scan ne compte pas).
4. Écran de validation : la carte identifiée s'affiche avec deux cases à cocher — **Holo oui/non** et **Reverse oui/non** (choix utilisateur, jamais détecté par l'IA) — avant l'ajout à la collection.
5. Prix : lire `cardmarket.prices` de la réponse PokéTCG (variantes normale + reverse) → upsert `card_prices` + snapshot `price_history` du jour. Si Reverse coché → prix `reverseHolo*` affiché.
6. La photo uploadée n'est **jamais stockée** (traitée en mémoire).
7. Réponse : carte (visuel officiel), trend €, fourchette low–avg30, variation 30j, lien recherche eBay (URL construite, sans API).

Mode bulk (Pro) : même route, UI « Ajouter & Suivant », compteur, max 50, résumé de session.

---

## Intégration Whop

- `/api/checkout?plan=monthly|yearly|lifetime` → redirige vers l'URL de checkout hébergé Whop du plan (avec `metadata.user_id` = Supabase uid).
- `/api/webhooks/whop` : vérification de signature obligatoire ; events `membership.went_valid` → `plan='pro'|'lifetime'` (+ `plan_expires_at` ; lifetime = NULL) ; `membership.went_invalid` / annulation → `plan='free'`.
- **Fallback anti-webhook-manqué** : au login (et 1×/jour max via cache), si `whop_membership_id` existe, GET membership via l'API Whop et réconcilier `profiles.plan`.
- Gating : helper `lib/plans.ts` utilisé côté serveur (API routes) ET côté UI (compteur « X scans restants », gate bulk, limite 100 cartes avec bandeau downgrade).
- Paramètres : lien vers le hub client Whop (gestion/annulation self-service).

---

## Home dashboard (sera ajusté à réception de la maquette)

1. Topbar glass : logo texte `APP_NAME` + avatar initiales.
2. **Hero gauge** SVG demi-cercle : arcs hausse `#4338CA` / baisse `#A5B4FC` / stable `rgba(255,255,255,0.15)` proportionnels à la **valeur** des cartes en hausse/baisse/stable sur 30j ; valeur totale monospace au centre ; variation 30j € et % dessous (vert `#34D399` / orange `#FB923C`) ; 2 pills légende.
3. **Top 5 switchable** : toggle pill Lucide `Trophy` (top valeur) ↔ `TrendingUp` (top hausse 30j), état local React ; lignes : rang · visuel officiel · nom + set · trend € mono · variation % colorée.
4. Bottom nav glass (Accueil / Collection / Paramètres + FAB scan).

*(Aucun bloc « Conseil TenPoint ».)*

---

## Ordre de build (~6–7 jours)

**J1 — Fondations** : init Next.js 14 + TS + Tailwind + shadcn/Lucide dans le repo ; schéma SQL + RLS ; Supabase Auth (Google + email) + choix username ; middleware ; layout glass + bottom nav ; pages vides ; Sentry ; deploy Vercel preview. ✅ *Checkpoint : login Google → home vide déployée.*

**J2 — Scan & prix** : `lib/anthropic.ts` + `lib/poketcg.ts` ; `/api/scan` complet (3 cas de confiance) ; écran scan (caméra + upload) ; écran résultat + « Ajouter à ma collection » ; cache prix + `price_history`. ✅ *Checkpoint : scan d'une vraie carte → prix EUR stable → carte en base.*

**J3 — Collection & home** : page bibliothèque (visuels officiels, filtres set/rareté/holo/reverse, tris, suppression, quantité inline) ; hero gauge + Top 5 switchable ; calculs `lib/pricing.ts`. ✅ *Checkpoint : dashboard vivant avec vraies données.*

**J4 — Whop** : checkout, webhooks signés, fallback membership au login, gating complet (quota scans valides, 100 cartes, bandeau downgrade), page pricing, hub client. ✅ *Checkpoint : upgrade Pro test → gates levées → annulation → retour Free.*

**J5 — Features Pro & pages** : bulk scan (max 50) ; page publique `/u/[username]` (coupée si retard) ; paramètres (partage, plan, suppression compte par email Resend) ; pages légales ; landing marketing FR. ✅ *Checkpoint : parcours complet visiteur → payant.*

**J6 — Production** : cron Vercel quotidien refresh prix (24h Pro / 48h Free) ; PWA (manifest + icônes + SW minimal) ; notifs email dormantes (code + toggle, désactivé) ; tests RLS avec 2 comptes ; tests 10 vraies cartes ; audit clés API (rien côté client) ; Sentry vérifié ; deploy production sur `*.vercel.app`.

**J7 (buffer)** — maquette du fondateur intégrée sur la home, polish, checklist finale.

---

## Variables d'environnement

```
NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
POKEMONTCG_API_KEY
WHOP_API_KEY / WHOP_WEBHOOK_SECRET
WHOP_PLAN_MONTHLY_ID / WHOP_PLAN_YEARLY_ID / WHOP_PLAN_LIFETIME_ID
RESEND_API_KEY / RESEND_FROM_EMAIL / ADMIN_EMAIL (suppressions de compte)
SENTRY_DSN
NEXT_PUBLIC_APP_NAME / NEXT_PUBLIC_APP_URL   # branding changeable (nom non définitif)
CRON_SECRET                                   # protection route cron
```

---

## Vérification avant mise en production

- [ ] Inscription email + Google sans aide ; username unique ; routes protégées.
- [ ] 10 vraies cartes FR scannées : identification correcte ou sélecteur, prix EUR stable (re-scan = même prix, cache) ; cases Holo/Reverse fonctionnelles et prix reverse correct.
- [ ] Scan raté ne décrémente pas le quota ; 21e scan Free → gate pricing.
- [ ] RLS : le compte B ne voit rien du compte A (test anon key) ; `/u/x` invisible si partage off.
- [ ] Whop mode test : checkout mensuel/annuel/lifetime → `profiles.plan` mis à jour par webhook ; annulation → retour Free ; webhook coupé → réconciliation au login.
- [ ] Aucune clé secrète dans le bundle client (`next build` + inspection).
- [ ] Cron : exécution manuelle → prix expirés rafraîchis, snapshot `price_history` créé.
- [ ] PWA installable sur mobile ; Lighthouse correct ; Sentry reçoit une erreur test.
- [ ] Pages légales accessibles ; bouton suppression compte → email reçu.

---

## Risques & mitigations

| Risque | Mitigation |
|---|---|
| Approbation Whop lente | Compte créé J1 ; tout le reste ne dépend pas de Whop avant J4 |
| PokéTCG API lente/instable (connu) | Cache agressif `pokemon_cards` + `card_prices`, retries + timeout, fallback « Prix indisponible » |
| Carte absente du référentiel PokéTCG (sets FR récents) | Recherche par nom + message clair ; le scan ne compte pas |
| Webhook Whop manqué | Réconciliation membership au login |
| Cron Vercel Hobby limité (1×/jour) | Un seul job quotidien qui traite tous les caches expirés (logique 24h/48h en SQL) |
| Nom de marque non définitif | `NEXT_PUBLIC_APP_NAME` unique, aucun hardcode du nom |
| Coût Claude | Haiku vision (~0,003 $/scan), alerte budget 20 €, quota Free serveur-side |
