-- join_room return column "room_id" conflicted with ON CONFLICT (room_id, user_id)
create or replace function public.join_room(p_invite_code text)
returns table (room_id uuid, room_name text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_room public.rooms%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into v_room
  from public.rooms
  where invite_code = p_invite_code;

  if not found then
    raise exception 'Invalid invite code';
  end if;

  insert into public.room_participants (room_id, user_id, role, can_prompt_ai)
  values (v_room.id, auth.uid(), 'member', false)
  on conflict (room_id, user_id) do nothing;

  return query
  select v_room.id, v_room.name;
end;
$$;
