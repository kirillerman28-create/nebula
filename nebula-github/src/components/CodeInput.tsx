import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'

/**
 * Поле ввода кода из письма: отдельные клетки на каждую цифру.
 * Умеет: перескакивать на следующую клетку, стирать назад,
 * принимать код из буфера обмена (Ctrl+V) целиком.
 *
 * Длина настраивается: Supabase может присылать 6 или 8 цифр.
 */
interface CodeInputProps {
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
  /** Сколько цифр ждём (по умолчанию 8 — Supabase шлёт 8) */
  length?: number
}

export default function CodeInput({ value, onChange, onComplete, disabled, length = 8 }: CodeInputProps) {
  const inputs = useRef<Array<HTMLInputElement | null>>([])
  const digits = Array.from({ length }, (_, index) => value[index] ?? '')

  function commit(next: string) {
    const clean = next.replace(/\D/g, '').slice(0, length)
    onChange(clean)
    if (clean.length === length) onComplete?.(clean)
  }

  function handleChange(index: number, raw: string) {
    const typed = raw.replace(/\D/g, '')
    const next = digits.slice()

    if (!typed) {
      next[index] = ''
      commit(next.join(''))
      return
    }

    typed.split('').forEach((digit, offset) => {
      const target = index + offset
      if (target < length) next[target] = digit
    })
    commit(next.join(''))
    inputs.current[Math.min(index + typed.length, length - 1)]?.focus()
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace') {
      event.preventDefault()
      const next = digits.slice()
      if (next[index]) {
        next[index] = ''
      } else if (index > 0) {
        next[index - 1] = ''
        inputs.current[index - 1]?.focus()
      }
      commit(next.join(''))
      return
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      inputs.current[index - 1]?.focus()
    }
    if (event.key === 'ArrowRight' && index < length - 1) {
      event.preventDefault()
      inputs.current[index + 1]?.focus()
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pasted) return
    event.preventDefault()
    commit(pasted)
    inputs.current[Math.min(pasted.length, length - 1)]?.focus()
  }

  return (
    <div className="code-input" onPaste={handlePaste}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputs.current[index] = element
          }}
          className={`code-input__cell${digit ? ' is-filled' : ''}`}
          value={digit}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onFocus={(event) => event.currentTarget.select()}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          aria-label={`Цифра ${index + 1} из ${length}`}
        />
      ))}
    </div>
  )
}
