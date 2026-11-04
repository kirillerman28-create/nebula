/**
 * ЛЕВОЕ МЕНЮ — рендерится поверх интерфейса (portal в body).
 * Настройки · Создать группу · Темы
 * На «Темы» выезжает список папок — как на наброске Кирилла.
 */
import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { ChatTheme } from '../lib/themes'

interface RailMenuProps {
  onSettings: () => void
  onCreate: () => void
  onThemesManage: () => void
  onPickTheme: (id: string | null) => void
  onClose: () => void
  themes: ChatTheme[]
  activeTheme: string | null
}

export default function RailMenu({
  onSettings,
  onCreate,
  onThemesManage,
  onPickTheme,
  onClose,
  themes,
  activeTheme,
}: RailMenuProps) {
  const [flyOpen, setFlyOpen] = useState(themes.length > 0)

  const menu = (
    <>
      <div className="rail-backdrop" onClick={onClose} />
      <nav className="rail glass-panel" aria-label="Главное меню">
        <button type="button" className="rail__item" onClick={onSettings}>
          <span className="rail__icon">⚙</span>
          <span>Настройки</span>
        </button>
        <button type="button" className="rail__item" onClick={onCreate}>
          <span className="rail__icon">✚</span>
          <span>Создать группу</span>
        </button>
        <div
          className="rail__fly-wrap"
          onMouseEnter={() => setFlyOpen(true)}
          onFocusCapture={() => setFlyOpen(true)}
        >
          <button
            type="button"
            className={`rail__item${flyOpen ? ' is-hot' : ''}`}
            onClick={() => setFlyOpen((value) => !value)}
            aria-expanded={flyOpen}
            aria-haspopup="true"
          >
            <span className="rail__icon">🏷</span>
            <span>Темы</span>
            {themes.length > 0 && <span className="rail__count">{themes.length}</span>}
          </button>

          {flyOpen && (
            <div className="theme-fly" role="menu" aria-label="Список тем">
              <button
                type="button"
                className={`theme-fly__card${activeTheme === null ? ' is-active' : ''}`}
                onClick={() => onPickTheme(null)}
              >
                Все чаты
              </button>
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className={`theme-fly__card${activeTheme === theme.id ? ' is-active' : ''}`}
                  onClick={() => onPickTheme(theme.id)}
                >
                  <span className="theme-fly__icon">{theme.icon}</span>
                  <span className="theme-fly__title">{theme.title}</span>
                  <em>{theme.chatIds.length}</em>
                </button>
              ))}
              <button type="button" className="theme-fly__card theme-fly__card--ghost" onClick={onThemesManage}>
                + новая тема
              </button>
            </div>
          )}
        </div>
      </nav>
    </>
  )

  return createPortal(menu, document.body)
}
