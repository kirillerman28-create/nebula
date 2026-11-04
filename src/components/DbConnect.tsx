/**
 * ПОДКЛЮЧЕНИЕ БАЗЫ — окно, где вводятся Project URL и anon key.
 * Значения сохраняются в localStorage, после чего страница перезагружается
 * и приложение подключается к новой базе.
 */
import { useState, type FormEvent } from 'react'
import { getDbConfig, resetDbConfig, saveDbConfig } from '../lib/dbConfig'

interface DbConnectProps {
  onClose: () => void
}

export default function DbConnect({ onClose }: DbConnectProps) {
  const current = getDbConfig()
  const [url, setUrl] = useState(current.custom ? current.url : '')
  const [anonKey, setAnonKey] = useState(current.custom ? current.anonKey : '')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanUrl = url.trim().replace(/\/+$/, '')
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cleanUrl)) {
      setError('Ссылка должна выглядеть так: https://xxxxx.supabase.co')
      return
    }
    if (anonKey.trim().length < 40) {
      setError('Похоже, anon key скопирован не полностью.')
      return
    }
    saveDbConfig(cleanUrl, anonKey)
    window.location.reload()
  }

  function handleReset() {
    resetDbConfig()
    window.location.reload()
  }

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Подключение базы данных">
      <div className="modal__backdrop" onClick={onClose} />
      <div className="glass-card modal__card">
        <header className="profile__head">
          <h2>Подключить базу</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </header>

        <p className="db-hint">
          Открой в Supabase: <strong>Project Settings → API</strong>. Скопируй <strong>Project URL</strong> и ключ{' '}
          <strong>anon public</strong>. Пароль от базы тут не нужен.
        </p>

        <form className="profile__form" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field__label">Project URL</span>
            <span className="field__control">
              <input
                type="url"
                placeholder="https://abcdefgh.supabase.co"
                value={url}
                onChange={(event) => {
                  setUrl(event.target.value)
                  setError(null)
                }}
                spellCheck={false}
                required
              />
            </span>
          </label>

          <label className="field">
            <span className="field__label">anon public key</span>
            <span className="field__control">
              <input
                type="text"
                placeholder="eyJhbGciOiJIUzI1NiIs..."
                value={anonKey}
                onChange={(event) => {
                  setAnonKey(event.target.value)
                  setError(null)
                }}
                spellCheck={false}
                required
              />
            </span>
          </label>

          {error && <div className="alert alert--error">{error}</div>}

          <button className="btn btn--primary btn--block" type="submit">
            Сохранить и подключиться
          </button>

          {current.custom && (
            <button type="button" className="link-btn" onClick={handleReset}>
              вернуть базу из config.ts
            </button>
          )}

          <p className="auth__hint">
            После сохранения выполни в Supabase файл <code>supabase/schema.sql</code> — он создаст таблицы и хранилище
            файлов.
          </p>
        </form>
      </div>
    </div>
  )
}
