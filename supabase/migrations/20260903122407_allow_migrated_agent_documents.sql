-- Grandfather existing migrated Tetamo agent memberships
-- into Professional Agent Tools.

create or replace function public.has_agent_document_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.agent_memberships membership
    where membership.user_id = auth.uid()
      and membership.status = 'active'
      and (
        membership.expires_at is null
        or membership.expires_at >= now()
      )
      and (
        lower(coalesce(membership.package_id, ''))
          in ('gold', 'agent-pro')

        or lower(
          regexp_replace(
            trim(coalesce(membership.package_name, '')),
            '[[:space:]]+',
            '-',
            'g'
          )
        ) in ('gold', 'agent-pro')

        or lower(
          coalesce(membership.package_id, '') ||
          ' ' ||
          coalesce(membership.package_name, '')
        ) like '%migrated%'
      )
  );
$$;

revoke all
on function public.has_agent_document_access()
from public;

grant execute
on function public.has_agent_document_access()
to authenticated;
