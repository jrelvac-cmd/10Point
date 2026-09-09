-- Cote « carte française, état 9/10 » : médiane des ventes eBay France
-- récentes d'une carte en version française, brute (non gradée), en bon état.
-- Le guide de prix Cardmarket (via TCGdex) mélange toutes les langues et
-- ignore l'état : il reste le repli quand eBay n'a pas assez de ventes.

create table if not exists card_prices_fr (
  card_id text primary key references pokemon_cards(id) on delete cascade,
  price numeric(10,2),
  low numeric(10,2),
  high numeric(10,2),
  sample_count integer not null default 0,
  window_days integer not null default 90,
  -- ebay_sold : ventes réalisées (API Marketplace Insights, sur approbation eBay)
  -- ebay_active : annonces en cours (API Browse), repli tant que l'accès aux ventes n'est pas accordé
  source text not null default 'ebay_sold' check (source in ('ebay_sold', 'ebay_active')),
  sampled_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);

alter table card_prices_fr enable row level security;
create policy "public read fr prices" on card_prices_fr for select using (true);

-- Série quotidienne de la cote française, pour la variation sur 30 jours.
alter table price_history add column if not exists fr_price numeric(10,2);
