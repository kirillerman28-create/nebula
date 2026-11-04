/**
 * Космический фон. База — тёмный градиент с туманностями и звёздами.
 * Если выбран фон-картинка (в том числе свой), сверху ложится фото с затемнением.
 * Плюс интерактив: дым за мышкой и взрыв сверхновой по клику.
 */
import SpaceFX from './SpaceFX'
import { resolveBackground, useSettings } from '../lib/settings'

export default function SpaceBackground() {
  const { settings } = useSettings()
  const photo = resolveBackground(settings)

  return (
    <div className={`space${photo ? ' has-photo' : ''}`} aria-hidden="true">
      {photo ? (
        <div className="space__photo" style={{ backgroundImage: `url('${photo}')` }} />
      ) : (
        <>
          <div className="space__blob space__blob--violet" />
          <div className="space__blob space__blob--magenta" />
          <div className="space__blob space__blob--indigo" />
        </>
      )}

      <div className="space__stars space__stars--far" />
      <div className="space__stars space__stars--near" />
      <div className="space__vignette" />
      <SpaceFX />
    </div>
  )
}
