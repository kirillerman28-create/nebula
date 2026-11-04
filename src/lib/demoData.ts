/**
 * ДЕМО-РЕЖИМ.
 * Если Supabase недоступен (или ты просто хочешь посмотреть дизайн),
 * приложение показывает эти данные и работает без сервера.
 * Ничего не сохраняется — только память вкладки.
 */
import { CREATOR_DISPLAY_NAME, CREATOR_EMAIL, CREATOR_USERNAME } from './config'
import type { AppUser, Chat, Message } from '../types'

export const demoUser: AppUser = {
  id: 'demo-self',
  email: CREATOR_EMAIL,
  username: CREATOR_USERNAME,
  displayName: CREATOR_DISPLAY_NAME,
  isCreator: true,
  avatarUrl: null,
  avatarEmoji: '🌌',
}

export const demoMembers: AppUser[] = [
  demoUser,
  {
    id: 'demo-alice',
    email: 'alice@nebula.space',
    username: 'alice',
    displayName: 'Алиса',
    isCreator: false,
    avatarUrl: null,
    avatarEmoji: '⭐',
  },
  {
    id: 'demo-mark',
    email: 'mark@nebula.space',
    username: 'mark',
    displayName: 'Марк',
    isCreator: false,
    avatarUrl: null,
    avatarEmoji: '🛸',
  },
]

export const demoChats: Chat[] = [
  { id: 'demo-chat-hq', title: 'Nebula HQ', is_group: true, created_at: '2026-10-30T09:00:00.000Z' },
  { id: 'demo-chat-alice', title: 'Алиса', is_group: false, created_at: '2026-10-30T10:15:00.000Z' },
  { id: 'demo-chat-lab', title: 'Лаборатория туманностей', is_group: true, created_at: '2026-10-30T11:30:00.000Z' },
]

export const demoMessages: Message[] = [
  {
    id: 'demo-m1',
    chat_id: 'demo-chat-hq',
    sender_id: 'demo-self',
    body: 'Первый запуск Nebula. Туманность онлайн ✨',
    created_at: '2026-10-30T09:00:10.000Z',
  },
  {
    id: 'demo-m2',
    chat_id: 'demo-chat-hq',
    sender_id: 'demo-alice',
    body: 'Выглядит как настоящее космическое стекло 🌌',
    created_at: '2026-10-30T09:01:22.000Z',
  },
  {
    id: 'demo-m3',
    chat_id: 'demo-chat-hq',
    sender_id: 'demo-mark',
    body: 'Кнопки реально вдавливаются. Красота.',
    created_at: '2026-10-30T09:02:05.000Z',
  },
  {
    id: 'demo-m4',
    chat_id: 'demo-chat-alice',
    sender_id: 'demo-alice',
    body: 'Кирилл, покажешь, как бейдж создателя сделан?',
    created_at: '2026-10-30T10:16:00.000Z',
  },
  {
    id: 'demo-m5',
    chat_id: 'demo-chat-alice',
    sender_id: 'demo-self',
    body: 'Это миниатюрная чёрная дыра: чёрный центр + вращающийся диск свечения.',
    created_at: '2026-10-30T10:18:30.000Z',
  },
  {
    id: 'demo-m6',
    chat_id: 'demo-chat-lab',
    sender_id: 'demo-mark',
    body: 'Собираем PWA на следующей неделе?',
    created_at: '2026-10-30T11:31:00.000Z',
  },
]
