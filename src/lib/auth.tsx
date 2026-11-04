/**
 * AUTH — вся логика входа живёт здесь.
 *
 * Что умеет:
 *  1) requestCode(email)      — просит Supabase отправить 6-значный код на почту
 *  2) verifyCode(email, code) — проверяет код и открывает сессию
 *  3) loginAsCreator()        — быстрый вход создателя по паролю (без кода)
 *  4) enterDemo()             — посмотреть интерфейс без сервера
 *
 * Дальше по приложению ты просто пишешь: const { me } = useAuth()
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import {
  CREATOR_DISPLAY_NAME,
  CREATOR_EMAIL,
  CREATOR_PASSWORD,
  CREATOR_USERNAME,
  STORAGE_PREFIX,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  isCreatorEmail,
} from './config'
import { ruError } from './errors'
import { demoUser } from './demoData'
import type { AppUser, Profile } from '../types'

export type BackendStatus = 'checking' | 'online' | 'offline'
export type CreatorLoginResult = 'password' | 'code-sent'

interface AuthContextValue {
  me: AppUser | null
  loading: boolean
  demo: boolean
  backend: BackendStatus
  backendError: string | null
  requestCode: (email: string) => Promise<void>
  verifyCode: (email: string, token: string) => Promise<void>
  loginAsCreator: () => Promise<CreatorLoginResult>
  enterDemo: () => void
  signOut: () => Promise<void>
  updateProfile: (patch: {
    displayName?: string
    username?: string
    avatarEmoji?: string | null
    avatarUrl?: string | null
  }) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** Из почты делаем аккуратный username: Kirillerman28@gmail.com → kirillerman28 */
function usernameFromEmail(email: string): string {
  const base = email.split('@')[0]?.toLowerCase().replace(/[^a-z0-9_]/g, '') ?? ''
  return (base || 'nebula').slice(0, 20)
}

function profileToUser(profile: Profile, email: string): AppUser {
  return {
    id: profile.id,
    email,
    username: profile.username,
    displayName: profile.display_name,
    isCreator: profile.is_creator || isCreatorEmail(email),
    avatarUrl: profile.avatar_url,
    avatarEmoji: profile.avatar_emoji ?? null,
  }
}

/** Если таблицы profiles нет или RLS не пускает — всё равно пускаем человека в чаты. */
function fallbackUser(session: Session): AppUser {
  const email = session.user.email ?? ''
  const creator = isCreatorEmail(email)
  return {
    id: session.user.id,
    email,
    username: creator ? CREATOR_USERNAME : usernameFromEmail(email),
    displayName: creator ? CREATOR_DISPLAY_NAME : usernameFromEmail(email),
    isCreator: creator,
    avatarUrl: null,
    avatarEmoji: null,
  }
}

/**
 * Читаем профиль из базы. Если триггер schema.sql не создал строку —
 * создаём её сами, чтобы приложение не падало на пустой таблице.
 */
async function loadProfile(session: Session): Promise<AppUser> {
  const email = session.user.email ?? ''
  // если регистрировались через форму — берём выбранные юзернейм, имя и аватар
  const pendingUser = localStorage.getItem(`${STORAGE_PREFIX}pending-username`)
  const pendingName = localStorage.getItem(`${STORAGE_PREFIX}pending-name`)
  const pendingAvatar = localStorage.getItem(`${STORAGE_PREFIX}pending-avatar`)
  localStorage.removeItem(`${STORAGE_PREFIX}pending-username`)
  localStorage.removeItem(`${STORAGE_PREFIX}pending-name`)
  localStorage.removeItem(`${STORAGE_PREFIX}pending-avatar`)

  const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
  const profile = data as Profile | null
  if (profile) return profileToUser(profile, email)

  const creator = isCreatorEmail(email)
  const pickedUser = pendingUser && !creator ? pendingUser : null
  const draft = {
    id: session.user.id,
    username: creator ? CREATOR_USERNAME : pickedUser ?? usernameFromEmail(email),
    display_name: creator ? CREATOR_DISPLAY_NAME : pendingName ?? pickedUser ?? usernameFromEmail(email),
    is_creator: creator,
    avatar_emoji: creator ? null : pendingAvatar,
  }

  const { data: created } = await supabase.from('profiles').insert(draft).select('*').maybeSingle()
  const createdProfile = created as Profile | null
  return createdProfile ? profileToUser(createdProfile, email) : { ...fallbackUser(session), ...draft, isCreator: creator }
}

/**
 * Хитрость для кнопки создателя: если ты вошёл кодом, а пароля у аккаунта
 * не было — тихо назначаем пароль из config.ts. После этого кнопка
 * «Войти как Создатель» работает моментально и без письма.
 */
async function syncCreatorPassword(session: Session): Promise<void> {
  const flag = `${STORAGE_PREFIX}creator-password-synced`
  if (!isCreatorEmail(session.user.email)) return
  if (localStorage.getItem(flag) === '1') return
  const { error } = await supabase.auth.updateUser({ password: CREATOR_PASSWORD })
  if (!error) localStorage.setItem(flag, '1')
}

