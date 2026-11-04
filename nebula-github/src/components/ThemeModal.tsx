/**
 * ОКНО ТЕМ — создание, переименование и удаление папок для чатов.
 * Открывается из левого меню («Темы»).
 */
import { useState, type FormEvent } from 'react'
import { useThemes } from '../lib/themes'

const ICONS = ['🏷', '💼', '🎮', '📢', '💜', '⭐', '🔥', '🎵', '🎬', '📚', '🛸', '🌌']

interface ThemeModalProps {
  onClose: () => void
}

export default function ThemeModal({ onClose }: ThemeModalProps) {
  const { themes, createTheme, renameTheme, deleteTheme } = useThemes()
  const [title, setTitle] = useState('')
  const [icon, setIcon] = useState(ICONS[0])
  const [editing, setEditing] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) return
    createTheme(title, icon)
    setTitle('')
    setIcon(ICONS[0])
  }

  function startEdit(id: string, current: string) {
    setEditing(id)
    setEditTitle(current)
  }

  function saveEdit(id: string) {
    const theme = themes.find((item) => item.id === id)
    renameTheme(id, editTitle, theme?.icon ?? '🏷')
    setEditing(null)
  }

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Темы">
      <div className="modal__backdrop" onClick={onClose} />
      <div className="glass-card modal__card">
        <header className="profile__head">
          <h2>Темы</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </header>

        <p className="settings-hint">
          Тема — папка для чатов. Чтобы добавить чат в тему, нажми правой кнопкой по чату → «Темы».
        </p>

        <form className="profile__form" onSubmit={handleCreate}>
          <div className="field">
            <span className="field__label">Значок темы</span>
            <div className="emoji-row">
              {ICONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={icon === item ? 'is-active' : ''}
                  onClick={() => setIcon(item)}
                  aria-label={`Значок ${item}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <label className="field">
            <span className="field__label">Название темы</span>
            <span className="field__control">
              <input
                value={title}
                maxLength={24}
                placeholder="Игры, учёба, друзья…"
                onChange={(event) => setTitle(event.target.value)}
              />
            </span>
          </label>

          <button className="btn btn--primary btn--block" type="submit" disabled={!title.trim()}>
            Создать тему
          </button>
        </form>

        {themes.length > 0 && (
          <div className="theme-list">
            {themes.map((theme) => (
              <div key={theme.id} className="theme-row">
                <span className="theme-row__icon">{theme.icon}</span>

                {editing === theme.id ? (
                  <input
                    className="theme-row__input"
                    value={editTitle}
                    onChange={(event) => setEditTitle(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') saveEdit(theme.id)
                      if (event.key === 'Escape') setEditing(null)
                    }}
                    autoFocus
                  />
                ) : (
                  <span className="theme-row__title">
                    {theme.title}
                    <em>{theme.chatIds.length} чат(ов)</em>
                  </span>
                )}

                {editing === theme.id ? (
                  <button type="button" className="link-btn" onClick={() => saveEdit(theme.id)}>
                    готово
                  </button>
                ) : (
                  <button type="button" className="link-btn" onClick={() => startEdit(theme.id, theme.title)}>
                    изменить
                  </button>
                )}

                <button type="button" className="icon-btn theme-row__del" onClick={() => deleteTheme(theme.id)} aria-label="Удалить тему">
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
