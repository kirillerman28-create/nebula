/**
 * СОЗДАНИЕ ГРУППЫ — несколько человек, не личка.
 * Открывается из левого меню («Создать группу»).
 */
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { createGroupChat, listProfiles } from '../lib/api'
import { demoMembers } from '../lib/demoData'
import type { Chat, Profile } from '../types'

const ICONS = ['🪐', '🌌', '🚀', '👽', '⭐', '🛸', '💜', '✨', '🔭', '☄️', '🌙', '🧑‍🚀']

interface CreateChatProps {
  onClose: () => void
  onCreated: (chat: Chat) => void
}

export default function CreateChat({ onClose, onCreated }: CreateChatProps) {
  const { me, demo } = useAuth()
  const [icon, setIcon] = useState(ICONS[0])
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [people, setPeople] = useState<Profile[]>([])
  const [picked, setPicked] = useState<string[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    let alive = true
    if (demo) {
      setPeople(
        demoMembers
          .filter((person) => person.id !== me?.id)
          .map((person) => ({
            id: person.id,
            username: person.username,
            display_name: person.displayName,
            avatar_url: person.avatarUrl,
            avatar_emoji: person.avatarEmoji,
            is_creator: person.isCreator,
            created_at: new Date().toISOString(),
          })),
      )
      return
    }
    void listProfiles()
      .then((rows) => {
        if (alive) setPeople(rows.filter((row) => row.id !== me?.id))
      })
      .catch(() => {
        if (alive) setPeople([])
      })
    return () => {
      alive = false
    }
  }, [demo, me?.id])

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return people
    return people.filter(
      (person) =>
        person.display_name.toLowerCase().includes(needle) ||
        person.username.toLowerCase().includes(needle),
    )
  }, [people, search])

  function toggle(id: string) {
    setPicked((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!me) return
    const clean = title.trim()
    if (!clean) {
      setError('Впиши название группы.')
      return
    }
    if (picked.length === 0) {
      setError('Добавь хотя бы ещё одного человека — иначе это уже не группа.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (demo) {
        const local: Chat = {
          id: `demo-group-${Date.now()}`,
          title: `${icon} ${clean}`,
          is_group: true,
          created_at: new Date().toISOString(),
        }
        onCreated(local)
        onClose()
        return
      }
      const chat = await createGroupChat(`${icon} ${clean}`, me.id, picked)
      onCreated(chat)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать группу.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Создание группы">
      <div className="modal__backdrop" onClick={onClose} />
      <div className="glass-card modal__card create-card">
        <header className="profile__head">
          <h2>Создание группы</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </header>

        <p className="settings-hint">Группа — это несколько людей. Личные чаты сюда не входят.</p>

        <form className="profile__form" onSubmit={handleSubmit}>
          <div className="field">
            <span className="field__label">Значок</span>
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
            <span className="field__label">Название группы</span>
            <span className="field__control">
              <input
                value={title}
                maxLength={40}
                placeholder="Игры, учёба, команда…"
                onChange={(event) => {
                  setTitle(event.target.value)
                  setError(null)
                }}
                autoFocus
              />
            </span>
          </label>

          <label className="field">
            <span className="field__label">Участники</span>
            <span className="field__control">
              <input
                value={search}
                placeholder="Поиск по имени или @username"
                onChange={(event) => setSearch(event.target.value)}
              />
            </span>
          </label>

          <div className="member-pick" role="listbox" aria-label="Люди для группы">
            {visible.length === 0 && <p className="chat-list__hint">Пока никого нет — зарегистрируйся с другого аккаунта.</p>}
            {visible.map((person) => {
              const on = picked.includes(person.id)
              return (
                <button
                  key={person.id}
                  type="button"
                  role="option"
                  aria-selected={on}
                  className={`member-pick__row${on ? ' is-active' : ''}`}
                  onClick={() => toggle(person.id)}
                >
                  <span className="member-pick__mark">{on ? '✓' : '+'}</span>
                  <span className="member-pick__name">{person.display_name}</span>
                  <span className="member-pick__handle">@{person.username}</span>
                </button>
              )
            })}
          </div>

          {error && <div className="alert alert--error">{error}</div>}

          <button className="btn btn--primary btn--block" type="submit" disabled={busy}>
            {busy ? 'Собираем группу…' : `Создать группу${picked.length ? ` · ${picked.length + 1}` : ''}`}
          </button>
        </form>
      </div>
    </div>
  )
}
