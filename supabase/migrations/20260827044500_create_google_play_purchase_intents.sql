-- Server-backed Google Play one-time purchase intents.
--
-- Purpose:
-- Preserve the exact Tetamo user/property/product mapping before Google Play
-- starts a consumable purchase.
--
-- The intent UUID will be supplied to Google Play as obfuscatedProfileId.
-- obfuscatedAccountId continues to identify the authenticated Tetamo user.
--
-- We store only a SHA-256 fingerprint of the Google purchase token after
-- successful verification, not the raw token.

create table if not exists public.google_play_purchase_intents (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null,
  property_id uuid not null,

  product_id text not null,
  google_product_id text not null,

  obfuscated_account_id text not null,

  status text not null default 'pending',

  google_purchase_token_sha256 text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  consumed_at timestamptz null,

  constraint google_play_purchase_intents_status_check
    check (
      status in (
        'pending',
        'consumed',
        'cancelled'
      )
    )
);

create index if not exists
  google_play_purchase_intents_user_idx
on public.google_play_purchase_intents (
  user_id,
  created_at desc
);

create index if not exists
  google_play_purchase_intents_pending_idx
on public.google_play_purchase_intents (
  user_id,
  google_product_id,
  created_at desc
)
where status = 'pending';

create unique index if not exists
  google_play_purchase_intents_token_idx
on public.google_play_purchase_intents (
  google_purchase_token_sha256
)
where google_purchase_token_sha256 is not null;

alter table public.google_play_purchase_intents
  enable row level security;