function asMessage(err: unknown): string {
  return ruError(err instanceof Error ? err.message : String(err))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)
  const [backend, setBackend] = useState<BackendStatus>('checking')
  const [backendError, setBackendError] = useState<string | null>(null)

  /* --- Быстрый просмотр демо по ссылке: http://localhost:5173/?demo=1 --- */
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('demo') !== '1') return
    setDemo(true)
    setMe(demoUser)
  }, [])

  /* --- Проверка: а жив ли вообще наш Supabase? --- */
  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 8000)

    fetch(`${SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: SUPABASE_ANON_KEY },
      signal: controller.signal,
    })
      .then((response) => {
        if (cancelled) return
        setBackend(response.ok ? 'online' : 'offline')
        if (!response.ok) setBackendError(`Supabase ответил HTTP ${response.status}`)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setBackend('offline')
        setBackendError(error instanceof Error ? error.message : 'сетевая ошибка')
      })
      .finally(() => window.clearTimeout(timer))

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [])

  /* --- Восстановление сессии после перезагрузки страницы --- */
  useEffect(() => {
    let alive = true

    const hydrate = async (session: Session) => {
      try {
        const user = await loadProfile(session)
        if (alive) setMe(user)
        void syncCreatorPassword(session)
      } catch {
        if (alive) setMe(fallbackUser(session))
      }
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!alive) return
        if (data.session) {
          void hydrate(data.session).finally(() => {
            if (alive) setLoading(false)
          })
        } else {
          setLoading(false)
        }
      })
      .catch(() => {
        if (alive) setLoading(false)
      })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        if (alive && !demo) setMe(null)
        return
      }
      // setTimeout — чтобы не вызывать запросы внутри самого колбэка Supabase
      window.setTimeout(() => {
        if (alive) void hydrate(session)
      }, 0)
    })

    return () => {
      alive = false
      listener.subscription.unsubscribe()
    }
    // demo в зависимостях не нужен: колбэк читает его через замыкание осознанно
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const requestCode = useCallback(async (email: string) => {
    const clean = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) {
      throw new Error('Адрес почты выглядит странно — проверь, нет ли опечатки.')
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { shouldCreateUser: true },
    })
    if (error) throw new Error(asMessage(error.message))
  }, [])

  const verifyCode = useCallback(async (email: string, token: string) => {
    const code = token.replace(/\D/g, '')
    if (code.length < 6) throw new Error('Код состоит минимум из 6 цифр.')

    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code,
      type: 'email',
    })
    if (error) throw new Error(asMessage(error.message))

    if (data.session) {
      const user = await loadProfile(data.session)
      setMe(user)
      void syncCreatorPassword(data.session)
    }
  }, [])

  const loginAsCreator = useCallback(async (): Promise<CreatorLoginResult> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: CREATOR_EMAIL,
      password: CREATOR_PASSWORD,
    })

    if (!error && data.session) {
      const user = await loadProfile(data.session)
      setMe(user)
      return 'password'
    }

    // Если пароля у аккаунта нет (или он другой) — не сдаёмся:
    // отправляем код на почту создателя, дальше всё как у обычных людей.
    const fallback = await supabase.auth.signInWithOtp({
      email: CREATOR_EMAIL,
      options: { shouldCreateUser: true },
    })
    if (fallback.error) throw new Error(asMessage(fallback.error.message))
    return 'code-sent'
  }, [])

  const enterDemo = useCallback(() => {
    setDemo(true)
    setMe(demoUser)
  }, [])

  const signOut = useCallback(async () => {
    if (demo) {
      setDemo(false)
      setMe(null)
      return
    }
    await supabase.auth.signOut()
    setMe(null)
  }, [demo])

  /** Сохранение настроек профиля: имя, юзернейм, эмодзи или своя картинка. */
  const updateProfile = useCallback(
    async (patch: { displayName?: string; username?: string; avatarEmoji?: string | null; avatarUrl?: string | null }) => {
      if (!me) return
      const next: AppUser = {
        ...me,
        displayName: patch.displayName ?? me.displayName,
        username: patch.username ?? me.username,
        avatarEmoji: patch.avatarEmoji !== undefined ? patch.avatarEmoji : me.avatarEmoji,
        avatarUrl: patch.avatarUrl !== undefined ? patch.avatarUrl : me.avatarUrl,
      }
      setMe(next)
      if (demo) return

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: next.displayName,
          username: next.username,
          avatar_emoji: next.avatarEmoji,
          avatar_url: next.avatarUrl,
        })
        .eq('id', me.id)
      if (error) {
        setMe(me)
        throw new Error(asMessage(error.message))
      }
    },
    [me, demo],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      me,
      loading,
      demo,
      backend,
      backendError,
      requestCode,
      verifyCode,
      loginAsCreator,
      enterDemo,
      signOut,
      updateProfile,
    }),
    [me, loading, demo, backend, backendError, requestCode, verifyCode, loginAsCreator, enterDemo, signOut, updateProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth нужно вызывать внутри <AuthProvider>')
  return context
}
