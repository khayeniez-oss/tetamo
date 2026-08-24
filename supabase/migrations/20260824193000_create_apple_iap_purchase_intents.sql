-- Server-backed Apple consumable purchase intents.
--
-- Purpose:
-- Preserve the exact Tetamo user/property/product mapping before StoreKit
-- starts a consumable purchase. The intent UUID can later be supplied as
-- Apple's appAccountToken so a replayed transaction can be recovered even
-- if the app's local AsyncStorage intent is lost.

create table if not exists public.apple_iap_purchase_intents (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null,
  property_id uuid not null,

  product_id text not null,
  apple_product_id text not null,

  status text not null default 'pending',

  apple_transaction_id text null,
  apple_environment text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  consumed_at timestamptz null,

  constraint apple_iap_purchase_intents_status_check
    check (status in ('pending', 'consumed', 'cancelled'))
);

create index if not exists
  apple_iap_purchase_intents_user_idx
on public.apple_iap_purchase_intents (
  user_id,
  created_at desc
);

create index if not exists
  apple_iap_purchase_intents_pending_idx
on public.apple_iap_purchase_intents (
  user_id,
  apple_product_id,
  created_at desc
)
where status = 'pending';

create unique index if not exists
  apple_iap_purchase_intents_transaction_idx
on public.apple_iap_purchase_intents (
  apple_transaction_id
)
where apple_transaction_id is not null;

alter table public.apple_iap_purchase_intents
  enable row level security;
