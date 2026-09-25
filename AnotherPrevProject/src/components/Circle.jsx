import { motion, AnimatePresence } from 'motion/react'
import { Heart } from 'lucide-react'
import { PEOPLE } from '../data.js'
import { isOverdue, isEscalated } from '../logic.js'
import TaskIcon from './TaskIcon.jsx'

const W = 600, H = 470
const CENTER = { x: 300, y: 225 }
const POS = { aisha: { x: 105, y: 95 }, omar: { x: 495, y: 95 }, maricel: { x: 300, y: 385 } }
// calmer person colours for a white surface (visual only; data.js untouched)
const PCOLOR = { aisha: '#059669', omar: '#0891b2', maricel: '#7c3aed' }
const pc = (k) => PCOLOR[k] || PEOPLE[k]?.color || '#64748b'

function orbPositions(tasks) {
  const pos = {}
  const actions = tasks.filter((t) => t.kind === 'action')
  const open = actions.filter((t) => !t.owner)
  open.forEach((t, i) => {
    const a = -Math.PI / 2 + (i - (open.length - 1) / 2) * 0.8 // arc above Mariam
    pos[t.id] = { x: CENTER.x + Math.cos(a) * 100, y: CENTER.y + Math.sin(a) * 100 }
  })
  for (const k of Object.keys(POS)) {
    const mine = actions.filter((t) => t.owner === k)
    const base = Math.atan2(CENTER.y - POS[k].y, CENTER.x - POS[k].x) + Math.PI // point away from centre
    mine.forEach((t, i) => {
      const a = base + (i - (mine.length - 1) / 2) * 0.75
      pos[t.id] = { x: POS[k].x + Math.cos(a) * 62, y: POS[k].y + Math.sin(a) * 62 }
    })
  }
  return pos
}

