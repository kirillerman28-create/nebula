/**
 * НАСТРОЙКИ NEBULA — выезжают слева по клику на стрелку у края экрана.
 *
 * Вкладки: Профиль · Чаты · Контент · Фон
 * Всё, кроме профиля, хранится локально и применяется мгновенно.
 */
import { useMemo, useRef, useState, type ChangeEvent, type FormEvent, type PointerEvent } from 'react'
import Avatar from './Avatar'
import CreatorBadge from './CreatorBadge'
import { LogoutIcon } from './icons'
import { useAuth } from '../lib/auth'
import { uploadAvatar } from '../lib/api'
import { BACKGROUNDS, resolveProfileBackground, useSettings, type BackgroundId, type TextSize } from '../lib/settings'

const EMOJIS = ['👽', '🪐', '🌌', '🚀', '⭐', '🌙', '☄️', '🛸', '💜', '✨', '🔭', '🧑‍🚀']
const CROP_SIZE = 260
const EXPORT_SIZE = 512

type Tab = 'profile' | 'chats' | 'content' | 'background'

function sanitizeUsername(value: string): string {
  return value.replace(/^@+/, '').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20)
}

interface SettingsPanelProps {
  onClose: () => void
  /** Открыть сразу нужную вкладку */
  initialTab?: Tab
  /** Только кастомизация профиля (без остальных вкладок) */
  onlyProfile?: boolean
}

