-- Ajoute la 1re Édition comme variante réelle, au même titre que Holo/Reverse.
-- Cardmarket la cote comme un produit à part (pas une colonne du prix
-- principal) : d'où des colonnes dédiées, à l'image de reverse_*.

alter table card_prices add column if not exists first_edition_trend numeric(10,2);
alter table card_prices add column if not exists first_edition_low numeric(10,2);
alter table card_prices add column if not exists first_edition_avg1 numeric(10,2);
alter table card_prices add column if not exists first_edition_avg7 numeric(10,2);
alter table card_prices add column if not exists first_edition_avg30 numeric(10,2);

alter table price_history add column if not exists first_edition_trend numeric(10,2);
alter table price_history add column if not exists first_edition_avg30 numeric(10,2);

alter table collection_items add column if not exists is_first_edition boolean not null default false;

-- La 1re édition est orthogonale au holo/reverse (une carte peut être les
-- deux) : elle rejoint la clé qui distingue les lignes d'une même carte.
alter table collection_items drop constraint if exists collection_items_user_id_card_id_is_holo_is_reverse_key;
alter table collection_items drop constraint if exists collection_items_variant_key;
alter table collection_items add constraint collection_items_variant_key
  unique (user_id, card_id, is_holo, is_reverse, is_first_edition);
