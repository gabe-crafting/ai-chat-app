alter table public.messages
  add column hidden_from_ai boolean not null default false;

create or replace function public.can_prompt_ai_in_room(p_room_id uuid)
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
      and can_prompt_ai = true
  );
$$;

create policy "messages_update_ai_visibility"
  on public.messages
  for update
  to authenticated
  using (
    public.is_room_participant(room_id)
    and public.can_prompt_ai_in_room(room_id)
  )
  with check (
    public.is_room_participant(room_id)
    and public.can_prompt_ai_in_room(room_id)
  );