export default function Circle({ tasks, clock, hearts }) {
  const actions = tasks.filter((t) => t.kind === 'action')
  const pos = orbPositions(tasks)
  const doneN = actions.filter((t) => t.status === 'done').length
  const frac = actions.length ? doneN / actions.length : 0
  const R = 46
  const circ = 2 * Math.PI * R

  return (
    <svg viewBox={`15 5 ${W - 30} ${H - 5}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      {/* orbit rings */}
      <circle cx={CENTER.x} cy={CENTER.y} r={100} fill="none" stroke="#e2e8f0" strokeDasharray="3 5" />
      <circle cx={CENTER.x} cy={CENTER.y} r={200} fill="none" stroke="#e2e8f0" strokeDasharray="3 6" />

      {/* bonds centre → caregivers */}
      {Object.entries(POS).map(([k, p]) => (
        <line key={k} x1={CENTER.x} y1={CENTER.y} x2={p.x} y2={p.y} stroke="#cbd5e1" strokeWidth={1.25} strokeDasharray={k === 'maricel' ? '4 5' : '0'} />
      ))}

      {/* owner → task tethers */}
      {actions.filter((t) => t.owner && pos[t.id]).map((t) => (
        <motion.line key={`teth-${t.id}`} x1={POS[t.owner].x} y1={POS[t.owner].y} animate={{ x2: pos[t.id].x, y2: pos[t.id].y }} transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          stroke={pc(t.owner)} strokeOpacity={0.45} strokeWidth={1.25} />
      ))}

      {/* escalation beams */}
      {actions.filter((t) => isEscalated(t, clock) && !t.owner).map((t) => (
        <g key={`beam-${t.id}`}>
          <line x1={pos[t.id].x} y1={pos[t.id].y} x2={POS.omar.x} y2={POS.omar.y} stroke="#dc2626" strokeWidth={1.5} strokeDasharray="5 4" className="flow-line" />
        </g>
      ))}

      {/* patient */}
      <g transform={`translate(${CENTER.x},${CENTER.y})`}>
        <circle r={R} fill="none" stroke="#e2e8f0" strokeWidth={4} />
        <motion.circle r={R} fill="none" stroke="#0d9488" strokeWidth={4} strokeLinecap="round" transform="rotate(-90)"
          strokeDasharray={circ} animate={{ strokeDashoffset: circ * (1 - frac) }} transition={{ duration: 0.6 }} />
        <circle r={36} fill="#ffffff" stroke="#f59e0b" strokeWidth={2} />
        <text textAnchor="middle" dy={3} fill="#1e293b" fontSize="22" fontWeight="600" style={{ fontFamily: 'var(--font-display)' }}>M</text>
        <text textAnchor="middle" dy={18} fill="#64748b" fontSize="9">{doneN}/{actions.length} done</text>
        <text textAnchor="middle" y={66} fill="#0f172a" fontSize="14" fontWeight="600">Mariam</text>
        <text textAnchor="middle" y={81} fill="#64748b" fontSize="11">Home after a heart stent</text>
      </g>

      {/* caregivers */}
      {Object.entries(POS).map(([k, p]) => {
        const P = PEOPLE[k]
        const col = pc(k)
        const mine = actions.filter((t) => t.owner === k)
        const alert = k === 'omar' && actions.some((t) => isEscalated(t, clock) && t.owner !== 'omar' && t.status !== 'done')
        return (
          <g key={k} transform={`translate(${p.x},${p.y})`}>
            {alert && <circle r={30} fill="none" stroke="#dc2626" strokeWidth={1.5} className="ring-pulse" />}
            <circle r={26} fill="#ffffff" stroke={col} strokeWidth={2} />
            <text textAnchor="middle" dy={6} fill={col} fontSize="18" fontWeight="600" style={{ fontFamily: 'var(--font-display)' }}>{P.initial}</text>
            <text textAnchor={k === 'maricel' ? 'start' : 'middle'} x={k === 'maricel' ? 38 : 0} y={k === 'maricel' ? -2 : 46} fill="#0f172a" fontSize="13" fontWeight="600">{P.name}</text>
            <text textAnchor={k === 'maricel' ? 'start' : 'middle'} x={k === 'maricel' ? 38 : 0} y={k === 'maricel' ? 13 : 60} fill="#64748b" fontSize="11">{P.role}{mine.length ? ` · ${mine.length} task${mine.length > 1 ? 's' : ''}` : ''}</text>
          </g>
        )
      })}

      {/* task orbs */}
      {actions.map((t) => {
        const p = pos[t.id]
        if (!p) return null
        const over = isOverdue(t, clock)
        const done = t.status === 'done'
        const color = done ? '#059669' : over ? '#dc2626' : t.owner ? pc(t.owner) : '#d97706'
        return (
          <motion.g key={t.id} initial={{ x: CENTER.x, y: CENTER.y, opacity: 0 }} animate={{ x: p.x, y: p.y, opacity: 1 }} transition={{ type: 'spring', stiffness: 120, damping: 20 }}>
            {over && !done && <circle r={17} fill="none" stroke="#dc2626" strokeWidth={1} className="ring-pulse" />}
            <circle r={15} fill="#ffffff" stroke={color} strokeWidth={1.5} />
            <foreignObject x={-8} y={-8} width={16} height={16}>
              <TaskIcon task={t} size={16} className="text-slate-700" />
            </foreignObject>
            {done && (
              <g transform="translate(11,-11)">
                <circle r={6.5} fill="#059669" />
                <path d="M -3 0 L -1 2.3 L 3 -2.3" stroke="#ffffff" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            )}
            {!t.owner && !done && (
              <text textAnchor="middle" y={-22} fill={over ? '#dc2626' : '#b45309'} fontSize="9.5" fontWeight="600">{over ? 'OVERDUE' : 'unclaimed'}</text>
            )}
          </motion.g>
        )
      })}

      {/* thank-you hearts: Mariam → owner */}
      <AnimatePresence>
        {hearts.map((h) => (
          <motion.g key={h.key} initial={{ x: CENTER.x, y: CENTER.y, opacity: 0, scale: 0.5 }}
            animate={{ x: POS[h.to].x, y: POS[h.to].y, opacity: [0, 1, 1, 0], scale: 1.2 }} exit={{ opacity: 0 }} transition={{ duration: 1.6 }}>
            <foreignObject x={-9} y={-9} width={18} height={18}>
              <Heart size={18} className="text-red-500 fill-red-500" />
            </foreignObject>
          </motion.g>
        ))}
      </AnimatePresence>
    </svg>
  )
}
