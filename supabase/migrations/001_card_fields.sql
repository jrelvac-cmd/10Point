-- À exécuter si le schéma initial a déjà été appliqué avant le J2.
-- Ajoute le nom français (affichage) et le total imprimé du set (matching).

alter table pokemon_cards add column if not exists name_fr text;
alter table pokemon_cards add column if not exists set_printed_total integer;
