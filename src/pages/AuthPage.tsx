import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import CodeInput from '../components/CodeInput'
import CreatorBadge from '../components/CreatorBadge'
import SpaceBackground from '../components/SpaceBackground'
import { ArrowLeftIcon, LockIcon, MailIcon, OrbitIcon, SparkIcon } from '../components/icons'
import { SUPABASE_URL, STORAGE_PREFIX, isCreatorEmail } from '../lib/config'
import { useAuth } from '../lib/auth'

type Step = 'email' | 'code' | 'riddle' | 'register'
type Busy = 'send' | 'verify' | null

/** Шифр, который открывает двери создателю. */
const RIDDLE_ANSWER = '--ёwq'

const RIDDLE_TEXT = `Я — не дверь, но без меня не войти в туманность.
Я — не ключ, но меня набирают шёпотом.
Во мне — две черты, одна ёлка и две латинские буквы
из левого верхнего угла клавиатуры, но в обратном порядке.
Назови меня — и Nebula узнает своего создателя.`

/** Мини-тест «какой ты космический объект» — для экрана регистрации. */
const COSMIC_AVATARS = ['🪐', '🌌', '🚀', '👽', '⭐', '🛸']

export default function AuthPage() {
  const { requestCode, verifyCode, enterDemo, backend } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState<Busy>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const [riddle, setRiddle] = useState('')
  const [riddleWrong, setRiddleWrong] = useState(false)
  const [regName, setRegName] = useState('')
  const [regUser, setRegUser] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regAvatar, setRegAvatar] = useState(COSMIC_AVATARS[0])

  /* Таймер «отправить снова» — чтобы не долбить Supabase запросами. */
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  function fail(err: unknown) {
    setError(err instanceof Error ? err.message : 'Что-то пошло не так. Попробуй ещё раз.')
    setNotice(null)
  }

  async function sendCode() {
    setBusy('send')
    setError(null)
    setNotice(null)
    try {
      await requestCode(email)
      setStep('code')
      setCode('')
      setCooldown(60)
      setNotice(`Код отправлен на ${email.trim()}. Если письма нет — проверь «Спам».`)
    } catch (err) {
      fail(err)
    } finally {
      setBusy(null)
    }
  }

  function handleSubmitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    void sendCode()
  }

  async function submitCode(value: string) {
    if (value.length < 6 || busy) return
    setBusy('verify')
    setError(null)
    try {
      await verifyCode(email, value)
      if (isCreatorEmail(email)) {
        // создателя ждёт ещё одна проверка — загадка
        setRiddle('')
        setError(null)
        setNotice(null)
        setStep('riddle')
      } else {
        navigate('/chats', { replace: true })
      }
    } catch (err) {
      fail(err)
      setCode('')
    } finally {
      setBusy(null)
    }
  }

  function handleSubmitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submitCode(code)
  }

  function handleSubmitRiddle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const answer = riddle.trim().toLowerCase().replace(/\s+/g, '')
    if (answer === RIDDLE_ANSWER) {
      navigate('/chats', { replace: true })
      return
    }
    setError('Не то. Туманность не откроется без верного шифра.')
    setRiddleWrong(true)
    window.setTimeout(() => setRiddleWrong(false), 550)
  }

  function handleDemo() {
    enterDemo()
    navigate('/chats', { replace: true })
  }

  /** Кнопка «Регистрация» — сворачивается с анимацией и открывает анкету. */
  function startRegistration() {
    setError(null)
    setNotice(null)
    setStep('register')
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const cleanUser = regUser.trim().replace(/^@/, '').toLowerCase()
    if (!/^[a-z0-9_]{3,20}$/.test(cleanUser)) {
      setError('Юзернейм: 3–20 символов — латинские буквы, цифры и _.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(regEmail.trim())) {
      setError('Проверь адрес почты.')
      return
    }
    // юзернейм передадим в профиль после подтверждения кода
    localStorage.setItem(`${STORAGE_PREFIX}pending-username`, cleanUser)
    localStorage.setItem(`${STORAGE_PREFIX}pending-avatar`, regAvatar)
    localStorage.setItem(`${STORAGE_PREFIX}pending-name`, regName.trim() || cleanUser)
    setBusy('send')
    setError(null)
    try {
      await requestCode(regEmail)
      setEmail(regEmail)
      setStep('code')
      setCode('')
      setCooldown(60)
      setNotice(`Готово, @${cleanUser}! Код ушёл на ${regEmail.trim()}.`)
    } catch (err) {
      fail(err)
    } finally {
      setBusy(null)
    }
  }

  function backToEmail() {
    setStep('email')
    setCode('')
    setError(null)
    setNotice(null)
  }

  return (
    <div className="auth">
      <SpaceBackground />

      <section className="auth__hero">
        <div className="brand">
          <span className="brand__mark">
            <CreatorBadge size="md" withLabel={false} variant="violet" />
          </span>
          <span className="brand__name">Nebula</span>
        </div>

        <p className="auth__eyebrow">
          <OrbitIcon size={15} />
          мессенджер из глубокого космоса
        </p>

        <h1 className="auth__title">
          Общайся
          <span> сквозь пространство</span>
        </h1>

        <p className="auth__lead">
          Ни паролей, ни лишних шагов. Только почта и шесть цифр — дальше открывается туманность.
        </p>

        <ul className="auth__features">
          <li>
            <span className="feature__icon">
              <MailIcon size={16} />
            </span>
            Вход по коду на почту — пароль забыть невозможно
          </li>
          <li>
            <span className="feature__icon">
              <SparkIcon size={16} />
            </span>
            Живые сообщения через Supabase Realtime
          </li>
          <li>
            <span className="feature__icon">
              <LockIcon size={16} />
            </span>
            Данные защищены правилами RLS на уровне базы
          </li>
        </ul>

        <div className="auth__creator-preview">
          <CreatorBadge size="lg" />
          <span>так твоё имя выглядит в чатах</span>
        </div>
      </section>

      <section className="auth__panel">
        <div className="auth__glow" aria-hidden="true" />

        <div className="glass-card auth__card">
          <header className="auth__card-head">
            <h2>{step === 'email' ? 'Вход в Nebula' : step === 'code' ? 'Код из письма' : 'Загадка создателя'}</h2>
            <p>
              {step === 'email' && 'Введи почту — пришлём код. Пароль не нужен.'}
              {step === 'code' && (
                <>
                  Шесть цифр ушли на <strong>{email}</strong>
                </>
              )}
              {step === 'riddle' && 'Код верный. Но создателя узнают по шифру.'}
            </p>
          </header>

          {backend === 'offline' && (
            <div className="alert alert--warn">
              <strong>Supabase не отвечает</strong>
              <p>
                Адрес {SUPABASE_URL} не отвечает. Проект удалён, заморожен, или в адресе опечатка — проверь Project
                URL в дашборде Supabase.
              </p>
            </div>
          )}

          {error && <div className="alert alert--error">{error}</div>}
          {notice && <div className="alert alert--ok">{notice}</div>}

          {step === 'email' && (
            <form className="auth__form" onSubmit={handleSubmitEmail}>
              <label className="field">
                <span className="field__label">Почта</span>
                <span className="field__control">
                  <MailIcon size={17} className="field__icon" />
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={busy !== null}
                    required
                  />
                </span>
              </label>

              <button className="btn btn--primary btn--block" type="submit" disabled={busy !== null}>
                {busy === 'send' ? 'Отправляем код…' : 'Получить код'}
              </button>

              <button type="button" className="btn btn--ghost btn--block" onClick={startRegistration} disabled={busy !== null}>
                <span className="reg-icon">🚀</span>
                Регистрация
              </button>
            </form>
          )}

          {step === 'code' && (
            <form className="auth__form" onSubmit={handleSubmitCode}>
              <CodeInput
                value={code}
                onChange={setCode}
                onComplete={(value) => void submitCode(value)}
                disabled={busy !== null}
              />

              <button className="btn btn--primary btn--block" type="submit" disabled={busy !== null || code.length < 6}>
                {busy === 'verify' ? 'Проверяем…' : 'Войти в Nebula'}
              </button>

              <div className="auth__code-actions">
                <button type="button" className="link-btn" onClick={backToEmail} disabled={busy !== null}>
                  <ArrowLeftIcon size={14} /> другая почта
                </button>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => void sendCode()}
                  disabled={busy !== null || cooldown > 0}
                >
                  {cooldown > 0 ? `ещё раз через ${cooldown} с` : 'отправить снова'}
                </button>
              </div>
            </form>
          )}

          {step === 'riddle' && (
            <form className="auth__form" onSubmit={handleSubmitRiddle}>
              <div className={`riddle${riddleWrong ? ' is-wrong' : ''}`}>
                <span className="riddle__label">Загадка создателя</span>
                <p className="riddle__text">{RIDDLE_TEXT}</p>
              </div>

              <label className="field">
                <span className="field__label">Шифр</span>
                <span className="field__control">
                  <LockIcon size={17} className="field__icon" />
                  <input
                    type="text"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="введи шифр…"
                    value={riddle}
                    onChange={(event) => {
                      setRiddle(event.target.value)
                      setError(null)
                    }}
                    disabled={busy !== null}
                    autoFocus
                  />
                </span>
              </label>

              <button className="btn btn--primary btn--block" type="submit" disabled={!riddle.trim()}>
                Открыть туманность
              </button>
            </form>
          )}

          {step === 'register' && (
            <form className="auth__form reg" onSubmit={handleRegister}>
              <p className="reg__slogan">
                Начинайте своё путешествие по космосу<span className="reg__dot">!</span>
              </p>

              <label className="field">
                <span className="field__label">Юзернейм</span>
                <span className="field__control">
                  <span className="field__prefix field__prefix--static">@</span>
                  <input
                    type="text"
                    className="field__with-prefix"
                    autoComplete="username"
                    spellCheck={false}
                    placeholder="kirill"
                    value={regUser}
                    maxLength={20}
                    onChange={(event) => {
                      setRegUser(event.target.value.replace(/^@+/, '').replace(/[^a-zA-Z0-9_]/g, ''))
                      setError(null)
                    }}
                    disabled={busy !== null}
                    autoFocus
                  />
                </span>
              </label>

              <label className="field">
                <span className="field__label">Имя в чатах</span>
                <span className="field__control">
                  <input
                    type="text"
                    placeholder="Как тебя показывать?"
                    value={regName}
                    maxLength={30}
                    onChange={(event) => setRegName(event.target.value)}
                    disabled={busy !== null}
                  />
                </span>
              </label>

              <label className="field">
                <span className="field__label">Почта</span>
                <span className="field__control">
                  <MailIcon size={17} className="field__icon" />
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={regEmail}
                    onChange={(event) => {
                      setRegEmail(event.target.value)
                      setError(null)
                    }}
                    disabled={busy !== null}
                    required
                  />
                </span>
              </label>

              <div className="field">
                <span className="field__label">Аватар</span>
                <div className="emoji-row">
                  {COSMIC_AVATARS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={regAvatar === item ? 'is-active' : ''}
                      onClick={() => setRegAvatar(item)}
                      aria-label={`Аватар ${item}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <button className="btn btn--primary btn--block" type="submit" disabled={busy !== null}>
                {busy === 'send' ? 'Отправляем код…' : 'Начать путешествие'}
              </button>

              <button type="button" className="link-btn reg__back" onClick={backToEmail} disabled={busy !== null}>
                <ArrowLeftIcon size={14} /> у меня уже есть аккаунт
              </button>
            </form>
          )}

          {step !== 'riddle' && (
            <>
              <div className="auth__divider">
                <span>или</span>
              </div>

              <button className="btn btn--ghost btn--block" onClick={handleDemo} disabled={busy !== null}>
                <SparkIcon size={15} />
                Посмотреть демо без сервера
              </button>
            </>
          )}

          <p className="auth__hint">
            <LockIcon size={13} />
            Код живёт 60 минут. Пароли для обычных пользователей отключены.
          </p>
        </div>
      </section>
    </div>
  )
}
