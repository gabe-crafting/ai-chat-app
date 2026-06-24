-- Broadcast participant joins/updates/leaves to connected clients
alter table public.room_participants replica identity full;

alter publication supabase_realtime add table public.room_participants;
