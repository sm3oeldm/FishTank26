import { useEffect, useRef } from 'react'

// Drifting star field + soft aurora blobs.
export default function Background() {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    let w, h, raf
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const stars = Array.from({ length: 170 }, () => ({
      x: Math.random(), y: Math.random(), z: Math.random() * 0.8 + 0.2,
      t: Math.random() * Math.PI * 2, hue: Math.random() < 0.15 ? 165 : Math.random() < 0.3 ? 190 : 220,
    }))
    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight
      canvas.width = w * dpr; canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)
    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      for (const s of stars) {
        s.t += 0.012 * s.z
        s.y -= 0.00006 * s.z
        if (s.y < -0.02) s.y = 1.02
        const x = s.x * w, y = s.y * h
        const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(s.t)) * s.z
        ctx.beginPath()
        ctx.fillStyle = `hsla(${s.hue}, 90%, 80%, ${a})`
        ctx.arc(x, y, s.z * 1.3, 0, Math.PI * 2)
        ctx.fill()
      }
      // faint constellation links
      ctx.lineWidth = 0.5
      for (let i = 0; i < stars.length; i += 3) {
        for (let j = i + 1; j < stars.length; j += 7) {
          const a = stars[i], b = stars[j]
          const dx = (a.x - b.x) * w, dy = (a.y - b.y) * h
          const d = Math.hypot(dx, dy)
          if (d < 110) {
            ctx.strokeStyle = `rgba(110, 231, 183, ${0.08 * (1 - d / 110)})`
            ctx.beginPath(); ctx.moveTo(a.x * w, a.y * h); ctx.lineTo(b.x * w, b.y * h); ctx.stroke()
          }
        }
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-40 -top-40 h-[640px] w-[640px] rounded-full bg-emerald-500/10 blur-[140px]" />
      <div className="absolute -right-40 top-1/3 h-[560px] w-[560px] rounded-full bg-violet-500/10 blur-[140px]" />
      <div className="absolute bottom-[-200px] left-1/3 h-[520px] w-[720px] rounded-full bg-cyan-500/10 blur-[150px]" />
      <canvas ref={ref} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(4,6,13,0.85)_100%)]" />
    </div>
  )
}
