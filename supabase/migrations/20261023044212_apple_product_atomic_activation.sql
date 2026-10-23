-- Receipt completion and entitlement changes must commit together. Only the
-- authenticated server may call this function after verifying Apple's JWS.
create function public.finalize_apple_product_purchase(
  p_payment_id uuid, p_user_id uuid, p_property_id uuid,
  p_duration_days integer, p_featured_days integer, p_activation_type text
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_payment public.payment_transactions%rowtype;
  v_property public.properties%rowtype;
  v_expiry timestamptz;
  v_featured timestamptz;
  v_activation jsonb;
  v_previous jsonb;
begin
  if p_duration_days is null or p_featured_days is null or p_activation_type is null
    or p_duration_days <= 0 or p_featured_days < 0
    or p_activation_type not in ('owner-listing','boost-listing','homepage-spotlight') then
    raise exception 'Invalid Apple entitlement configuration';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_property_id::text, 0));
  if exists(select 1 from public.google_play_product_jobs
    where property_id=p_property_id and lease_expires_at > now()) then
    raise exception 'Another store purchase is being finalized; retry later';
  end if;
  select * into v_payment from public.payment_transactions where id=p_payment_id for update;
  if not found or v_payment.user_id is distinct from p_user_id
    or v_payment.property_id is distinct from p_property_id
    or v_payment.metadata->>'gateway' is distinct from 'apple'
    or v_payment.status <> 'paid' then
    raise exception 'Apple payment does not match its verified owner and property';
  end if;
  if v_payment.metadata->'activation'->>'done' = 'true' then
    return v_payment.metadata->'activation';
  end if;
  select * into v_property from public.properties where id=p_property_id and user_id=p_user_id for update;
  if not found then raise exception 'Apple purchase property was not found'; end if;
  v_previous := jsonb_build_object(
    'status',v_property.status,'listing_expires_at',v_property.listing_expires_at,
    'featured_expires_at',v_property.featured_expires_at,'boost_expires_at',v_property.boost_expires_at,
    'spotlight_expires_at',v_property.spotlight_expires_at,'boost_active',v_property.boost_active,
    'spotlight_active',v_property.spotlight_active);
  if p_activation_type='owner-listing' then
    v_expiry := greatest(now(),v_property.listing_expires_at) + p_duration_days * interval '1 day';
    v_featured := case when p_featured_days > 0
      then greatest(now(),v_property.featured_expires_at) + p_featured_days * interval '1 day' else null end;
    update public.properties set status='active', verification_status='pending_verification',
      verified_ok=false,is_paused=false,posted_date=current_date,plan_id=v_payment.product_id,
      listing_expires_at=v_expiry,featured_expires_at=coalesce(v_featured,featured_expires_at),updated_at=now()
      where id=p_property_id;
  elsif p_activation_type='boost-listing' then
    v_expiry := greatest(now(),v_property.boost_expires_at) + p_duration_days * interval '1 day';
    update public.properties set boost_active=true,boost_expires_at=v_expiry,updated_at=now() where id=p_property_id;
  else
    v_expiry := greatest(now(),v_property.spotlight_expires_at) + p_duration_days * interval '1 day';
    update public.properties set spotlight_active=true,spotlight_expires_at=v_expiry,updated_at=now() where id=p_property_id;
  end if;
  v_activation := jsonb_build_object('done',true,'processedAt',now(),
    'processedBy','apple_iap_verify_product','activationType',p_activation_type,
    'propertyId',p_property_id,'propertyCode',v_property.kode,'expiresAt',v_expiry);
  update public.payment_transactions set updated_at=now(),metadata=coalesce(metadata,'{}'::jsonb) ||
    jsonb_build_object('activation',v_activation,'activationPlan',jsonb_build_object(
      'activationType',p_activation_type,'previousEntitlement',v_previous,
      'listingExpiresAt',case when p_activation_type='owner-listing' then v_expiry end,
      'featuredExpiresAt',v_featured,
      'boostExpiresAt',case when p_activation_type='boost-listing' then v_expiry end,
      'spotlightExpiresAt',case when p_activation_type='homepage-spotlight' then v_expiry end))
    where id=p_payment_id;
  return v_activation;
end;
$$;
revoke all on function public.finalize_apple_product_purchase(uuid,uuid,uuid,integer,integer,text) from public,anon,authenticated;
grant execute on function public.finalize_apple_product_purchase(uuid,uuid,uuid,integer,integer,text) to service_role;

create function public.reconcile_apple_product_refund(p_payment_id uuid, p_refund jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_payment public.payment_transactions%rowtype;
  v_property public.properties%rowtype;
  v_plan jsonb;
  v_previous jsonb;
  v_type text;
  v_review boolean := true;
begin
  select * into v_payment from public.payment_transactions where id=p_payment_id;
  if not found then return jsonb_build_object('matched',false); end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_payment.property_id::text, 0));
  select * into v_payment from public.payment_transactions where id=p_payment_id for update;
  if not found or v_payment.metadata->>'gateway' is distinct from 'apple' then
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
    metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('apple_refund',p_refund,'apple_refund_review_required',v_review)
    where id=p_payment_id;
  return jsonb_build_object('matched',true,'reviewRequired',v_review);
end;
$$;
revoke all on function public.reconcile_apple_product_refund(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.reconcile_apple_product_refund(uuid,jsonb) to service_role;
