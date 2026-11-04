-- NEBULA FINAL FIX (ASCII only, safe to run many times)
-- Supabase -> SQL Editor -> paste -> Run

-- 1) create starter chat (bypasses RLS via security definer)
create or replace function public.create_starter_chat()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_chat uuid;
begin
  select c.id into existing_chat
  from public.chats c
  join public.chat_members m on m.chat_id = c.id
  where m.user_id = auth.uid()
  limit 1;

  if existing_chat is not null then
    return existing_chat;
  end if;

  insert into public.chats (title, is_group, created_by)
  values ('Nebula HQ', true, auth.uid())
  returning id into existing_chat;

  insert into public.chat_members (chat_id, user_id)
  values (existing_chat, auth.uid());

  insert into public.messages (chat_id, sender_id, body)
  values (existing_chat, auth.uid(), 'Welcome to Nebula HQ! The nebula is online.');

  return existing_chat;
end;
$$;

grant execute on function public.create_starter_chat() to authenticated;

-- 2) leave / delete chat: user may remove own membership
drop policy if exists "chat_members_delete_self" on public.chat_members;
create policy "chat_members_delete_self"
  on public.chat_members for delete
  to authenticated
  using (user_id = auth.uid());

-- 3) join chat: own membership only
drop policy if exists "chat_members_insert_self" on public.chat_members;
create policy "chat_members_insert_self"
  on public.chat_members for insert
  to authenticated
  with check (user_id = auth.uid());

-- 4) chat members are readable
drop policy if exists "chat_members_select" on public.chat_members;
create policy "chat_members_select"
  on public.chat_members for select
  to authenticated
  using (true);

-- 5) chats readable and creatable by logged users
drop policy if exists "chats_select_member" on public.chats;
create policy "chats_select_member"
  on public.chats for select
  to authenticated
  using (true);

drop policy if exists "chats_insert_auth" on public.chats;
create policy "chats_insert_auth"
  on public.chats for insert
  to authenticated
  with check (true);

-- 6) messages: read all, insert as self
drop policy if exists "messages_select_member" on public.messages;
create policy "messages_select_member"
  on public.messages for select
  to authenticated
  using (true);

drop policy if exists "messages_insert_member" on public.messages;
create policy "messages_insert_member"
  on public.messages for insert
  to authenticated
  with check (sender_id = auth.uid());

-- 7) profiles readable
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

select 'nebula final fix ok' as status;
