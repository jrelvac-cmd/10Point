-- Cote française lue chez Cardmarket via TCGGO : annonce near mint FR la moins chère.
-- Remplace la médiane eBay France (migration 004), dont l'accès API n'a jamais été accordé.
-- Autonome : crée la table si la 004 n'est jamais passée, la convertit sinon.

create table if not exists card_prices_fr (
  card_id text primary key references pokemon_cards(id) on delete cascade,
  price numeric(10,2),
  low numeric(10,2),
  high numeric(10,2),
  sample_count integer not null default 0,
  window_days integer not null default 0,
  source text not null default 'tcggo',
  sampled_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);

alter table card_prices_fr enable row level security;
drop policy if exists "public read fr prices" on card_prices_fr;
create policy "public read fr prices" on card_prices_fr for select using (true);

-- Série quotidienne de la cote française, pour la variation sur 30 jours.
alter table price_history add column if not exists fr_price numeric(10,2);

-- Les médianes eBay ne se comparent pas aux prix TCGGO : on repart de zéro.
delete from card_prices_fr;
update price_history set fr_price = null;

alter table card_prices_fr drop constraint if exists card_prices_fr_source_check;
alter table card_prices_fr
  alter column source set default 'tcggo',
  add constraint card_prices_fr_source_check check (source in ('tcggo'));
