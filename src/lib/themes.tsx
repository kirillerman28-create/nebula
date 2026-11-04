/**
 * ТЕМЫ (папки чатов) — как в Telegram.
 *
 * Тема — это набор чатов с названием и значком. Чаты можно раскладывать
 * по темам в любое время через меню чата. Хранится в localStorage.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export interface ChatTheme {
  id: string
  title: string
  icon: string
  /** id чатов в этой теме */
  chatIds: string[]
}

const STORAGE_KEY = 'nebula:themes'

interface ThemesContextValue {
  themes: ChatTheme[]
  activeTheme: string | null
  setActiveTheme: (id: string | null) => void
  createTheme: (title: string, icon: string) => void
  renameTheme: (id: string, title: string, icon: string) => void
  deleteTheme: (id: string) => void
  toggleChatInTheme: (themeId: string, chatId: string) => void
  themesOfChat: (chatId: string) => ChatTheme[]
}

const ThemesContext = createContext<ThemesContextValue | null>(null)

function readStored(): ChatTheme[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ChatTheme[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function ThemesProvider({ children }: { children: ReactNode }) {
  const [themes, setThemes] = useState<ChatTheme[]>(readStored)
  const [activeTheme, setActiveTheme] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(themes))
  }, [themes])

  const createTheme = useCallback((title: string, icon: string) => {
    const theme: ChatTheme = {
      id: `theme-${Date.now()}`,
      title: title.trim() || 'Тема',
      icon: icon || '🏷',
      chatIds: [],
    }
    setThemes((prev) => [...prev, theme])
  }, [])

  const renameTheme = useCallback((id: string, title: string, icon: string) => {
    setThemes((prev) =>
      prev.map((theme) =>
        theme.id === id ? { ...theme, title: title.trim() || theme.title, icon: icon || theme.icon } : theme,
      ),
    )
  }, [])

  const deleteTheme = useCallback((id: string) => {
    setThemes((prev) => prev.filter((theme) => theme.id !== id))
    setActiveTheme((current) => (current === id ? null : current))
  }, [])

  const toggleChatInTheme = useCallback((themeId: string, chatId: string) => {
    setThemes((prev) =>
      prev.map((theme) => {
        if (theme.id !== themeId) return theme
        const has = theme.chatIds.includes(chatId)
        return {
          ...theme,
          chatIds: has ? theme.chatIds.filter((id) => id !== chatId) : [...theme.chatIds, chatId],
        }
      }),
    )
  }, [])

  const themesOfChat = useCallback(
    (chatId: string) => themes.filter((theme) => theme.chatIds.includes(chatId)),
    [themes],
  )

  const value = useMemo(
    () => ({
      themes,
      activeTheme,
      setActiveTheme,
      createTheme,
      renameTheme,
      deleteTheme,
      toggleChatInTheme,
      themesOfChat,
    }),
    [themes, activeTheme, createTheme, renameTheme, deleteTheme, toggleChatInTheme, themesOfChat],
  )

  return <ThemesContext.Provider value={value}>{children}</ThemesContext.Provider>
}

export function useThemes(): ThemesContextValue {
  const context = useContext(ThemesContext)
  if (!context) throw new Error('useThemes нужно вызывать внутри <ThemesProvider>')
  return context
}
