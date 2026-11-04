/**
 * Один-единственный клиент Supabase на всё приложение.
 *
 * Важно: клиент создаётся ОДИН раз и импортируется везде. Если создавать
 * его в каждом компоненте, Supabase начнёт путать сессии и ты получишь
 * «выкидывает из аккаунта» или «слишком много запросов к auth».
 *
 * URL и ключ берутся из dbConfig: сначала localStorage (если привязал
 * базу через интерфейс), иначе — значения из config.ts.
 */
import { createClient } from '@supabase/supabase-js'
import { getDbConfig } from './dbConfig'

const { url, anonKey } = getDbConfig()

export const supabase = createClient(url, anonKey, {
  auth: {
    // сессия живёт в localStorage и переживает перезагрузку страницы
    persistSession: true,
    // токен обновляется сам, пока вкладка открыта
    autoRefreshToken: true,
    // если в ссылке из письма пришёл токен — Supabase его подхватит
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
})
