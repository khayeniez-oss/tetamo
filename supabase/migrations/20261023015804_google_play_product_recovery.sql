-- Raw Google tokens are retry credentials. Only the service role can access
-- this queue; never grant anon/authenticated access or return tokens to clients.
create table public.google_play_product_jobs (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  intent_id uuid not null unique references public.google_play_purchase_intents(id),
  user_id uuid not null,
  property_id uuid not null,
  product_id text not null,
  google_product_id text not null,
  purchase_token text,
  state text not null default 'pending' check (state in ('pending','completed','rejected','refunded')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease_id uuid,
  lease_expires_at timestamptz,
  last_http_status integer,
  last_error text,
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.google_play_product_jobs enable row level security;
revoke all on public.google_play_product_jobs from public, anon, authenticated;
grant select, insert, update, delete on public.google_play_product_jobs to service_role;
create index google_play_product_jobs_pending_idx
  on public.google_play_product_jobs(next_attempt_at, created_at) where state='pending';
create index google_play_product_jobs_property_idx on public.google_play_product_jobs(property_id);

-- A persisted lease survives function termination. Serializing claims for the
-- same property prevents two purchases from racing to extend its entitlement.
create function public.claim_google_play_product_job(p_token_hash text, p_lease_id uuid)
returns setof public.google_play_product_jobs
language plpgsql security invoker set search_path = '' as $$
declare v_property uuid;
begin
  select property_id into v_property from public.google_play_product_jobs where token_hash=p_token_hash;
  if v_property is null then return; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_property::text, 0));
  if exists(select 1 from public.google_play_product_jobs
    where property_id=v_property and lease_expires_at > now()) then return; end if;
  return query update public.google_play_product_jobs set
    lease_id=p_lease_id, lease_expires_at=now()+interval '10 minutes',
    attempts=attempts+1, updated_at=now()
    where token_hash=p_token_hash and state='pending' and next_attempt_at <= now()
      and (lease_expires_at is null or lease_expires_at <= now())
    returning *;
end;
$$;
revoke all on function public.claim_google_play_product_job(text,uuid) from public, anon, authenticated;
grant execute on function public.claim_google_play_product_job(text,uuid) to service_role;

-- Refund changes are atomic. Never overwrite a later purchase/manual expiry:
-- only restore the exact entitlement snapshot granted by this transaction.
create function public.reconcile_google_play_product_refund(p_payment_id uuid, p_refund jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_payment public.payment_transactions%rowtype;
  v_property public.properties%rowtype;
  v_plan jsonb;
  v_previous jsonb;
  v_type text;
  v_review boolean := true;
begin
  select * into v_payment from public.payment_transactions where id=p_payment_id for update;
  if not found or v_payment.metadata->>'gateway' <> 'google_play' then
    return jsonb_build_object('matched',false);
  end if;
  if v_payment.status='refunded' then return jsonb_build_object('matched',true,'alreadyProcessed',true); end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_payment.property_id::text, 0));
  if exists(select 1 from public.google_play_product_jobs
    where property_id=v_payment.property_id and lease_expires_at > now()) then
    raise exception 'Google Play payment finalization still in progress';
  end if;
  v_plan := v_payment.metadata->'activationPlan';
  v_previous := v_plan->'previousEntitlement';
  v_type := v_plan->>'activationType';
  select * into v_property from public.properties where id=v_payment.property_id for update;
  if found and jsonb_typeof(v_previous)='object' then
    if v_type='owner-listing'
      and v_property.listing_expires_at = (v_plan->>'listingExpiresAt')::timestamptz
      and ((v_plan->>'featuredExpiresAt') is null or v_property.featured_expires_at = (v_plan->>'featuredExpiresAt')::timestamptz)
    then
      update public.properties set
        listing_expires_at=(v_previous->>'listing_expires_at')::timestamptz,
        featured_expires_at=case when v_plan->>'featuredExpiresAt' is not null then (v_previous->>'featured_expires_at')::timestamptz else featured_expires_at end,
        status=coalesce(v_previous->>'status', status), updated_at=now()
      where id=v_property.id;
      v_review := false;
    elsif v_type='boost-listing' and v_property.boost_expires_at = (v_plan->>'boostExpiresAt')::timestamptz then
      update public.properties set boost_expires_at=(v_previous->>'boost_expires_at')::timestamptz,
        boost_active=coalesce((v_previous->>'boost_active')::boolean,false),updated_at=now() where id=v_property.id;
      v_review := false;
    elsif v_type='homepage-spotlight' and v_property.spotlight_expires_at = (v_plan->>'spotlightExpiresAt')::timestamptz then
      update public.properties set spotlight_expires_at=(v_previous->>'spotlight_expires_at')::timestamptz,
        spotlight_active=coalesce((v_previous->>'spotlight_active')::boolean,false),updated_at=now() where id=v_property.id;
      v_review := false;
    end if;
  end if;
  update public.payment_transactions set status='refunded',updated_at=now(),
    metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('google_refund',p_refund,'google_refund_review_required',v_review)
    where id=p_payment_id;
  update public.google_play_product_jobs set state='refunded',result=null,purchase_token=null,updated_at=now()
    where token_hash=v_payment.metadata->>'google_purchase_token_sha256';
  return jsonb_build_object('matched',true,'reviewRequired',v_review);
end;
$$;
revoke all on function public.reconcile_google_play_product_refund(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.reconcile_google_play_product_refund(uuid,jsonb) to service_role;
