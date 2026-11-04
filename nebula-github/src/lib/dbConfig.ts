/**
 * Настройки подключения к Supabase.
 *
 * По умолчанию берём значения из config.ts, но если в localStorage
 * сохранены свои URL и ключ — используем их. Так базу можно привязать
 * прямо из интерфейса, не редактируя код.
 */
import { STORAGE_PREFIX, SUPABASE_ANON_KEY, SUPABASE_URL } from './config'

const URL_KEY = `${STORAGE_PREFIX}db-url`
const ANON_KEY = `${STORAGE_PREFIX}db-key`

export interface DbConfig {
  url: string
  anonKey: string
  /** true — значения введены вручную, а не взяты из config.ts */
  custom: boolean
}

export function getDbConfig(): DbConfig {
  const url = localStorage.getItem(URL_KEY)?.trim()
  const anonKey = localStorage.getItem(ANON_KEY)?.trim()
  if (url && anonKey) return { url, anonKey, custom: true }
  return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, custom: false }
}

export function saveDbConfig(url: string, anonKey: string): void {
  localStorage.setItem(URL_KEY, url.trim().replace(/\/+$/, ''))
  localStorage.setItem(ANON_KEY, anonKey.trim())
}

export function resetDbConfig(): void {
  localStorage.removeItem(URL_KEY)
  localStorage.removeItem(ANON_KEY)
}
