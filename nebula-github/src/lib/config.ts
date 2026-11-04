/**
 * ⚙️  NEBULA CONFIG
 * ------------------------------------------------------------------
 * Это ЕДИНСТВЕННОЕ место, где лежат ключи и данные создателя.
 * .env больше нет — всё вшито в код, как ты и просил.
 *
 * Когда пересоздашь проект в Supabase — поменяй только SUPABASE_URL
 * и SUPABASE_ANON_KEY ниже, больше нигде трогать не надо.
 * ------------------------------------------------------------------
 */

export const SUPABASE_URL = 'https://fioloesanjxjoqcjcibq.supabase.co'

export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpb2xvZXNhbmp4am9xY2pjaWJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0MzUxOTQsImV4cCI6MjEwOTAxMTE5NH0.6D3yKOdFI0RHOWl5D9vX2qzppkrh-O5QA0ulJkm6aWo'

/** Создатель: почта, имя, username и пароль для быстрой кнопки входа. */
export const CREATOR_EMAIL = 'Kirillerman28@gmail.com'
export const CREATOR_USERNAME = 'kirill'
export const CREATOR_DISPLAY_NAME = 'Kirill'
export const CREATOR_PASSWORD = 'CreatorSuperSecretPassword2026!'

/** Префикс для localStorage — чтобы наши флажки не конфликтовали с другими сайтами. */
export const STORAGE_PREFIX = 'nebula:'

/** Одна и та же проверка «эта почта — создатель?» во всём приложении. */
export function isCreatorEmail(email: string | null | undefined): boolean {
  return (email ?? '').trim().toLowerCase() === CREATOR_EMAIL.toLowerCase()
}
