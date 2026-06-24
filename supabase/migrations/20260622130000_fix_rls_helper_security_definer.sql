-- RLS helpers must bypass RLS when reading room_participants,
-- otherwise policies that call them recurse and deny all rows.

create or replace function public.is_room_participant(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.room_participants
    where room_id = p_room_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_room_owner(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.room_participants
    where room_id = p_room_id
      and user_id = auth.uid()
      and role = 'owner'
  );
$$;

create or replace function public.shares_room_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.room_participants as mine
    join public.room_participants as theirs
      on mine.room_id = theirs.room_id
    where mine.user_id = auth.uid()
      and theirs.user_id = p_user_id
  );
$$;

revoke all on function public.is_room_participant(uuid) from public;
revoke all on function public.is_room_owner(uuid) from public;
revoke all on function public.shares_room_with(uuid) from public;
grant execute on function public.is_room_participant(uuid) to authenticated;
grant execute on function public.is_room_owner(uuid) to authenticated;
grant execute on function public.shares_room_with(uuid) to authenticated;
