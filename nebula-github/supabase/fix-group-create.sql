-- NEBULA: create a group with extra members (bypasses RLS insert-self)
-- Supabase -> SQL Editor -> paste -> Run

create or replace function public.create_group_chat(p_title text, p_member_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  uid uuid := auth.uid();
  mid uuid;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  insert into public.chats (title, is_group, created_by)
  values (nullif(trim(p_title), ''), true, uid)
  returning id into new_id;

  insert into public.chat_members (chat_id, user_id)
  values (new_id, uid);

  if p_member_ids is not null then
    foreach mid in array p_member_ids loop
      if mid is not null and mid is distinct from uid then
        insert into public.chat_members (chat_id, user_id)
        values (new_id, mid)
        on conflict do nothing;
      end if;
    end loop;
  end if;

  return new_id;
end;
$$;

grant execute on function public.create_group_chat(text, uuid[]) to authenticated;
