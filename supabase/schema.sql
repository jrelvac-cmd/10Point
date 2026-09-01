-- TenPoint — schéma initial (à exécuter dans Supabase SQL Editor)

create extension if not exists "pgcrypto";

-- ============================================================
-- profils
-- ============================================================
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  username_set boolean not null default false,
  whop_user_id text,
  whop_membership_id text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'lifetime')),
  plan_expires_at timestamptz,
  scans_this_month integer not null default 0,
  scans_reset_at timestamptz not null default date_trunc('month', now()) + interval '1 month',
  share_collection boolean not null default false,
  notify_price_change boolean not null default false,
  notify_threshold text not null default '+50%',
  created_at timestamptz not null default now()
);

create unique index profiles_whop_membership_id_idx on profiles (whop_membership_id) where whop_membership_id is not null;

-- ============================================================
-- référentiel cartes (cache PokéTCG)
-- ============================================================
create table pokemon_cards (
  id text primary key,
  name text not null,              -- nom anglais (référentiel PokéTCG)
  name_fr text,                    -- nom lu sur la carte française, pour l'affichage
  set_name text,
  set_id text,
  number text,
  set_printed_total integer,
  rarity text,
  image_small text,
  image_large text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- cache prix Cardmarket (via PokéTCG API)
-- ============================================================
create table card_prices (
  card_id text primary key references pokemon_cards(id) on delete cascade,
  currency text not null default 'EUR',
  trend numeric(10,2),
  low numeric(10,2),
  avg1 numeric(10,2),
  avg7 numeric(10,2),
  avg30 numeric(10,2),
  reverse_trend numeric(10,2),
  reverse_low numeric(10,2),
  reverse_avg1 numeric(10,2),
  reverse_avg7 numeric(10,2),
  reverse_avg30 numeric(10,2),
  cached_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);

-- historique quotidien — construit notre propre série de prix dès J1
create table price_history (
  id uuid primary key default gen_random_uuid(),
  card_id text not null references pokemon_cards(id) on delete cascade,
  trend numeric(10,2),
  avg30 numeric(10,2),
  reverse_trend numeric(10,2),
  reverse_avg30 numeric(10,2),
  snapshot_date date not null default current_date,
  unique (card_id, snapshot_date)
);

-- ============================================================
-- collection utilisateur
-- ============================================================
create table collection_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  card_id text not null references pokemon_cards(id),
  quantity integer not null default 1 check (quantity >= 1 and quantity <= 99),
  condition text not null default 'NM' check (condition in ('NM', 'LP', 'MP', 'HP')),
  is_holo boolean not null default false,
  is_reverse boolean not null default false,
  added_at timestamptz not null default now(),
  unique (user_id, card_id, is_holo, is_reverse)
);

create index collection_items_user_id_idx on collection_items (user_id);

-- ============================================================
-- log scans (quota Free — scans valides uniquement)
-- ============================================================
create table scan_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  card_id text references pokemon_cards(id),
  scanned_at timestamptz not null default now()
);

create index scan_logs_user_id_scanned_at_idx on scan_logs (user_id, scanned_at);

-- ============================================================
-- création automatique du profil à l'inscription
-- ============================================================
-- Si l'utilisateur a fourni un username (signup email/mdp), on l'utilise.
-- Sinon (Google OAuth) on génère un placeholder unique ; username_set reste
-- false et l'app redirige vers /choisir-pseudo tant qu'il n'est pas choisi.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requested_username text := new.raw_user_meta_data->>'username';
  final_username text;
begin
  final_username := coalesce(nullif(trim(requested_username), ''), 'user_' || substr(new.id::text, 1, 8));

  insert into public.profiles (id, username, username_set)
  values (new.id, final_username, requested_username is not null)
  on conflict (id) do nothing;

  return new;
exception
  when unique_violation then
    insert into public.profiles (id, username, username_set)
    values (new.id, 'user_' || replace(new.id::text, '-', ''), false)
    on conflict (id) do nothing;
    return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- RLS
-- ============================================================
alter table profiles enable row level security;
alter table collection_items enable row level security;
alter table scan_logs enable row level security;
alter table pokemon_cards enable row level security;
alter table card_prices enable row level security;
alter table price_history enable row level security;

-- profiles : chacun voit/modifie uniquement le sien
create policy "own profile select" on profiles for select using (auth.uid() = id);
create policy "own profile update" on profiles for update using (auth.uid() = id);
create policy "own profile insert" on profiles for insert with check (auth.uid() = id);

-- collection_items : own data + lecture publique si partage activé
create policy "own collection all" on collection_items for all using (auth.uid() = user_id);
create policy "public collection if shared" on collection_items for select
  using (exists (select 1 from profiles where id = user_id and share_collection = true));

-- scan_logs : own data uniquement
create policy "own scan logs" on scan_logs for all using (auth.uid() = user_id);

-- référentiel cartes + prix : lecture publique (écriture réservée au service role, RLS bypass)
create policy "public read cards" on pokemon_cards for select using (true);
create policy "public read prices" on card_prices for select using (true);
create policy "public read price history" on price_history for select using (true);