export default function SettingsPanel({ onClose, initialTab = 'profile', onlyProfile = false }: SettingsPanelProps) {
  const { me, demo, signOut, updateProfile } = useAuth()
  const { settings, update, reset } = useSettings()

  const [tab, setTab] = useState<Tab>(initialTab)
  const [name, setName] = useState(me?.displayName ?? '')
  const [username, setUsername] = useState(me?.username ?? '')
  const [emoji, setEmoji] = useState<string>(me?.avatarEmoji ?? '')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(me?.avatarUrl ?? null)

  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingBg, setUploadingBg] = useState(false)
  const [uploadingProfileBg, setUploadingProfileBg] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* --- кадрирование аватарки --- */
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [cropImage, setCropImage] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  const tabs = useMemo(
    () => [
      { id: 'profile' as Tab, label: 'Профиль' },
      { id: 'chats' as Tab, label: 'Чаты' },
      { id: 'content' as Tab, label: 'Контент' },
      { id: 'background' as Tab, label: 'Фон' },
    ],
    [],
  )

  if (!me) return null

  const previewName = name.trim() || me.displayName
  const previewUsername = sanitizeUsername(username) || me.username

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Нужна картинка: jpg, png или webp.')
      return
    }
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      setCropImage(image)
      setCropSrc(url)
      setZoom(1)
      setOffset({ x: 0, y: 0 })
      setError(null)
    }
    image.onerror = () => setError('Не получилось открыть картинку.')
    image.src = url
  }

  /** Свой фон: сжимаем картинку в canvas и храним как data URL. */
  async function handleCustomBackground(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Для фона нужна картинка: jpg, png или webp.')
      return
    }
    setUploadingBg(true)
    setError(null)
    try {
      const objectUrl = URL.createObjectURL(file)
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('bad image'))
        img.src = objectUrl
      })

      const maxSide = 1600
      const ratio = Math.min(1, maxSide / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(image.width * ratio)
      canvas.height = Math.round(image.height * ratio)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('canvas недоступен')
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(objectUrl)

      update({ customBackground: canvas.toDataURL('image/jpeg', 0.75), background: 'custom' })
    } catch {
      setError('Не получилось обработать картинку. Попробуй другую.')
    } finally {
      setUploadingBg(false)
    }
  }

  /** Своя обложка профиля — та же схема сжатия, что и для фона приложения. */
  async function handleProfileBackground(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Для обложки нужна картинка: jpg, png или webp.')
      return
    }
    setUploadingProfileBg(true)
    setError(null)
    try {
      const objectUrl = URL.createObjectURL(file)
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('bad image'))
        img.src = objectUrl
      })

      const maxSide = 1600
      const ratio = Math.min(1, maxSide / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(image.width * ratio)
      canvas.height = Math.round(image.height * ratio)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('canvas недоступен')
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(objectUrl)

      update({
        profileCustomBackground: canvas.toDataURL('image/jpeg', 0.78),
        profileBackground: 'custom',
      })
    } catch {
      setError('Не получилось обработать картинку. Попробуй другую.')
    } finally {
      setUploadingProfileBg(false)
    }
  }

  function baseScale(img: HTMLImageElement) {
    return Math.max(CROP_SIZE / img.width, CROP_SIZE / img.height)
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!cropImage) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y }
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag) return
    setOffset({ x: drag.ox + (event.clientX - drag.x), y: drag.oy + (event.clientY - drag.y) })
  }

  function onPointerUp() {
    dragRef.current = null
  }

  async function applyCrop() {
    if (!cropImage || !me) return
    setUploading(true)
    setError(null)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = EXPORT_SIZE
      canvas.height = EXPORT_SIZE
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Браузер не дал canvas.')

      const ratio = EXPORT_SIZE / CROP_SIZE
      const scale = baseScale(cropImage) * zoom * ratio
      const drawW = cropImage.width * scale
      const drawH = cropImage.height * scale

      ctx.drawImage(
        cropImage,
        EXPORT_SIZE / 2 - drawW / 2 + offset.x * ratio,
        EXPORT_SIZE / 2 - drawH / 2 + offset.y * ratio,
        drawW,
        drawH,
      )

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
      if (!blob) throw new Error('Не удалось подготовить картинку.')

      if (demo) {
        setAvatarUrl(URL.createObjectURL(blob))
      } else {
        const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
        setAvatarUrl(await uploadAvatar(file, me.id))
      }
      setEmoji('')
      setCropSrc(null)
      setCropImage(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить аватарку.')
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
      await updateProfile({ displayName: cleanName, username: cleanUser, avatarEmoji: emoji || null, avatarUrl })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить профиль.')
    } finally {
      setBusy(false)
    }
  }

  const scale = cropImage ? baseScale(cropImage) * zoom : 1

  return (
    <>
      <div className="drawer" role="dialog" aria-modal="true" aria-label="Настройки">
        <div className="drawer__backdrop" onClick={onClose} />
        <aside className="drawer__panel glass-panel">
          <header className="drawer__head">
            <h2>{onlyProfile ? 'Профиль' : 'Настройки'}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Закрыть">
              ✕
            </button>
          </header>

          {!onlyProfile && (
            <div className="settings-tabs" role="tablist">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  className={`settings-tab${tab === item.id ? ' is-active' : ''}`}
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          <div className="drawer__body">
            {tab === 'profile' && (
              <form className="profile__form" onSubmit={handleSave}>
                <div
                  className="profile__cover"
                  style={
                    resolveProfileBackground(settings)
                      ? {
                          backgroundImage: `linear-gradient(180deg, rgba(6,3,14,.15), rgba(6,3,14,.72)), url('${resolveProfileBackground(
                            settings,
                          )}')`,
                        }
                      : undefined
                  }
                >
                  <div className="profile__preview">
                    <Avatar name={previewName} isCreator={me.isCreator} size={58} emoji={emoji || null} url={avatarUrl} />
                    <div>
                      <div className="name-row">
                        <span className="name">{previewName}</span>
                        {me.isCreator && <CreatorBadge size="sm" />}
                    </div>
                      <span className="handle">@{previewUsername}</span>
                    </div>
                  </div>
                </div>

                <div className="field">
                  <span className="field__label">Фон профиля</span>
                  <div className="bg-strip">
                    <button
                      type="button"
                      className={`bg-strip__item${settings.profileBackground === null ? ' is-active' : ''}`}
                      onClick={() => update({ profileBackground: null })}
                      title="Без фона"
                    >
                      ✕
                    </button>
                    {settings.profileCustomBackground && (
                      <button
                        type="button"
                        className={`bg-strip__item${settings.profileBackground === 'custom' ? ' is-active' : ''}`}
                        style={{ backgroundImage: `url('${settings.profileCustomBackground}')` }}
                        onClick={() => update({ profileBackground: 'custom' })}
                        title="Свой фон профиля"
                      />
                    )}
                    {BACKGROUNDS.filter((item) => item.url).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`bg-strip__item${settings.profileBackground === item.id ? ' is-active' : ''}`}
                        style={{ backgroundImage: `url('${item.url}')` }}
                        onClick={() => update({ profileBackground: item.id })}
                        title={item.title}
                      />
                    ))}
                  </div>
                  <div className="avatar-upload">
                    <label className="btn btn--ghost avatar-upload__btn">
                      {uploadingProfileBg ? 'Готовим…' : 'Своя обложка'}
                      <input type="file" accept="image/*" onChange={handleProfileBackground} hidden />
                    </label>
                    {settings.profileCustomBackground && (
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => update({ profileCustomBackground: null, profileBackground: 'pink-dark' })}
                      >
                        убрать свою
                      </button>
                    )}
                  </div>
                </div>

                <label className="field">
                  <span className="field__label">Имя</span>
                  <span className="field__control">
                    <input value={name} maxLength={30} onChange={(e) => { setName(e.target.value); setError(null) }} />
                  </span>
                </label>

                <label className="field">
                  <span className="field__label">Юзернейм (латиница)</span>
                  <span className="field__control field__control--prefix">
                    <span className="field__prefix">@</span>
                    <input
                      value={username}
                      maxLength={20}
                      spellCheck={false}
                      onChange={(e) => { setUsername(sanitizeUsername(e.target.value)); setError(null) }}
                    />
                  </span>
                </label>

                <div className="field">
                  <span className="field__label">Аватар</span>
                  <div className="avatar-upload">
                    <label className="btn btn--ghost avatar-upload__btn">
                      {uploading ? 'Обрабатываем…' : 'Загрузить фото'}
                      <input type="file" accept="image/*" onChange={handleFile} hidden />
                    </label>
                    {avatarUrl && (
                      <button type="button" className="link-btn" onClick={() => { setAvatarUrl(null); setEmoji('') }}>
                        убрать
                      </button>
                    )}
                  </div>
                  <p className="settings-hint">Загрузишь — сможешь подвинуть и увеличить.</p>
                </div>

                <div className="field">
                  <span className="field__label">Или эмодзи</span>
                  <div className="emoji-row">
                    {EMOJIS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={emoji === item && !avatarUrl ? 'is-active' : ''}
                        onClick={() => { setEmoji(item); setAvatarUrl(null) }}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                {error && <div className="alert alert--error">{error}</div>}

                <button className="btn btn--primary btn--block" type="submit" disabled={busy || uploading}>
                  {busy ? 'Сохраняем…' : 'Сохранить'}
                </button>

                <button type="button" className="btn btn--ghost btn--block" onClick={() => void signOut()}>
                  <LogoutIcon size={15} /> Выйти
                </button>
              </form>
            )}

            {tab === 'chats' && (
              <div className="settings-block">
                <span className="field__label">Вид списка чатов</span>
                <div className="view-switch view-switch--wide">
                  <button
                    type="button"
                    className={`view-switch__btn${settings.chatView === 'list' ? ' is-active' : ''}`}
                    onClick={() => update({ chatView: 'list' })}
                  >
                    Список
                  </button>
                  <button
                    type="button"
                    className={`view-switch__btn${settings.chatView === 'grid' ? ' is-active' : ''}`}
                    onClick={() => update({ chatView: 'grid' })}
                  >
                    Квадраты
                  </button>
                </div>

                <button
                  type="button"
                  className={`settings-toggle${settings.compact ? ' is-on' : ''}`}
                  onClick={() => update({ compact: !settings.compact })}
                >
                  <span>
                    <strong>Компактные сообщения</strong>
                    <em>Меньше отступов — больше текста на экране</em>
                  </span>
                  <span className="settings-toggle__dot" />
                </button>

                <button
                  type="button"
                  className={`settings-toggle${settings.enterToSend ? ' is-on' : ''}`}
                  onClick={() => update({ enterToSend: !settings.enterToSend })}
                >
                  <span>
                    <strong>Enter отправляет</strong>
                    <em>Выключи — Enter будет переносить строку</em>
                  </span>
                  <span className="settings-toggle__dot" />
                </button>

                <button
                  type="button"
                  className={`settings-toggle${settings.showAvatars ? ' is-on' : ''}`}
                  onClick={() => update({ showAvatars: !settings.showAvatars })}
                >
                  <span>
                    <strong>Аватарки в чате</strong>
                    <em>Кружки рядом с сообщениями</em>
                  </span>
                  <span className="settings-toggle__dot" />
                </button>
              </div>
            )}

            {tab === 'content' && (
              <div className="settings-block">
                <span className="field__label">Размер текста</span>
                <div className="view-switch view-switch--wide">
                  {[
                    { id: 'sm' as TextSize, label: 'Мелкий' },
                    { id: 'md' as TextSize, label: 'Обычный' },
                    { id: 'lg' as TextSize, label: 'Крупный' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`view-switch__btn${settings.textSize === item.id ? ' is-active' : ''}`}
                      onClick={() => update({ textSize: item.id })}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className={`settings-toggle${settings.animations ? ' is-on' : ''}`}
                  onClick={() => update({ animations: !settings.animations })}
                >
                  <span>
                    <strong>Анимации и эффекты</strong>
                    <em>Дым за мышкой, сверхновые, вращение диска</em>
                  </span>
                  <span className="settings-toggle__dot" />
                </button>

                <p className="settings-hint">
                  Если компьютер слабый или экономишь батарею — выключи анимации, станет заметно легче.
                </p>
              </div>
            )}

            {tab === 'background' && (
              <div className="settings-block">
                <span className="field__label">Космос и планеты</span>
                <div className="bg-grid">
                  {BACKGROUNDS.filter((item) => item.group !== 'own').map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`bg-card${settings.background === item.id ? ' is-active' : ''}`}
                      onClick={() => update({ background: item.id as BackgroundId })}
                      title={item.title}
                    >
                      <span
                        className="bg-card__preview"
                        style={
                          item.url
                            ? { backgroundImage: `url('${item.url}')` }
                            : item.id === 'void'
                              ? { background: 'radial-gradient(circle at 50% 30%, #140b2b, #030208 70%)' }
                              : {
                                  background:
                                    'radial-gradient(circle at 30% 20%, rgba(124,58,237,.45), transparent 60%), radial-gradient(circle at 75% 70%, rgba(217,70,239,.35), transparent 60%), #0b0618',
                                }
                        }
                      />
                      <span className="bg-card__title">{item.title}</span>
                    </button>
                  ))}
                </div>

                <span className="field__label">Свой фон</span>
                <div className="avatar-upload">
                  <label className="btn btn--ghost avatar-upload__btn">
                    {uploadingBg ? 'Готовим…' : 'Загрузить фото'}
                    <input type="file" accept="image/*" onChange={handleCustomBackground} hidden />
                  </label>
                  {settings.customBackground && (
                    <button
                      type="button"
                      className={`bg-thumb${settings.background === 'custom' ? ' is-active' : ''}`}
                      style={{ backgroundImage: `url('${settings.customBackground}')` }}
                      onClick={() => update({ background: 'custom' })}
                      title="Использовать свой фон"
                    />
                  )}
                  {settings.customBackground && (
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => update({ customBackground: null, background: 'default' })}
                    >
                      убрать
                    </button>
                  )}
                </div>

                <span className="field__label">Прозрачность интерфейса</span>
                <div className="opacity-row">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={settings.uiOpacity}
                    onChange={(event) => update({ uiOpacity: Number(event.target.value) })}
                    aria-label="Прозрачность интерфейса"
                  />
                  <span className="opacity-row__value">{settings.uiOpacity}%</span>
                </div>
                <p className="settings-hint">
                  0% — стекло почти растворяется в туманности, 100% — плотные панели, текст читается лучше.
                </p>

                <p className="settings-hint">Выбор сохраняется и применяется сразу — на экране входа и в чатах.</p>
                <button type="button" className="link-btn" onClick={reset}>
                  сбросить все настройки
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>

      {cropSrc && cropImage && (
        <div className="cropper" role="dialog" aria-modal="true" aria-label="Кадрирование аватарки">
          <div className="cropper__backdrop" onClick={() => { setCropSrc(null); setCropImage(null) }} />
          <div className="glass-card cropper__card">
            <h3>Аватар</h3>
            <p className="settings-hint">Подвинь картинку мышкой и подбери масштаб.</p>

            <div
              className="cropper__stage"
              style={{ width: CROP_SIZE, height: CROP_SIZE }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <img
                src={cropSrc}
                alt=""
                draggable={false}
                style={{
                  width: cropImage.width * scale,
                  height: cropImage.height * scale,
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                }}
              />
              <span className="cropper__ring" />
            </div>

            <label className="cropper__zoom">
              Масштаб
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
            </label>

            {error && <div className="alert alert--error">{error}</div>}

            <div className="cropper__actions">
              <button type="button" className="btn btn--ghost" onClick={() => { setCropSrc(null); setCropImage(null) }}>
                Отмена
              </button>
              <button type="button" className="btn btn--primary" onClick={() => void applyCrop()} disabled={uploading}>
                {uploading ? 'Сохраняем…' : 'Применить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
