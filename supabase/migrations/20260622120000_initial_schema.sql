-- AI Chat Rooms: initial schema, helpers, RLS, and realtime

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.participant_role as enum ('owner', 'member');
create type public.message_role as enum ('user', 'assistant', 'system');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  created_by uuid not null references public.profiles (id) on delete cascade,
  model text not null default 'openai/gpt-4o-mini',
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create index rooms_created_by_idx on public.rooms (created_by);
create index rooms_invite_code_idx on public.rooms (invite_code);

create table public.room_participants (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.participant_role not null default 'member',
  can_prompt_ai boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index room_participants_user_id_idx on public.room_participants (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  role public.message_role not null,
  content text not null check (char_length(trim(content)) > 0),
  model text,
  created_at timestamptz not null default now()
);

create index messages_room_id_created_at_idx on public.messages (room_id, created_at);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_full_user()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false;
$$;

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

create or replace function public.generate_invite_code()
returns text
language sql
volatile
set search_path = public
as $$
  select lower(substr(md5(gen_random_uuid()::text || clock_timestamp()::text), 1, 8));
$$;

-- ---------------------------------------------------------------------------
-- RPCs (security definer for join + atomic room create)
-- ---------------------------------------------------------------------------

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

create or replace function public.create_room(
  p_name text,
  p_model text default 'openai/gpt-4o-mini'
)
returns table (room_id uuid, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid;
  v_invite_code text;
  v_name text := trim(p_name);
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_full_user() then
    raise exception 'Guests cannot create rooms';
  end if;

  if char_length(v_name) = 0 then
    raise exception 'Room name is required';
  end if;

  insert into public.profiles (id, display_name)
  values (
    auth.uid(),
    coalesce(
      nullif(trim(auth.jwt() ->> 'display_name'), ''),
      nullif(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1), ''),
      'User'
    )
  )
  on conflict (id) do nothing;

  v_invite_code := public.generate_invite_code();

  insert into public.rooms (name, created_by, model, invite_code)
  values (v_name, auth.uid(), coalesce(nullif(trim(p_model), ''), 'openai/gpt-4o-mini'), v_invite_code)
  returning id, rooms.invite_code into v_room_id, v_invite_code;

  insert into public.room_participants (room_id, user_id, role, can_prompt_ai)
  values (v_room_id, auth.uid(), 'owner', true);

  return query
  select v_room_id, v_invite_code;
end;
$$;

revoke all on function public.join_room(text) from public;
revoke all on function public.create_room(text, text) from public;
grant execute on function public.join_room(text) to authenticated;
grant execute on function public.create_room(text, text) to authenticated;

revoke execute on function public.join_room(text) from anon;
revoke execute on function public.create_room(text, text) from anon;

-- ---------------------------------------------------------------------------
-- Profile on signup (full accounts; guests set name in app before join)
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      case when coalesce(new.is_anonymous, false) then 'Guest' else 'User' end
    )
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_participants enable row level security;
alter table public.messages enable row level security;

-- profiles
create policy "profiles_select"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid() or public.shares_room_with(id));

create policy "profiles_insert_self"
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles_update_self"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- rooms
create policy "rooms_select_participant"
  on public.rooms
  for select
  to authenticated
  using (public.is_room_participant(id));

create policy "rooms_insert_full_user"
  on public.rooms
  for insert
  to authenticated
  with check (public.is_full_user() and created_by = auth.uid());

create policy "rooms_update_owner"
  on public.rooms
  for update
  to authenticated
  using (public.is_room_owner(id))
  with check (public.is_room_owner(id));

-- room_participants
create policy "room_participants_select"
  on public.room_participants
  for select
  to authenticated
  using (public.is_room_participant(room_id));

create policy "room_participants_insert_owner"
  on public.room_participants
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and role = 'owner'
    and can_prompt_ai = true
    and public.is_full_user()
    and exists (
      select 1
      from public.rooms
      where id = room_id
        and created_by = auth.uid()
    )
  );

create policy "room_participants_update_owner"
  on public.room_participants
  for update
  to authenticated
  using (public.is_room_owner(room_id))
  with check (public.is_room_owner(room_id));

create policy "room_participants_delete_self_or_owner"
  on public.room_participants
  for delete
  to authenticated
  using (user_id = auth.uid() or public.is_room_owner(room_id));

-- messages
create policy "messages_select_participant"
  on public.messages
  for select
  to authenticated
  using (public.is_room_participant(room_id));

create policy "messages_insert_human"
  on public.messages
  for insert
  to authenticated
  with check (
    public.is_room_participant(room_id)
    and user_id = auth.uid()
    and role = 'user'
  );

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

alter table public.messages replica identity full;

alter publication supabase_realtime add table public.messages;
