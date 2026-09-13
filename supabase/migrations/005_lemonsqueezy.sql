-- Whop -> Lemon Squeezy : colonnes de rattachement du paiement.
alter table profiles rename column whop_user_id to ls_customer_id;
alter table profiles rename column whop_membership_id to ls_subscription_id;
alter table profiles add column if not exists ls_order_id text;
drop index if exists profiles_whop_membership_id_idx;
create unique index if not exists profiles_ls_subscription_id_idx on profiles (ls_subscription_id) where ls_subscription_id is not null;
create unique index if not exists profiles_ls_order_id_idx on profiles (ls_order_id) where ls_order_id is not null;
-- Les identifiants Whop encore presents ne veulent plus rien dire pour Lemon Squeezy.
update profiles set ls_customer_id = null, ls_subscription_id = null;
