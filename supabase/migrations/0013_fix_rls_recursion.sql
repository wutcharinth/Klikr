-- Fix infinite recursion in presentations RLS.
--
-- Cycle: presentations SELECT → "editors read presentations" → presentation_editors →
--        "owner manage editors" → presentations → repeat.
--
-- Fix: security definer helper bypasses RLS when checking ownership, breaking the cycle.

create or replace function is_presentation_owner(_presentation_id uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from presentations where id = _presentation_id and owner_id = auth.uid()
  )
$$;

-- Replace the cyclic presentation_editors policy to use the helper.
drop policy if exists "owner manage editors" on presentation_editors;
create policy "owner manage editors" on presentation_editors for all using (
  is_presentation_owner(presentation_editors.presentation_id)
) with check (
  is_presentation_owner(presentation_editors.presentation_id)
);
