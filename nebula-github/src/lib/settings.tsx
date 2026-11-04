/**
 * НАСТРОЙКИ ПРИЛОЖЕНИЯ — хранятся в localStorage и применяются к <html>.
 *
 * Фон (включая свой), прозрачность интерфейса, размер текста, анимации,
 * отправка по Enter, аватарки в чате, компактный режим.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type BackgroundId =
  | 'default'
  | 'pink'
  | 'pink-dark'
  | 'helix'
  | 'orion'
  | 'carina'
  | 'galaxy'
  | 'earth'
  | 'saturn'
  | 'milky'
  | 'void'
  | 'custom'

export type TextSize = 'sm' | 'md' | 'lg'

export interface AppSettings {
  background: BackgroundId
  customBackground: string | null
  /** Фон-обложка в профиле (шапка карточки профиля) */
  profileBackground: BackgroundId | null
  /** Своя картинка для обложки профиля (data URL) */
  profileCustomBackground: string | null
  /** Прозрачность стеклянных панелей: 0 — почти прозрачно, 100 — плотно */
  uiOpacity: number
  textSize: TextSize
  animations: boolean
  enterToSend: boolean
  showAvatars: boolean
  compact: boolean
  chatView: 'list' | 'grid'
}

const STORAGE_KEY = 'nebula:settings'

const DEFAULTS: AppSettings = {
  background: 'default',
  customBackground: null,
  profileBackground: 'pink-dark',
  profileCustomBackground: null,
  uiOpacity: 72,
  textSize: 'md',
  animations: true,
  enterToSend: true,
  showAvatars: true,
  compact: false,
  chatView: 'list',
}

interface BackgroundItem {
  id: BackgroundId
  title: string
  url: string | null
  group: 'base' | 'space' | 'planets' | 'own'
}

/** Галерея фонов. url = null → родной градиент или свой загруженный фон. */
export const BACKGROUNDS: BackgroundItem[] = [
  { id: 'default', title: 'Nebula (по умолчанию)', url: null, group: 'base' },
  { id: 'void', title: 'Глубокая пустота', url: null, group: 'base' },
  { id: 'custom', title: 'Свой фон', url: null, group: 'own' },

  { id: 'pink', title: 'Розовая туманность', url: '/backgrounds/nebula-pink.jpg', group: 'space' },
  { id: 'pink-dark', title: 'Розовая (тёмная)', url: '/backgrounds/nebula-pink-dark.jpg', group: 'space' },
  { id: 'helix', title: 'Туманность Улитка', url: '/nebula-bg.jpg', group: 'space' },
  { id: 'orion', title: 'Туманность Ориона', url: '/backgrounds/orion-nebula.jpg', group: 'space' },
  { id: 'carina', title: 'Туманность Киля', url: '/backgrounds/carina-nebula.jpg', group: 'space' },
  { id: 'galaxy', title: 'Скопление галактик', url: '/backgrounds/galaxy-cluster.jpg', group: 'space' },
  { id: 'milky', title: 'Млечный Путь', url: '/backgrounds/milky-way.jpg', group: 'space' },

  { id: 'earth', title: 'Земля (Apollo 17)', url: '/backgrounds/earth.jpg', group: 'planets' },
  { id: 'saturn', title: 'Сатурн (Cassini)', url: '/backgrounds/saturn.jpg', group: 'planets' },
]

interface SettingsContextValue {
  settings: AppSettings
  update: (patch: Partial<AppSettings>) => void
  reset: () => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

function readStored(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<AppSettings>) }
  } catch {
    return DEFAULTS
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(readStored)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      /* если свой фон слишком тяжёлый — просто не сохраняем */
    }

    const root = document.documentElement
    root.dataset.bg = settings.background
    root.dataset.text = settings.textSize
    root.dataset.motion = settings.animations ? 'on' : 'off'
    root.dataset.avatars = settings.showAvatars ? 'on' : 'off'

    // Прозрачность стекла. Внизу диапазона — почти невидимое «морозное» стекло,
    // вверху — плотные панели. Чем прозрачнее, тем сильнее размытие (эффект стекла).
    const t = Math.min(100, Math.max(0, settings.uiOpacity)) / 100
    root.style.setProperty('--ui-a1', (0.05 + t * 0.87).toFixed(3))
    root.style.setProperty('--ui-a2', (0.09 + t * 0.87).toFixed(3))
    root.style.setProperty('--ui-blur', `${Math.round(34 - t * 16)}px`)
    root.style.setProperty('--ui-sat', `${Math.round(170 - t * 40)}%`)
  }, [settings])

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  const reset = useCallback(() => setSettings(DEFAULTS), [])

  const value = useMemo(() => ({ settings, update, reset }), [settings, update, reset])

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings нужно вызывать внутри <SettingsProvider>')
  return context
}

/** Итоговый фон: картинка из галереи, свой фон или null (родной градиент). */
export function resolveBackground(settings: AppSettings): string | null {
  if (settings.background === 'custom') return settings.customBackground
  return BACKGROUNDS.find((item) => item.id === settings.background)?.url ?? null
}

/** Обложка профиля: своя картинка, готовый фон из галереи или null. */
export function resolveProfileBackground(settings: AppSettings): string | null {
  if (!settings.profileBackground) return null
  if (settings.profileBackground === 'custom') return settings.profileCustomBackground
  return BACKGROUNDS.find((item) => item.id === settings.profileBackground)?.url ?? null
}
