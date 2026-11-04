-- ============================================================================
-- NEBULA: создание первого чата через функцию (обходит RLS надёжно)
-- Выполни этот блок один раз в SQL Editor.
-- ============================================================================
create or replace function public.create_starter_chat()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_chat uuid;
begin
  -- если у пользователя уже есть чат — возвращаем его
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

-- Проверка (не обязательно):
-- select public.create_starter_chat();
