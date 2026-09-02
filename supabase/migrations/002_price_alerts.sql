-- Journal des alertes de prix envoyées : garantit au plus un email par carte
-- et par utilisateur par semaine.

create table if not exists price_alerts_sent (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  card_id text not null references pokemon_cards(id) on delete cascade,
  old_price numeric(10,2),
  new_price numeric(10,2),
  sent_at timestamptz not null default now()
);

create index if not exists price_alerts_sent_user_card_idx
  on price_alerts_sent (user_id, card_id, sent_at desc);

alter table price_alerts_sent enable row level security;
create policy "own alerts" on price_alerts_sent for select using (auth.uid() = user_id);
-- Écriture réservée au service role (cron).
