/**
 * КОСМИЧЕСКИЕ ЭФФЕКТЫ на canvas.
 *
 *  • Двигаешь мышкой — за курсором тянется цветной дымный след.
 *  • Кликаешь по фону — вспышка сверхновой: сноп искр + расширяющееся облако.
 *
 * Canvas лежит НАД фоном, но ПОД интерфейсом (внутри .space) и не ловит клики
 * (pointer-events: none) — кнопки и поля работают как обычно.
 */
import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  hue: number
  kind: 'smoke' | 'spark'
}

const MAX_PARTICLES = 340

export default function SpaceFX() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const particles: Particle[] = []
    let width = window.innerWidth
    let height = window.innerHeight

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const trim = () => {
      if (particles.length > MAX_PARTICLES) particles.splice(0, particles.length - MAX_PARTICLES)
    }

    const onMove = (event: PointerEvent) => {
      if (reduceMotion) return
      for (let i = 0; i < 2; i += 1) {
        particles.push({
          x: event.clientX + (Math.random() - 0.5) * 12,
          y: event.clientY + (Math.random() - 0.5) * 12,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4 - 0.15,
          life: 0,
          maxLife: 1100 + Math.random() * 900,
          size: 26 + Math.random() * 30,
          hue: 262 + Math.random() * 96,
          kind: 'smoke',
        })
      }
      trim()
    }

    const isInteractive = (target: EventTarget | null) => {
      const el = target as HTMLElement | null
      if (!el || typeof el.closest !== 'function') return false
      return Boolean(
        el.closest(
          'button, a, input, textarea, select, label, .glass-card, .glass-panel, .chat-item, .composer, .auth__card, .sidebar',
        ),
      )
    }

    const onDown = (event: PointerEvent) => {
      if (isInteractive(event.target)) return
      const x = event.clientX
      const y = event.clientY

      // белая вспышка в центре
      particles.push({
        x,
        y,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 620,
        size: 120,
        hue: 46,
        kind: 'smoke',
      })

      // сноп искр
      for (let i = 0; i < 64; i += 1) {
        const angle = Math.random() * Math.PI * 2
        const speed = 1.1 + Math.random() * 4.6
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 650 + Math.random() * 750,
          size: 3.5 + Math.random() * 6,
          hue: 18 + Math.random() * 70,
          kind: 'spark',
        })
      }

      // облако, которое расходится и тает
      for (let i = 0; i < 24; i += 1) {
        const angle = Math.random() * Math.PI * 2
        const speed = 0.2 + Math.random() * 0.95
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 1400 + Math.random() * 900,
          size: 26 + Math.random() * 36,
          hue: 248 + Math.random() * 84,
          kind: 'smoke',
        })
      }
      trim()
    }

    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })

    let raf = 0
    let last = performance.now()

    const frame = (now: number) => {
      const dt = Math.min(now - last, 48)
      last = now
      ctx.clearRect(0, 0, width, height)
      ctx.globalCompositeOperation = 'lighter'

      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i]
        p.life += dt
        if (p.life >= p.maxLife) {
          particles.splice(i, 1)
          continue
        }

        const t = p.life / p.maxLife
        p.x += p.vx * (dt / 16)
        p.y += p.vy * (dt / 16)
        p.vx *= 0.992
        p.vy *= 0.992

        const fade = 1 - t
        const radius = p.kind === 'smoke' ? p.size * (1 + t * 1.7) : Math.max(0.6, p.size * (1 - t * 0.75))
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius)

        if (p.kind === 'smoke') {
          const alpha = fade * 0.17
          gradient.addColorStop(0, `hsla(${p.hue}, 92%, 70%, ${alpha})`)
          gradient.addColorStop(0.45, `hsla(${p.hue + 22}, 86%, 56%, ${alpha * 0.5})`)
          gradient.addColorStop(1, 'hsla(0, 0%, 0%, 0)')
        } else {
          const alpha = fade * 0.95
          gradient.addColorStop(0, `hsla(${p.hue}, 100%, 84%, ${alpha})`)
          gradient.addColorStop(0.4, `hsla(${p.hue}, 100%, 62%, ${alpha * 0.55})`)
          gradient.addColorStop(1, 'hsla(0, 0%, 0%, 0)')
        }

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalCompositeOperation = 'source-over'
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [])

  return <canvas ref={canvasRef} className="fx-canvas" aria-hidden="true" />
}
