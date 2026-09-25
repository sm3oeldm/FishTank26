import { motion, AnimatePresence } from 'motion/react'
import { AlertTriangle, Phone, Clock, FileText, Heart, CheckCircle2, BellRing } from 'lucide-react'
import { PEOPLE } from '../data.js'
import { isOverdue, isEscalated } from '../logic.js'
import TaskIcon from './TaskIcon.jsx'

const WARM = { aisha: '#2f855a', omar: '#2b6cb0', maricel: '#6b46c1' }

function Row({ t, clock }) {
  const over = isOverdue(t, clock)
  const o = t.owner ? PEOPLE[t.owner] : null
  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
      className={`flex items-start gap-3 rounded-2xl border bg-white p-3 ${over ? 'border-red-200' : 'border-stone-200'}`}>
      <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${t.status === 'done' ? 'bg-emerald-50 text-emerald-700' : over ? 'bg-red-50 text-red-600' : 'bg-stone-100 text-stone-600'}`}>
        {t.status === 'done' ? <CheckCircle2 size={18} /> : <TaskIcon task={t} size={18} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`font-medium ${t.status === 'done' ? 'text-stone-500 line-through decoration-stone-300' : 'text-stone-900'}`}>{t.title}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          {o ? (
            <span className="flex items-center gap-1.5 font-medium" style={{ color: WARM[t.owner] }}>
              <span className="h-2 w-2 rounded-full" style={{ background: WARM[t.owner] }} />{t.status === 'done' ? `Done by ${o.name}` : `${o.name} is on it`}
            </span>
          ) : <span className={over ? 'font-medium text-red-700' : 'text-amber-700'}>{over ? 'Nobody has taken this, and it’s late' : 'Waiting for someone to take it'}</span>}
          {t.dueLabel && t.status !== 'done' && <span className={`flex items-center gap-1 ${over ? 'text-red-600' : 'text-stone-500'}`}><Clock size={12} />{over ? 'Overdue' : t.dueLabel}</span>}
          {t.note && t.status === 'done' && <span className="text-stone-500">· {t.note}</span>}
          {t.thanked && <span className="flex items-center gap-1 text-red-600"><Heart size={12} className="fill-red-500" /> Mama said thanks</span>}
          {t.needsHelp && t.status !== 'done' && <span className="text-amber-700">· asked for help</span>}
        </div>
        <div className="mt-1 flex items-center gap-1 truncate text-[11px] italic text-stone-400" title={t.quote}><FileText size={11} className="shrink-0" /> “{t.quote}”</div>
      </div>
    </motion.div>
  )
}

// "Mama's plan": a shared family checklist, grouped the way people think about it.
export default function PlanBoard({ tasks, clock }) {
  const actions = tasks.filter((t) => t.kind === 'action')
  const warning = tasks.find((t) => t.kind === 'warning')
  const info = tasks.filter((t) => t.kind === 'info')
  const needs = actions.filter((t) => !t.owner && t.status !== 'done')
  const doing = actions.filter((t) => t.owner && t.status !== 'done')
  const done = actions.filter((t) => t.status === 'done')
  const escalated = actions.find((t) => isEscalated(t, clock) && t.status !== 'done' && t.owner !== 'omar')

  const Group = ({ title, hint, items, tone }) => (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <div className={`text-sm font-semibold ${tone}`}>{title}</div>
        <div className="text-xs text-stone-400">{hint}</div>
      </div>
      <div className="space-y-2">
        <AnimatePresence initial={false}>{items.map((t) => <Row key={t.id} t={t} clock={clock} />)}</AnimatePresence>
        {!items.length && <div className="rounded-2xl border border-dashed border-stone-200 px-3 py-2.5 text-sm text-stone-400">Nothing here</div>}
      </div>
    </div>
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <div className="serif text-xl font-semibold text-stone-900">Mama’s plan</div>
          <div className="text-sm text-stone-500">From her discharge letter, approved by Nurse Fatima</div>
        </div>
      </div>

      {warning && (
        <div className="mb-3 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600" />
          <div className="flex-1"><b>Call for help if:</b> {warning.title.toLowerCase()}</div>
          <span className="flex shrink-0 items-center gap-1 font-semibold"><Phone size={14} /> {warning.contact}</span>
        </div>
      )}

      <AnimatePresence>
        {escalated && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="mb-3 flex items-center gap-3 overflow-hidden rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            <BellRing size={18} className="shrink-0 text-blue-700" />
            <div>“{escalated.title}” was missed for a day, so Carely asked <b>Omar</b>, the backup, to step in.</div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="scroll-thin min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        <Group title="Needs someone" hint={needs.length ? `${needs.length} open` : ''} items={needs} tone={needs.some((t) => isOverdue(t, clock)) ? 'text-red-700' : 'text-amber-700'} />
        <Group title="In progress" hint="" items={doing} tone="text-stone-800" />
        <Group title="Done" hint={done.length ? '❤ thank the family from Mama’s phone' : ''} items={done} tone="text-emerald-700" />
        {info.length > 0 && (
          <div className="rounded-2xl bg-stone-100 px-3 py-2 text-xs text-stone-600">Good to know: {info.map((i) => i.title).join(' · ')}</div>
        )}
      </div>
    </div>
  )
}
