/** Типы — как «чертёж» данных. Совпадают с таблицами в supabase/schema.sql. */

/** Строка таблицы public.profiles */
export interface Profile {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  avatar_emoji: string | null
  is_creator: boolean
  created_at: string
}

/** Человек, с которым работает интерфейс (после нашего «перевода» из profile + auth). */
export interface AppUser {
  id: string
  email: string
  username: string
  displayName: string
  isCreator: boolean
  avatarUrl: string | null
  avatarEmoji: string | null
}

export interface Chat {
  id: string
  title: string
  is_group: boolean
  created_at: string
}

export interface Message {
  id: string
  chat_id: string
  sender_id: string
  body: string
  created_at: string
  /** Ссылка на вложение в Supabase Storage */
  attachment_url?: string | null
  /** 'image' | 'video' | null */
  attachment_type?: string | null
}
