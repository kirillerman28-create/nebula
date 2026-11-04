-- NEBULA: search people by username + open direct chat (ASCII only)
-- Supabase -> SQL Editor -> paste -> Run

create or replace function public.search_profiles(p_query text)
returns setof public.profiles
language sql
security definer
set search_path = public
stable
as $$
  select *
  from public.profiles
  where p_query = ''
     or lower(username) like '%' || lower(p_query) || '%'
     or lower(display_name) like '%' || lower(p_query) || '%'
  order by
    case when lower(username) = lower(p_query) then 0 else 1 end,
    username
  limit 20;
$$;

grant execute on function public.search_profiles(text) to authenticated;

create or replace function public.create_direct_chat(p_other_id uuid, p_title text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_chat uuid;
  new_chat uuid;
begin
  select c.id into existing_chat
  from public.chats c
  join public.chat_members m1 on m1.chat_id = c.id and m1.user_id = auth.uid()
  join public.chat_members m2 on m2.chat_id = c.id and m2.user_id = p_other_id
  where c.is_group = false
  limit 1;

  if existing_chat is not null then
    return existing_chat;
  end if;

  insert into public.chats (title, is_group, created_by)
  values (coalesce(nullif(p_title, ''), 'Direct chat'), false, auth.uid())
  returning id into new_chat;

  insert into public.chat_members (chat_id, user_id)
  values (new_chat, auth.uid()), (new_chat, p_other_id);

  insert into public.messages (chat_id, sender_id, body)
  values (new_chat, auth.uid(), 'Hello! Type your first message.');

  return new_chat;
end;
$$;

grant execute on function public.create_direct_chat(uuid, text) to authenticated;

select 'people search ready' as status;
