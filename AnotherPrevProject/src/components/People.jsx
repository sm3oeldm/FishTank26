import { motion, AnimatePresence } from 'motion/react'
import { Heart, BellRing } from 'lucide-react'
import { PEOPLE } from '../data.js'
import { isEscalated } from '../logic.js'

const WARM = { mariam: '#b7791f', aisha: '#2f855a', omar: '#2b6cb0', maricel: '#6b46c1' }

function Avatar({ k, size = 40 }) {
  return (
    <div className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white" style={{ width: size, height: size, background: WARM[k], fontSize: size * 0.4 }}>
      {PEOPLE[k].name[0]}
    </div>
  )
}

// "Who's helping": one friendly card per person, saying what they're doing right now.
export default function People({ tasks, clock, active, onPick }) {
  const actions = tasks.filter((t) => t.kind === 'action')
  const doneN = actions.filter((t) => t.status === 'done').length
  const status = (k) => {
    const mine = actions.filter((t) => t.owner === k)
    const open = mine.filter((t) => t.status !== 'done')
    const finished = mine.filter((t) => t.status === 'done')
    if (k === 'omar' && actions.some((t) => isEscalated(t, clock) && !t.owner)) return { text: 'Asked to step in: the pharmacy pickup is late', alert: true }
    if (open.length) return { text: `Doing: ${open.map((t) => t.title.toLowerCase()).join(', ')}` }
    if (finished.length) return { text: `Finished ${finished.length} task${finished.length > 1 ? 's' : ''}`, thanked: finished.some((t) => t.thanked) }
    return { text: 'Hasn’t picked anything yet' }
  }
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3">
        <div className="serif text-xl font-semibold text-stone-900">Who’s helping</div>
        <div className="text-sm text-stone-500">Tap a person to see their phone</div>
      </div>

      <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center gap-3">
          <Avatar k="mariam" size={46} />
          <div className="min-w-0">
            <div className="font-semibold text-stone-900">Mariam, 68</div>
            <div className="text-xs text-stone-600">Home after a heart stent</div>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-amber-100">
          <motion.div className="h-full rounded-full bg-emerald-600" animate={{ width: `${actions.length ? (doneN / actions.length) * 100 : 0}%` }} transition={{ duration: 0.5 }} />
        </div>
        <div className="mt-1.5 text-xs text-stone-600">{doneN} of {actions.length} things done for Mama</div>
      </div>

      <div className="scroll-thin min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {['aisha', 'omar', 'maricel'].map((k) => {
          const s = status(k)
          const on = active === k
          return (
            <motion.button key={k} layout onClick={() => onPick(k)}
              className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-colors ${on ? 'border-stone-400 bg-white shadow-sm' : 'border-stone-200 bg-white/70 hover:bg-white'} ${s.alert ? 'ring-2 ring-red-300' : ''}`}>
              <Avatar k={k} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-stone-900">{PEOPLE[k].name}</span>
                  {s.alert && <BellRing size={14} className="text-red-600" />}
                  {s.thanked && <Heart size={13} className="fill-red-500 text-red-500" />}
                </div>
                <div className="text-xs text-stone-500">{PEOPLE[k].role}{k === 'maricel' ? ' · sees only her tasks' : ''}</div>
                <AnimatePresence mode="wait">
                  <motion.div key={s.text} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className={`mt-1 text-[13px] leading-snug ${s.alert ? 'font-medium text-red-700' : 'text-stone-700'}`}>{s.text}</motion.div>
                </AnimatePresence>
              </div>
            </motion.button>
          )
        })}
        <button onClick={() => onPick('mama')}
          className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left ${active === 'mama' ? 'border-stone-400 bg-white shadow-sm' : 'border-stone-200 bg-white/70 hover:bg-white'}`}>
          <Avatar k="mariam" />
          <div>
            <div className="font-semibold text-stone-900">Mama’s own phone</div>
            <div className="text-xs text-stone-500">Big text · sees who is doing what</div>
          </div>
        </button>
      </div>
    </div>
  )
}
