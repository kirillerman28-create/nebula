-- ============================================================================
--  NEBULA — схема базы для Supabase
--  Где запускать: Supabase → SQL Editor → New query → вставить всё → Run.
--  Скрипт идемпотентный: можно запускать повторно, ничего не сломается.
-- ============================================================================

-- 0. Расширение для gen_random_uuid()
create extension if not exists pgcrypto;

-- ============================================================================
-- 1. ПРОФИЛИ
--    Одна строка на пользователя. Почта живёт в auth.users, а тут — ник и флаги.
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text not null,
  avatar_url text,
  is_creator boolean not null default false,
  created_at timestamptz not null default now()
);

-- аватар-эмодзи (добавляется на уже существующих базах)
alter table public.profiles add column if not exists avatar_emoji text;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Автосоздание профиля при регистрации (срабатывает после ввода кода).
-- Именно здесь твоя почта получает username kirill и флаг is_creator = true.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
  creator boolean;
begin
  creator := lower(new.email) = lower('Kirillerman28@gmail.com');

  base_username := lower(split_part(new.email, '@', 1));
  base_username := regexp_replace(base_username, '[^a-z0-9_]', '', 'g');
  if base_username is null or base_username = '' then
    base_username := 'nebula';
  end if;

  final_username := case when creator then 'kirill' else base_username end;

  -- ник должен быть уникальным: если занят — добавляем 4 случайных символа
  if exists (select 1 from public.profiles p where p.username = final_username) then
    final_username := final_username || '_' || substr(md5(random()::text), 1, 4);
  end if;

  insert into public.profiles (id, username, display_name, is_creator)
  values (
    new.id,
    final_username,
    case when creator then 'Kirill' else initcap(base_username) end,
    creator
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Бэкфилл: если ты уже входил до применения этого скрипта — профиль появится сам
insert into public.profiles (id, username, display_name, is_creator)
select
  u.id,
  case
    when lower(u.email) = lower('Kirillerman28@gmail.com') then 'kirill'
    else regexp_replace(lower(split_part(u.email, '@', 1)), '[^a-z0-9_]', '', 'g')
  end,
  case
    when lower(u.email) = lower('Kirillerman28@gmail.com') then 'Kirill'
    else initcap(regexp_replace(lower(split_part(u.email, '@', 1)), '[^a-z0-9_]', '', 'g'))
  end,
  lower(u.email) = lower('Kirillerman28@gmail.com')
from auth.users u
where u.email is not null
on conflict (id) do nothing;

-- ============================================================================
-- 2. ЧАТЫ И УЧАСТНИКИ
-- ============================================================================
create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  is_group boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_members (
  chat_id uuid not null references public.chats (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (chat_id, user_id)
);

alter table public.chats enable row level security;
alter table public.chat_members enable row level security;

-- Проверка «я участник чата?».
-- security definer нужен, чтобы политика не вызывала саму себя (рекурсия RLS).
create or replace function public.is_chat_member(target_chat uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.chat_members m
    where m.chat_id = target_chat
      and m.user_id = auth.uid()
  );
$$;

grant execute on function public.is_chat_member(uuid) to authenticated;

drop policy if exists "chats_select_member" on public.chats;
create policy "chats_select_member"
  on public.chats for select
  to authenticated
  using (public.is_chat_member(id));

-- создавать чат может любой вошедший пользователь
drop policy if exists "chats_insert_own" on public.chats;
create policy "chats_insert_own"
  on public.chats for insert
  to authenticated
  with check (created_by = auth.uid() or created_by is null);

drop policy if exists "chat_members_select" on public.chat_members;
create policy "chat_members_select"
  on public.chat_members for select
  to authenticated
  using (user_id = auth.uid() or public.is_chat_member(chat_id));

-- Пока без приглашений: войти можно в любой чат по его id.
-- Для тестов удобно, для продакшена позже сделаем таблицу инвайтов.
drop policy if exists "chat_members_insert_self" on public.chat_members;
create policy "chat_members_insert_self"
  on public.chat_members for insert
  to authenticated
  with check (user_id = auth.uid());

-- ============================================================================
-- 3. СООБЩЕНИЯ
-- ============================================================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null default '',
  attachment_url text,
  attachment_type text,
  created_at timestamptz not null default now()
);

-- вложения (добавляется на уже существующих базах)
alter table public.messages add column if not exists attachment_url text;
alter table public.messages add column if not exists attachment_type text;
alter table public.messages alter column body set default '';

-- сообщение может быть без текста, но с файлом
alter table public.messages drop constraint if exists messages_body_check;
alter table public.messages
  add constraint messages_body_check
  check (char_length(body) <= 2000 and (char_length(body) > 0 or attachment_url is not null));

create index if not exists messages_chat_created_idx
  on public.messages (chat_id, created_at desc);

alter table public.messages enable row level security;

drop policy if exists "messages_select_member" on public.messages;
create policy "messages_select_member"
  on public.messages for select
  to authenticated
  using (public.is_chat_member(chat_id));

drop policy if exists "messages_insert_member" on public.messages;
create policy "messages_insert_member"
  on public.messages for insert
  to authenticated
  with check (sender_id = auth.uid() and public.is_chat_member(chat_id));

drop policy if exists "messages_delete_own" on public.messages;
create policy "messages_delete_own"
  on public.messages for delete
  to authenticated
  using (sender_id = auth.uid());

-- ============================================================================
-- 5. ХРАНИЛИЩЕ ФАЙЛОВ (фото, видео, аватарки)
--    Два публичных бакета: media — вложения в чатах, avatars — аватарки.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- читать файлы могут все (ссылки публичные)
drop policy if exists "nebula_files_read" on storage.objects;
create policy "nebula_files_read"
  on storage.objects for select
  using (bucket_id in ('media', 'avatars'));

-- загружать может только вошедший пользователь
drop policy if exists "nebula_files_upload" on storage.objects;
create policy "nebula_files_upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id in ('media', 'avatars'));

-- удалять — только свои файлы
drop policy if exists "nebula_files_delete" on storage.objects;
create policy "nebula_files_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id in ('media', 'avatars') and owner = auth.uid());

-- ============================================================================
-- 6. ПРАВА И REALTIME
-- ============================================================================
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete
  on public.profiles, public.chats, public.chat_members, public.messages
  to authenticated;

-- Подключаем таблицу сообщений к Realtime (живая доставка в браузер)
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

-- Готово. Проверка: select * from public.profiles;
