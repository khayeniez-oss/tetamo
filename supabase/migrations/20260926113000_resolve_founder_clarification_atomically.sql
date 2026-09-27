-- ============================================================
-- FOUNDER CLARIFICATION ATOMIC RESOLVER
--
-- Resolves a Meeting Room Founder clarification only when:
-- - the meeting is still in progress;
-- - the clarification item is still pending;
-- - the item belongs to the exact blocked Rupert task;
-- - the Founder turn is explicitly linked to both;
-- - the task is still blocked for unresolved customer intent.
--
-- The task and meeting item transition in one transaction.
-- This function is server/service-role only.
-- ============================================================

create or replace function public.resolve_ai_founder_clarification(
  p_meeting_id uuid,
  p_meeting_item_id uuid,
  p_task_id uuid,
  p_founder_turn_id uuid,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meeting public.ai_meetings%rowtype;
  v_item public.ai_meeting_items%rowtype;
  v_task public.ai_tasks%rowtype;
  v_turn public.ai_meeting_turns%rowtype;

  v_rupert_id uuid;
  v_jake_id uuid;

  v_task_metadata jsonb;
  v_item_metadata jsonb;

  v_original_scope text;
  v_clarification_text text;
  v_clarified_at timestamptz := now();

  v_next_task_metadata jsonb;
  v_next_item_metadata jsonb;
begin
  /*
   * Meeting must still be active.
   */
  select *
  into v_meeting
  from public.ai_meetings
  where id = p_meeting_id
  for update;

  if not found then
    raise exception
      'Founder clarification meeting was not found.';
  end if;

  if v_meeting.status <> 'in_progress' then
    raise exception
      'Founder clarification meeting is not in progress.';
  end if;

  /*
   * Resolve exact AI Team identities.
   */
  select id
  into v_rupert_id
  from public.ai_agents
  where agent_key = 'rupert'
  limit 1;

  if v_rupert_id is null then
    raise exception
      'Rupert AI Team profile was not found.';
  end if;

  select id
  into v_jake_id
  from public.ai_agents
  where agent_key = 'jake'
  limit 1;

  if v_jake_id is null then
    raise exception
      'Jake AI Team profile was not found.';
  end if;

  /*
   * Lock and verify the structured Meeting Room item.
   */
  select *
  into v_item
  from public.ai_meeting_items
  where id = p_meeting_item_id
    and meeting_id = p_meeting_id
  for update;

  if not found then
    raise exception
      'Founder clarification meeting item was not found.';
  end if;

  v_item_metadata :=
    coalesce(
      v_item.metadata,
      '{}'::jsonb
    );

  if v_item.item_type <> 'discussion' then
    raise exception
      'Founder clarification meeting item has an invalid type.';
  end if;

  if v_item.status <> 'pending' then
    raise exception
      'Founder clarification meeting item is no longer pending.';
  end if;

  if v_item.related_task_id is distinct from p_task_id then
    raise exception
      'Founder clarification meeting item does not match the task.';
  end if;

  if
    v_item_metadata ->> 'source'
      <> 'founder_clarification_queue'
    or coalesce(
      (
        v_item_metadata
          ->> 'requires_founder_clarification'
      )::boolean,
      false
    ) is not true
  then
    raise exception
      'Meeting item is not a valid Founder clarification item.';
  end if;

  /*
   * Lock and verify the exact Rupert task.
   */
  select *
  into v_task
  from public.ai_tasks
  where id = p_task_id
  for update;

  if not found then
    raise exception
      'Founder clarification task was not found.';
  end if;

  v_task_metadata :=
    coalesce(
      v_task.metadata,
      '{}'::jsonb
    );

  if v_task.assigned_to_agent_id is distinct from v_rupert_id then
    raise exception
      'Founder clarification task is not assigned to Rupert.';
  end if;

  if v_task.source_type <> 'rupert_lola_handoff' then
    raise exception
      'Founder clarification task has an invalid source type.';
  end if;

  if v_task.status <> 'blocked' then
    raise exception
      'Founder clarification task is no longer blocked.';
  end if;

  if
    lower(
      coalesce(
        v_task_metadata
          ->> 'customer_intent_scope',
        ''
      )
    ) <> 'unresolved'
    or v_task_metadata
         ->> 'content_block_reason'
       <> 'customer_intent_unresolved'
    or v_task_metadata
         ->> 'post_research_disposition'
       <> 'needs_internal_clarification'
    or coalesce(
      (
        v_task_metadata
          ->> 'content_eligible'
      )::boolean,
      true
    ) is not false
  then
    raise exception
      'Task is not in the protected unresolved-intent state.';
  end if;

  /*
   * Verify the exact Founder turn that was already stored
   * by the Meeting Room POST route.
   *
   * The resolver never accepts clarification text directly
   * from its caller. It uses only the already-persisted,
   * explicitly linked Founder turn.
   */
  select *
  into v_turn
  from public.ai_meeting_turns
  where id = p_founder_turn_id
    and meeting_id = p_meeting_id
  for update;

  if not found then
    raise exception
      'Founder clarification turn was not found.';
  end if;

  if v_turn.speaker_type <> 'user' then
    raise exception
      'Founder clarification turn is not a user turn.';
  end if;

  if v_turn.spoken_by_user_id is distinct from p_actor_user_id then
    raise exception
      'Founder clarification turn does not belong to the authenticated Founder.';
  end if;

  if v_turn.related_meeting_item_id is distinct from p_meeting_item_id then
    raise exception
      'Founder clarification turn does not match the meeting item.';
  end if;

  if v_turn.related_task_id is distinct from p_task_id then
    raise exception
      'Founder clarification turn does not match the task.';
  end if;

  if
    coalesce(
      v_turn.metadata ->> 'turn_kind',
      ''
    ) <> 'founder_clarification'
    or coalesce(
      v_turn.metadata ->> 'clarification_source',
      ''
    ) <> 'founder_clarification_queue'
  then
    raise exception
      'Founder clarification turn is missing protected clarification metadata.';
  end if;

  v_clarification_text :=
    trim(
      coalesce(
        v_turn.content,
        ''
      )
    );

  if v_clarification_text = '' then
    raise exception
      'Founder clarification text is empty.';
  end if;

  /*
   * Preserve the original ambiguity explicitly.
   *
   * The Founder clarification does NOT rewrite what the
   * customers originally said. It changes only the internal
   * scope for this content task.
   */
  v_original_scope :=
    coalesce(
      nullif(
        trim(
          v_task_metadata
            ->> 'original_customer_intent_scope'
        ),
        ''
      ),
      nullif(
        trim(
          v_task_metadata
            ->> 'customer_intent_scope'
        ),
        ''
      ),
      'unresolved'
    );

  v_next_task_metadata :=
    v_task_metadata
    || jsonb_build_object(
      'original_customer_intent_scope',
      v_original_scope,

      'customer_intent_scope',
      'founder_clarified',

      'founder_clarification_text',
      v_clarification_text,

      'founder_clarification_turn_id',
      p_founder_turn_id::text,

      'founder_clarification_item_id',
      p_meeting_item_id::text,

      'founder_clarification_meeting_id',
      p_meeting_id::text,

      'founder_clarification_actor_user_id',
      p_actor_user_id::text,

      'founder_clarification_source',
      'meeting_room',

      'founder_clarified_at',
      v_clarified_at,

      /*
       * Founder clarification makes the task retryable,
       * but it does NOT make the existing research report
       * content-eligible.
       */
      'content_eligible',
      false,

      'content_block_reason',
      'founder_clarification_requires_research',

      'quality_review_state',
      'founder_clarified_pending_research',

      'post_research_disposition',
      'retry_research_with_founder_clarification'
    );

  /*
   * First state transition:
   * blocked -> pending.
   *
   * Rupert's weekly cron does not consume
   * rupert_lola_handoff tasks, so this does not auto-run.
   */
  update public.ai_tasks
  set
    status = 'pending',

    result_summary =
      'Founder clarification was recorded in Meeting Room. The original customer evidence remains preserved as ambiguous. Rupert may now retry research using the Founder-provided internal scope.',

    metadata =
      v_next_task_metadata
  where id = p_task_id
    and status = 'blocked';

  if not found then
    raise exception
      'Founder clarification task changed before resolution.';
  end if;

  /*
   * Second state transition:
   * pending Meeting Room item -> actioned.
   */
  v_next_item_metadata :=
    v_item_metadata
    || jsonb_build_object(
      'clarification_status',
      'resolved',

      'clarification_turn_id',
      p_founder_turn_id::text,

      'clarified_by_user_id',
      p_actor_user_id::text,

      'clarified_at',
      v_clarified_at,

      'resulting_task_status',
      'pending',

      'resulting_customer_intent_scope',
      'founder_clarified'
    );

  update public.ai_meeting_items
  set
    status = 'actioned',
    metadata = v_next_item_metadata
  where id = p_meeting_item_id
    and status = 'pending';

  if not found then
    raise exception
      'Founder clarification meeting item changed before resolution.';
  end if;

  /*
   * Atomic audit trail.
   *
   * Do not duplicate the Founder clarification text here.
   * The exact text remains on the linked meeting turn and
   * protected task metadata.
   */
  insert into public.ai_activity (
    agent_id,
    actor_user_id,
    event_type,
    action,
    entity_type,
    entity_id,
    task_id,
    severity,
    details
  )
  values (
    v_jake_id,
    p_actor_user_id,
    'meeting_clarification',
    'founder_clarification_resolved',
    'ai_meeting_item',
    p_meeting_item_id::text,
    p_task_id,
    'info',
    jsonb_build_object(
      'meeting_id',
      p_meeting_id,

      'meeting_item_id',
      p_meeting_item_id,

      'founder_turn_id',
      p_founder_turn_id,

      'task_id',
      p_task_id,

      'previous_task_status',
      'blocked',

      'next_task_status',
      'pending',

      'previous_customer_intent_scope',
      v_original_scope,

      'next_customer_intent_scope',
      'founder_clarified'
    )
  );

  return jsonb_build_object(
    'ok',
    true,

    'meeting_id',
    p_meeting_id,

    'meeting_item_id',
    p_meeting_item_id,

    'task_id',
    p_task_id,

    'founder_turn_id',
    p_founder_turn_id,

    'meeting_item_status',
    'actioned',

    'task_status',
    'pending',

    'customer_intent_scope',
    'founder_clarified',

    'clarified_at',
    v_clarified_at
  );
end;
$$;

revoke all
on function public.resolve_ai_founder_clarification(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid
)
from public;

revoke all
on function public.resolve_ai_founder_clarification(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid
)
from anon;

revoke all
on function public.resolve_ai_founder_clarification(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid
)
from authenticated;

grant execute
on function public.resolve_ai_founder_clarification(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid
)
to service_role;
