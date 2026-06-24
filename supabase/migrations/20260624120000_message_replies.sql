-- Thread replies: human messages and AI answers can reference a parent message
alter table public.messages
  add column reply_to_id uuid references public.messages (id) on delete set null;

create index messages_reply_to_id_idx on public.messages (reply_to_id);
