-- NEBULA: allow a user to leave / delete a chat (remove own membership)
-- Supabase -> SQL Editor -> paste -> Run
drop policy if exists "chat_members_delete_self" on public.chat_members;
create policy "chat_members_delete_self"
  on public.chat_members for delete
  to authenticated
  using (user_id = auth.uid());

select 'leave policy ok' as status;
