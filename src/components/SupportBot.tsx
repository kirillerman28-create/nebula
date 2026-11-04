/**
 * КНОПКА ПОДДЕРЖКИ + мини-бот.
 *
 * Сначала пытается ответить из локальной базы (мгновенно, бесплатно).
 * Если не знает — спрашивает DeepSeek через Edge Function Supabase.
 */
import { useEffect, useRef, useState } from 'react'
import { answerLocally, askSupport, type SupportMessage } from '../lib/support'

const GREETING =
  'Привет! Я поддержка Nebula 🌌 Спроси про вход, код из письма, аватар, вложения или настройки — отвечу сразу.'

const QUICK_QUESTIONS = ['Не приходит код', 'Как сменить аватар', 'Как отправить видео', 'Ошибка базы']

export default function SupportBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<SupportMessage[]>([{ role: 'assistant', content: GREETING }])
  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = bodyRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages, open, thinking])

  async function send(text: string) {
    const question = text.trim()
    if (!question || thinking) return

    setDraft('')
    setError(null)
    const next: SupportMessage[] = [...messages, { role: 'user', content: question }]
    setMessages(next)

    // 1. локальная база — 0 токенов
    const local = answerLocally(question)
    if (local) {
      setMessages([...next, { role: 'assistant', content: local }])
      return
    }

    // 2. DeepSeek через функцию
    setThinking(true)
    try {
      const reply = await askSupport(next)
      setMessages([...next, { role: 'assistant', content: reply }])
    } catch {
      setError(
        'Умный ответ недоступен — не настроен ключ DeepSeek. Но я могу подсказать про вход, код, аватар, вложения и настройки: спроси иначе или выбери вопрос ниже.',
      )
    } finally {
      setThinking(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className={`support-fab${open ? ' is-open' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Закрыть поддержку' : 'Открыть поддержку'}
        title="Поддержка"
      >
        {open ? '✕' : '💬'}
      </button>

      {open && (
        <section className="support" aria-label="Поддержка Nebula">
          <header className="support__head">
            <span className="support__avatar">🛰</span>
            <div>
              <strong>Поддержка Nebula</strong>
              <em>обычно отвечает мгновенно</em>
            </div>
            <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Закрыть">
              ✕
            </button>
          </header>

          <div className="support__body" ref={bodyRef}>
            {messages.map((message, index) => (
              <div key={index} className={`support__msg${message.role === 'user' ? ' is-user' : ''}`}>
                {message.content}
              </div>
            ))}

            {thinking && <div className="support__msg support__msg--typing">печатает…</div>}
            {error && <div className="support__msg support__msg--error">{error}</div>}
          </div>

          {messages.length <= 1 && (
            <div className="support__quick">
              {QUICK_QUESTIONS.map((question) => (
                <button key={question} type="button" onClick={() => void send(question)}>
                  {question}
                </button>
              ))}
            </div>
          )}

          <form
            className="support__form"
            onSubmit={(event) => {
              event.preventDefault()
              void send(draft)
            }}
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Напиши вопрос…"
              aria-label="Вопрос в поддержку"
            />
            <button className="btn btn--primary support__send" type="submit" disabled={!draft.trim() || thinking}>
              ↑
            </button>
          </form>
        </section>
      )}
    </>
  )
}
