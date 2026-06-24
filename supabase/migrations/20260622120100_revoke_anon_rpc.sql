-- Revoke RPC access from anon; handle_new_user is trigger-only
revoke execute on function public.join_room(text) from anon;
revoke execute on function public.create_room(text, text) from anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
