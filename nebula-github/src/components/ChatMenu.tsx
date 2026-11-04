/**
 * МЕНЮ ЧАТА — открывается правым кликом по чату или кнопкой «⋯».
 *
 * Пункты: открыть, фон чата, заблокировать, выйти из группы, удалить.
 * Фон чата и блокировка хранятся локально (в браузере).
 */
import { useEffect, useRef } from 'react'
import { BACKGROUNDS, type BackgroundId } from '../lib/settings'
import type { ChatTheme } from '../lib/themes'
import type { Chat } from '../types'

interface ChatMenuProps {
  chat: Chat
  x: number
  y: number
  blocked: boolean
  chatBackground: BackgroundId | null
  onClose: () => void
  onOpen: () => void
  onToggleBlock: () => void
  onLeave: () => void
  onDelete: () => void
  onPickBackground: (id: BackgroundId | null) => void
  themes: ChatTheme[]
  onToggleTheme: (themeId: string) => void
}

export default function ChatMenu({
  chat,
  x,
  y,
  blocked,
  chatBackground,
  onClose,
  onOpen,
  onToggleBlock,
  onLeave,
  onDelete,
  onPickBackground,
  themes,
  onToggleTheme,
}: ChatMenuProps) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  // не даём меню уехать за экран
  const width = 250
  const left = Math.min(x, window.innerWidth - width - 12)
  const top = Math.min(y, window.innerHeight - 380)

  return (
    <div ref={ref} className="chat-menu" style={{ left, top, width }} role="menu">
      <header className="chat-menu__head">
        <strong>{chat.title}</strong>
        <em>{chat.is_group ? 'группа' : 'личный чат'}</em>
      </header>

      <button type="button" className="chat-menu__item" onClick={onOpen}>
        <span>💬</span> Открыть
      </button>

      <div className="chat-menu__section">
        <span className="chat-menu__label">Фон чата</span>
        <div className="chat-menu__bgs">
          <button
            type="button"
            className={`chat-menu__bg${chatBackground === null ? ' is-active' : ''}`}
            onClick={() => onPickBackground(null)}
            title="Без фона"
          >
            ✕
          </button>
          {BACKGROUNDS.filter((item) => item.url).map((item) => (
            <button
              key={item.id}
              type="button"
              className={`chat-menu__bg${chatBackground === item.id ? ' is-active' : ''}`}
              style={{ backgroundImage: `url('${item.url}')` }}
              onClick={() => onPickBackground(item.id)}
              title={item.title}
            />
          ))}
        </div>
      </div>

      {/* темы: раскладываем чат по папкам */}
      {themes.length > 0 && (
        <div className="chat-menu__section">
          <span className="chat-menu__label">Темы</span>
          <div className="chat-menu__themes">
            {themes.map((theme) => {
              const active = theme.chatIds.includes(chat.id)
              return (
                <button
                  key={theme.id}
                  type="button"
                  className={`chat-menu__theme${active ? ' is-active' : ''}`}
                  onClick={() => onToggleTheme(theme.id)}
                >
                  <span>{theme.icon}</span>
                  {theme.title}
                  <span className="chat-menu__theme-mark">{active ? '✓' : '+'}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* блокировка есть только в личных чатах — группы не блокируют */}
      {!chat.is_group && (
        <button type="button" className="chat-menu__item" onClick={onToggleBlock}>
          <span>{blocked ? '🔓' : '🔒'}</span> {blocked ? 'Разблокировать' : 'Заблокировать'}
        </button>
      )}

      {chat.is_group && (
        <button type="button" className="chat-menu__item" onClick={onLeave}>
          <span>↩️</span> Выйти из группы
        </button>
      )}

      <button type="button" className="chat-menu__item chat-menu__item--danger" onClick={onDelete}>
        <span>🗑</span> Удалить чат
      </button>
    </div>
  )
}
