/**
 * КНОПКА «ВОЙТИ КАК СОЗДАТЕЛЬ» — это сама чёрная дыра.
 *
 * Идея из «Интерстеллара»: вращающийся светящийся аккреционный диск
 * вокруг чёрного горизонта событий. Надпись «СОЗДАТЕЛЬ» проявляется
 * при наведении курсора (или фокусе с клавиатуры).
 *
 * Слои (снизу вверх):
 *   glow    — мягкое свечение вокруг
 *   ring    — чёткое кольцо света (загнутый гравитацией диск)
 *   lobe    — «крылья» по бокам: там полоса вливается в кольцо
 *   sphere  — чёрная тень (горизонт событий)
 *   photon  — тонкое фотонное кольцо по краю тени
 *   stick   — диагональный диск-«палка», лежащий на колесе
 */
interface CreatorButtonProps {
  onClick: () => void
  disabled?: boolean
  busy?: boolean
}

export default function CreatorButton({ onClick, disabled = false, busy = false }: CreatorButtonProps) {
  return (
    <button
      type="button"
      className="bh-btn"
      onClick={onClick}
      disabled={disabled}
      aria-label="Войти как создатель"
      title="Войти как создатель"
    >
      <span className="bh-btn__hole" aria-hidden="true">
        <span className="bh-btn__glow" />
        <span className="bh-btn__ring" />
        <span className="bh-btn__lobe bh-btn__lobe--left" />
        <span className="bh-btn__lobe bh-btn__lobe--right" />
        <span className="bh-btn__sphere" />
        <span className="bh-btn__photon" />
        <span className="bh-btn__stick" />
      </span>
      <span className="bh-btn__label">{busy ? 'Открываем портал…' : 'Создатель'}</span>
    </button>
  )
}
