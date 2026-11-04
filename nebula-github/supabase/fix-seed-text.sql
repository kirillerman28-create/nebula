-- NEBULA: fix welcome text inside create_starter_chat (ASCII only, encoding-safe)
-- Supabase -> SQL Editor -> paste -> Run
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

select 'seed text fixed' as status;
