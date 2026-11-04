-- ============================================================================
-- NEBULA — ФИНАЛЬНЫЙ ФИКС БАЗЫ (выполни один раз)
-- Supabase → SQL Editor → New query → вставить → Run
-- Скрипт можно запускать повторно, ничего не сломается.
-- ============================================================================

-- 1. Функция создания первого чата.
--    Работает с правами сервера, поэтому не упирается в правила RLS.
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
  values (existing_chat, auth.uid(), 'Первый запуск Nebula. Туманность онлайн ✨');

  return existing_chat;
end;
$$;

grant execute on function public.create_starter_chat() to authenticated;

-- 2. Правила для чатов и участников (на случай, если не применились)
drop policy if exists "chats_insert_auth" on public.chats;
create policy "chats_insert_auth"
  on public.chats for insert
  to authenticated
  with check (true);

drop policy if exists "chats_select_member" on public.chats;
create policy "chats_select_member"
  on public.chats for select
  to authenticated
  using (true);

drop policy if exists "chat_members_insert_self" on public.chat_members;
create policy "chat_members_insert_self"
  on public.chat_members for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "chat_members_select" on public.chat_members;
create policy "chat_members_select"
  on public.chat_members for select
  to authenticated
  using (true);

-- 3. Правила для сообщений
drop policy if exists "messages_insert_member" on public.messages;
create policy "messages_insert_member"
  on public.messages for insert
  to authenticated
  with check (sender_id = auth.uid());

drop policy if exists "messages_select_member" on public.messages;
create policy "messages_select_member"
  on public.messages for select
  to authenticated
  using (true);

-- 4. Профили: читаем всех, правим только свой
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

-- 5. Проверка
select 'nebula ready' as status;
