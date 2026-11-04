/**
 * ПАНЕЛЬ ПРОФИЛЯ — имя, @username (только латиница), аватар:
 * своя картинка или эмодзи. Сохраняет через useAuth.
 */
import { useState, type ChangeEvent, type FormEvent } from 'react'
import Avatar from './Avatar'
import CreatorBadge from './CreatorBadge'
import { LogoutIcon } from './icons'
import { useAuth } from '../lib/auth'
import { uploadAvatar } from '../lib/api'

const EMOJIS = ['👽', '🪐', '🌌', '🚀', '⭐', '🌙', '☄️', '🛸', '💜', '✨', '🔭', '🧑‍🚀']

/** Оставляем только латиницу, цифры и подчёркивание. */
function sanitizeUsername(value: string): string {
  return value.replace(/^@+/, '').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20)
}

interface ProfilePanelProps {
  onClose: () => void
}

export default function ProfilePanel({ onClose }: ProfilePanelProps) {
  const { me, demo, signOut, updateProfile } = useAuth()
  const [name, setName] = useState(me?.displayName ?? '')
  const [username, setUsername] = useState(me?.username ?? '')
  const [emoji, setEmoji] = useState<string>(me?.avatarEmoji ?? '')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(me?.avatarUrl ?? null)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!me) return null

  const previewName = name.trim() || me.displayName
  const previewUsername = sanitizeUsername(username) || me.username

  async function handleAvatarFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !me) return
    if (!file.type.startsWith('image/')) {
      setError('Для аватарки нужна картинка (jpg, png, webp).')
      return
    }
    setUploading(true)
    setError(null)
    try {
      if (demo) {
        // в демо-режиме файл живёт только до перезагрузки
        setAvatarUrl(URL.createObjectURL(file))
        setEmoji('')
      } else {
        const url = await uploadAvatar(file, me.id)
        setAvatarUrl(url)
        setEmoji('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить аватарку.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanName = name.trim()
    const cleanUser = sanitizeUsername(username).toLowerCase()
    if (!cleanName) {
      setError('Имя не может быть пустым.')
      return
    }
    if (!/^[a-z0-9_]{3,20}$/.test(cleanUser)) {
      setError('Юзернейм: 3–20 символов, только английские буквы, цифры и _.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await updateProfile({
        displayName: cleanName,
        username: cleanUser,
        avatarEmoji: emoji || null,
        avatarUrl,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить профиль.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Настройки профиля">
      <div className="modal__backdrop" onClick={onClose} />
      <div className="glass-card modal__card">
        <header className="profile__head">
          <h2>Профиль</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </header>

        <div className="profile__preview">
          <Avatar
            name={previewName}
            isCreator={me.isCreator}
            size={58}
            emoji={emoji || null}
            url={avatarUrl}
          />
          <div>
            <div className="name-row">
              <span className="name">{previewName}</span>
              {me.isCreator && <CreatorBadge size="sm" />}
            </div>
            <span className="handle">@{previewUsername}</span>
          </div>
        </div>

        <form className="profile__form" onSubmit={handleSave}>
          <label className="field">
            <span className="field__label">Имя</span>
            <span className="field__control">
              <input
                type="text"
                value={name}
                maxLength={30}
                onChange={(event) => {
                  setName(event.target.value)
                  setError(null)
                }}
              />
            </span>
          </label>

          <label className="field">
            <span className="field__label">Юзернейм (латиница)</span>
            <span className="field__control field__control--prefix">
              <span className="field__prefix">@</span>
              <input
                type="text"
                value={username}
                maxLength={20}
                spellCheck={false}
                autoComplete="username"
                onChange={(event) => {
                  setUsername(sanitizeUsername(event.target.value))
                  setError(null)
                }}
              />
            </span>
          </label>

          <div className="field">
            <span className="field__label">Своя аватарка</span>
            <div className="avatar-upload">
              <label className={`btn btn--ghost avatar-upload__btn${uploading ? ' is-busy' : ''}`}>
                {uploading ? 'Загружаем…' : 'Загрузить фото'}
                <input type="file" accept="image/*" onChange={(event) => void handleAvatarFile(event)} hidden />
              </label>
              {avatarUrl && (
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    setAvatarUrl(null)
                    setEmoji('')
                  }}
                >
                  убрать
                </button>
              )}
            </div>
          </div>

          <div className="field">
            <span className="field__label">Или эмодзи</span>
            <div className="emoji-row">
              {EMOJIS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={emoji === item && !avatarUrl ? 'is-active' : ''}
                  onClick={() => {
                    setEmoji(item)
                    setAvatarUrl(null)
                  }}
                  aria-label={`Аватар ${item}`}
                >
                  {item}
                </button>
              ))}
              <button
                type="button"
                className={`emoji-row__letter${emoji === '' && !avatarUrl ? ' is-active' : ''}`}
                onClick={() => {
                  setEmoji('')
                  setAvatarUrl(null)
                }}
                aria-label="Аватар — первая буква имени"
              >
                A
              </button>
            </div>
          </div>

          {error && <div className="alert alert--error">{error}</div>}

          <button className="btn btn--primary btn--block" type="submit" disabled={busy || uploading}>
            {busy ? 'Сохраняем…' : 'Сохранить'}
          </button>

          <button type="button" className="btn btn--ghost btn--block" onClick={() => void signOut()}>
            <LogoutIcon size={15} />
            Выйти
          </button>
        </form>
      </div>
    </div>
  )
}
