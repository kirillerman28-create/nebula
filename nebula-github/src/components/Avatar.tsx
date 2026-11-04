/**
 * Аватар: круглая «планета».
 * Порядок: загруженная картинка → эмодзи → первая буква имени → «@».
 * Так аватар никогда не остаётся пустым.
 */
interface AvatarProps {
  name: string
  isCreator?: boolean
  size?: number
  emoji?: string | null
  url?: string | null
}

export default function Avatar({ name, isCreator = false, size = 42, emoji = null, url = null }: AvatarProps) {
  const letter = (name.trim().charAt(0) || '@').toUpperCase()
  const hasEmoji = Boolean(emoji && emoji.trim())
  const content = hasEmoji ? (emoji as string) : letter
  const fontSize = hasEmoji ? Math.round(size * 0.5) : Math.round(size * 0.4)

  return (
    <span
      className={`avatar${isCreator ? ' avatar--creator' : ''}`}
      style={{ width: size, height: size, fontSize }}
      aria-hidden="true"
    >
      {url ? <img className="avatar__img" src={url} alt="" loading="lazy" /> : content}
    </span>
  )
}
