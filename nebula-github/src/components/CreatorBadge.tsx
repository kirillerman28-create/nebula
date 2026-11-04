/**
 * БЕЙДЖ «СОЗДАТЕЛЬ» — миниатюрная чёрная дыра.
 *
 * Два варианта:
 *  • hole (по умолчанию) — та самая золотая чёрная дыра из «Интерстеллара»:
 *    кольцо света, боковые «крылья» и диагональная полоса. Это уменьшенная
 *    копия кнопки CreatorButton — те же слои, только сжатые через transform.
 *  • violet — исходная фиолетовая (для логотипа Nebula).
 */
interface CreatorBadgeProps {
  size?: 'sm' | 'md' | 'lg'
  withLabel?: boolean
  variant?: 'hole' | 'violet'
}

export default function CreatorBadge({ size = 'sm', withLabel = true, variant = 'hole' }: CreatorBadgeProps) {
  return (
    <span
      className={`creator-badge creator-badge--${size}${withLabel ? '' : ' creator-badge--icon'}${
        variant === 'violet' ? ' creator-badge--violet' : ''
      }`}
      title="Создатель Nebula"
    >
      {variant === 'violet' ? (
        <span className="blackhole" aria-hidden="true">
          <span className="blackhole__halo" />
          <span className="blackhole__ring" />
          <span className="blackhole__core" />
        </span>
      ) : (
        <span className="badge-hole" aria-hidden="true">
          <span className="bh-btn__hole">
            <span className="bh-btn__glow" />
            <span className="bh-btn__ring" />
            {/* полоса и «крылья» только у бейджа с подписью:
                без подписи они смещают центр и дыра выглядит «съехавшей» */}
            {withLabel && <span className="bh-btn__lobe bh-btn__lobe--left" />}
            {withLabel && <span className="bh-btn__lobe bh-btn__lobe--right" />}
            <span className="bh-btn__sphere" />
            <span className="bh-btn__photon" />
            {withLabel && <span className="bh-btn__stick" />}
          </span>
        </span>
      )}
      {withLabel && <span className="creator-badge__text">Создатель</span>}
      <span className="sr-only">Создатель Nebula</span>
    </span>
  )
}
