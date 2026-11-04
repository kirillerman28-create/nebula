/**
 * API — тонкая прослойка над таблицами Supabase.
 * Компонентам не нужно знать SQL: они зовут функции отсюда.
 */
import { supabase } from './supabase'
import type { AppUser, Chat, Message, Profile } from '../types'

export async function listChats(userId: string): Promise<Chat[]> {
  const { data: memberships, error } = await supabase
    .from('chat_members')
    .select('chat_id')
    .eq('user_id', userId)
  if (error) throw new Error(error.message)

  const rows = (memberships ?? []) as Array<{ chat_id: string }>
  const ids = rows.map((row) => row.chat_id)
  if (ids.length === 0) return []

  const { data: chats, error: chatsError } = await supabase
    .from('chats')
    .select('*')
    .in('id', ids)
    .order('created_at', { ascending: true })
  if (chatsError) throw new Error(chatsError.message)

  return (chats ?? []) as Chat[]
}

export async function listMessages(): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(500)
  if (error) throw new Error(error.message)
  return (data ?? []) as Message[]
}

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('*')
  if (error) throw new Error(error.message)
  return (data ?? []) as Profile[]
}

/** Поиск людей по @юзернейму или имени (через серверную функцию, обходит RLS). */
export async function searchPeople(needle: string): Promise<Profile[]> {
  const clean = needle.trim().replace(/^@/, '').toLowerCase()
  if (clean.length < 1) return []

  const { data, error } = await supabase.rpc('search_profiles', { p_query: clean })
  if (!error && Array.isArray(data)) return data as Profile[]

  // запасной путь, если функции в базе ещё нет
  const { data: rows, error: fallbackError } = await supabase
    .from('profiles')
    .select('*')
    .or(`username.ilike.%${clean}%,display_name.ilike.%${clean}%`)
    .limit(20)
  if (fallbackError) throw new Error(fallbackError.message)
  return (rows ?? []) as Profile[]
}

/** Открыть (или создать) личный чат с человеком. */
export async function openDirectChat(otherUserId: string, otherName: string): Promise<Chat> {
  const { data, error } = await supabase.rpc('create_direct_chat', {
    p_other_id: otherUserId,
    p_title: otherName,
  })
  if (error) throw new Error(error.message)

  const chatId = data as string
  const { data: chat, error: chatError } = await supabase.from('chats').select('*').eq('id', chatId).single()
  if (chatError) throw new Error(chatError.message)
  return chat as Chat
}

/** Выйти из чата / удалить его у себя — убираем своё членство. */
export async function leaveChat(chatId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('chat_members')
    .delete()
    .eq('chat_id', chatId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}

/** Создать группу (несколько человек). Через SQL-функцию, чтобы обойти RLS на чужие membership. */
export async function createGroupChat(title: string, userId: string, memberIds: string[]): Promise<Chat> {
  const others = memberIds.filter((id) => id !== userId)
  const { data, error } = await supabase.rpc('create_group_chat', {
    p_title: title,
    p_member_ids: others,
  })

  if (!error && data) {
    const chatId = data as string
    const { data: chat, error: chatError } = await supabase.from('chats').select('*').eq('id', chatId).single()
    if (!chatError && chat) return chat as Chat
  }

  const { data: chat, error: insertError } = await supabase
    .from('chats')
    .insert({ title, is_group: true, created_by: userId })
    .select('*')
    .single()
  if (insertError) throw new Error(insertError.message)

  const created = chat as Chat
  const { error: memberError } = await supabase.from('chat_members').insert({ chat_id: created.id, user_id: userId })
  if (memberError) throw new Error(memberError.message)

  return created
}

export async function sendMessage(
  chatId: string,
  senderId: string,
  body: string,
  attachmentUrl: string | null = null,
  attachmentType: string | null = null,
): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      chat_id: chatId,
      sender_id: senderId,
      body,
      attachment_url: attachmentUrl,
      attachment_type: attachmentType,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as Message
}

/** Куда кладём файлы: фото/видео — media, аватарки — avatars. */
type MediaBucket = 'media' | 'avatars'

async function uploadTo(bucket: MediaBucket, file: File, userId: string): Promise<string> {
  const rawExt = file.name.split('.').pop() ?? ''
  const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

/** Загрузить фото или видео в чат. */
export function uploadMedia(file: File, userId: string): Promise<string> {
  return uploadTo('media', file, userId)
}

/** Загрузить свою аватарку. */
export function uploadAvatar(file: File, userId: string): Promise<string> {
  return uploadTo('avatars', file, userId)
}

/**
 * Первый вход: создаём «Nebula HQ» с приветственным сообщением,
 * чтобы человек не попал в пустой экран.
 *
 * Promise хранится в модуле, потому что React в dev-режиме монтирует
 * компонент дважды — без этого получилось бы два одинаковых чата.
 */
let starterChatPromise: Promise<Chat> | null = null

export function ensureStarterChat(user: AppUser): Promise<Chat> {
  if (!starterChatPromise) {
    starterChatPromise = createStarterChat(user).catch((error: unknown) => {
      starterChatPromise = null
      throw error
    })
  }
  return starterChatPromise
}

/**
 * Создаёт «Nebula HQ» через функцию в базе (supabase/fix-chat-creation.sql).
 * Функция работает с правами сервера, поэтому не упирается в правила RLS.
 */
async function createStarterChat(_user: AppUser): Promise<Chat> {
  const { data, error } = await supabase.rpc('create_starter_chat')
  if (error) throw new Error(error.message)

  const chatId = data as string

  const { data: chat, error: chatError } = await supabase
    .from('chats')
    .select('*')
    .eq('id', chatId)
    .single()
  if (chatError) throw new Error(chatError.message)

  return chat as Chat
}

/** Живые сообщения: подписка на новые строки в public.messages. */
export function subscribeToMessages(onInsert: (message: Message) => void): () => void {
  const channel = supabase
    .channel('nebula:messages')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload) => onInsert(payload.new as Message),
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}
