alter table public.rooms
  add column ai_reasoning_effort text
  check (
    ai_reasoning_effort is null
    or ai_reasoning_effort in ('low', 'medium', 'high')
  );

create or replace function public.set_room_ai_reasoning_effort(
  p_room_id uuid,
  p_effort text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_prompt_ai_in_room(p_room_id) then
    raise exception 'Permission denied';
  end if;

  if p_effort is not null and p_effort not in ('low', 'medium', 'high') then
    raise exception 'Invalid reasoning effort';
  end if;

  update public.rooms
  set ai_reasoning_effort = p_effort
  where id = p_room_id;

  if not found then
    raise exception 'Room not found';
  end if;
end;
$$;

grant execute on function public.set_room_ai_reasoning_effort(uuid, text)
  to authenticated;
