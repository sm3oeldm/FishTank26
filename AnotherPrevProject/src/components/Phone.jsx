import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Check, HandHelping, Heart, Signal, Wifi, BatteryFull, Lock, AlertTriangle, Phone as PhoneIcon, Clock, FileText, HelpCircle } from 'lucide-react'
import { PEOPLE, T, fmtClock } from '../data.js'
import { isOverdue } from '../logic.js'
import TaskIcon from './TaskIcon.jsx'

export function PhoneFrame({ children, buzz, label, color }) {
  return (
    <div className="flex flex-col items-center gap-2" data-color={color}>
      <div className={`relative h-[476px] w-[232px] rounded-[40px] border-[6px] border-[#111827] bg-[#111827] shadow-md ${buzz ? 'buzz' : ''}`}>
        <div className="absolute left-1/2 top-1.5 z-30 h-[18px] w-[76px] -translate-x-1/2 rounded-full bg-[#111827]" />
        <div className="relative h-full w-full overflow-hidden rounded-[34px] bg-[#f8fafc]">{children}</div>
      </div>
      <div className="text-xs font-medium text-slate-600">{label}</div>
    </div>
  )
}

function StatusBar({ clock }) {
  return (
    <div className="flex items-center justify-between bg-white px-5 pb-1 pt-2.5 text-[10.5px] font-semibold text-slate-900">
      <span>{fmtClock(clock).time}</span>
      <span className="flex items-center gap-1"><Signal size={11} /><Wifi size={11} /><BatteryFull size={13} /></span>
    </div>
  )
}

function useBuzz(keys) {
  const [buzz, setBuzz] = useState(false)
  const prev = useRef(new Set(keys))
  useEffect(() => {
    const fresh = keys.filter((k) => !prev.current.has(k))
    prev.current = new Set(keys)
    if (fresh.length) {
      setBuzz(true)
      const t = setTimeout(() => setBuzz(false), 1600)
      return () => clearTimeout(t)
    }
  }, [keys.join('|')]) // eslint-disable-line react-hooks/exhaustive-deps
  return buzz
}

// ── Caregiver / helper phone ───────────────────────────────
export function CaregiverPhone({ who, tasks, clock, notifs, onClaim, onDone, onHelp, helper = false }) {
  const P = PEOPLE[who]
  const visible = tasks.filter((x) => x.kind === 'action' && (!helper || x.helperOk))
  const warning = tasks.find((x) => x.kind === 'warning')
  const mine = visible.filter((x) => x.owner === who && x.status !== 'done')
  const open = visible.filter((x) => !x.owner && x.status !== 'done')
  const others = visible.filter((x) => x.owner && x.owner !== who && x.status !== 'done')
  const done = visible.filter((x) => x.status === 'done')
  const my = notifs.filter((n) => n.to.includes(who) && tasks.find((x) => x.id === n.task)?.owner !== who)
  const latest = my[my.length - 1]
  const buzz = useBuzz(my.map((n) => n.key))

  const bannerCls = latest?.level === 'escalation'
    ? 'border-red-200 bg-red-50 text-red-800'
    : latest?.level === 'overdue'
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-slate-200 bg-white text-slate-800'

  return (
    <PhoneFrame buzz={buzz} label={`${P.name} · ${P.role}`} color={P.color}>
      <div className="flex h-full flex-col bg-[#f8fafc]">
        <StatusBar clock={clock} />
        <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 pb-2 pt-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white" style={{ background: P.color }}>{P.initial}</div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold text-teal-700">Carely</div>
            <div className="truncate text-[13px] font-semibold leading-tight text-slate-900">{T.plan}</div>
            <div className="truncate text-[10px] text-slate-500">{P.name}{helper ? ' · limited view' : ''}</div>
          </div>
        </div>

        <AnimatePresence>
          {latest && (
            <motion.div key={latest.key} initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              className={`mx-3 mt-2 rounded-2xl border p-2.5 text-[11px] leading-snug shadow-md ${bannerCls}`}>
              <div className="mb-0.5 text-[9.5px] font-bold text-slate-500">CARELY · now</div>
              <span>{latest.en}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {warning && (
          <div className="mx-3 mt-2 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-[10.5px] text-red-800">
            <div className="flex items-start gap-1.5">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              <span><b>{T.warn}:</b> {warning.title}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1 font-semibold"><PhoneIcon size={11} /> {warning.contact}</div>
          </div>
        )}

        <div className="scroll-thin mt-2 min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-3">
          <Section title={T.mine}>
            {mine.map((x) => (
              <Card key={x.id} x={x} clock={clock} accent={P.color}>
                <div className="mt-2 flex gap-1.5">
                  <Btn onClick={() => onDone(x.id, who)} cls="bg-teal-700 text-white hover:bg-teal-800"><Check size={12} /> {T.markDone}</Btn>
                  <Btn onClick={() => onHelp(x.id, who)} cls="border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"><HandHelping size={12} /> {T.help}</Btn>
                </div>
              </Card>
            ))}
            {!mine.length && <Empty>{T.empty}</Empty>}
          </Section>
          {open.length > 0 && (
            <Section title={T.open} warn>
              {open.map((x) => (
                <Card key={x.id} x={x} clock={clock} accent="#d97706">
                  <Btn onClick={() => onClaim(x.id, who)} cls="mt-2 w-full bg-teal-700 text-white hover:bg-teal-800">{T.claim}</Btn>
                </Card>
              ))}
            </Section>
          )}
          {others.length > 0 && (
            <Section title={T.others}>
              {others.map((x) => <Card key={x.id} x={x} clock={clock} accent={PEOPLE[x.owner].color} owner={x.owner} dim />)}
            </Section>
          )}
          {done.length > 0 && (
            <Section title={T.done}>
              {done.map((x) => (
                <div key={x.id} className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] text-emerald-800">
                  <TaskIcon task={x} size={13} className="shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{x.title}</span>
                  {x.thanked && <Heart size={12} className="shrink-0 fill-red-500 text-red-500" />}
                  <Check size={13} className="shrink-0" />
                </div>
              ))}
            </Section>
          )}
          {helper && <div className="flex items-center gap-1.5 px-1 text-[10px] text-slate-500"><Lock size={10} /> Medicines & appointments are shared with family only</div>}
        </div>
      </div>
    </PhoneFrame>
  )
}

function Section({ title, children, warn }) {
  return (
    <div>
      <div className={`mb-1 px-1 text-[11px] font-medium ${warn ? 'text-amber-700' : 'text-slate-500'}`}>{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}
const Empty = ({ children }) => <div className="rounded-xl border border-dashed border-slate-300 bg-white px-2.5 py-2 text-[10.5px] text-slate-500">{children}</div>
const Btn = ({ children, onClick, cls }) => <button onClick={onClick} className={`flex items-center justify-center gap-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors ${cls}`}>{children}</button>

function Card({ x, clock, accent, owner, dim, children }) {
  const over = isOverdue(x, clock)
  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: dim ? 0.7 : 1 }} transition={{ duration: 0.2 }}
      className={`rounded-xl border bg-white p-2.5 ${over ? 'border-red-200' : 'border-slate-200'}`} style={{ boxShadow: `inset 3px 0 0 ${over ? '#dc2626' : accent}` }}>
      <div className="flex items-start gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
          <TaskIcon task={x} size={13} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold leading-tight text-slate-900">{x.title}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px]">
            {x.dueLabel && (over
              ? <span className="flex items-center gap-0.5 font-semibold text-red-600"><Clock size={10} /> {T.overdue}</span>
              : <span className="text-slate-500">{T.due}: {x.dueLabel}</span>)}
            {owner && <span className="text-slate-500">· {T.owner} {PEOPLE[owner].name}</span>}
            {x.needsHelp && <span className="flex items-center gap-0.5 text-amber-700">· <HelpCircle size={10} /> needs help</span>}
          </div>
          <div className="mt-1 flex items-center gap-1 truncate text-[9.5px] italic text-slate-400" title={x.quote}>
            <FileText size={9} className="shrink-0" /><span className="truncate">“{x.quote}”</span>
          </div>
        </div>
      </div>
      {children}
    </motion.div>
  )
}

// ── Mama's phone: big text, who's doing what, say thank you ──
export function MamaPhone({ tasks, clock, onThank }) {
  const actions = tasks.filter((x) => x.kind === 'action')
  const doneN = actions.filter((x) => x.status === 'done').length
  const openN = actions.filter((x) => !x.owner && x.status !== 'done').length
  const warning = tasks.find((x) => x.kind === 'warning')
  return (
    <PhoneFrame label="Mama · big-text view" color={PEOPLE.mariam.color}>
      <div className="flex h-full flex-col bg-[#f8fafc]">
        <StatusBar clock={clock} />
        <div className="border-b border-slate-200 bg-white px-4 pb-2.5 pt-1">
          <div className="text-[10px] font-semibold text-teal-700">Carely</div>
          <div className="text-[20px] font-semibold text-slate-900">Hello Mama</div>
          <div className="text-[13px] text-slate-600">{openN ? 'Some tasks still need someone' : 'Your family has everything covered'}</div>
        </div>
        <div className="mx-3 mt-2 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
          <span className="text-[13px] text-slate-600">Done today</span>
          <span className="text-[22px] font-semibold text-slate-900">{doneN} / {actions.length}</span>
        </div>
        <div className="scroll-thin mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 pb-2">
          {actions.map((x) => {
            const o = x.owner ? PEOPLE[x.owner] : null
            const over = isOverdue(x, clock)
            const statusCls = x.status === 'done' ? 'text-emerald-700' : over && !o ? 'text-red-700' : o ? 'text-slate-700' : 'text-slate-500'
            return (
              <div key={x.id} className={`rounded-xl border bg-white px-3 py-2 ${over && x.status !== 'done' ? 'border-red-200' : 'border-slate-200'}`}>
                <div className="flex items-center gap-2">
                  <TaskIcon task={x} size={18} className="shrink-0 text-slate-500" />
                  <span className="flex-1 text-[14px] font-semibold leading-tight text-slate-900">{x.title}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[12px]">
                  <span className={`font-medium ${statusCls}`}>
                    {x.status === 'done' ? `Done by ${o?.name}` : o ? `${o.name} is on it` : over ? 'Late: nobody yet' : 'Nobody yet'}
                  </span>
                  {x.status === 'done' && (
                    <button onClick={() => onThank(x.id)} disabled={x.thanked}
                      className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[12px] font-medium ${x.thanked ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'}`}>
                      <Heart size={11} className={x.thanked ? 'fill-red-400 text-red-400' : 'text-red-600'} />
                      {x.thanked ? 'Sent' : 'Thank you'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {warning && (
          <div className="m-3 mt-1 rounded-xl bg-red-600 px-3 py-2 text-center text-white">
            <div className="text-[13px] font-semibold">Chest pain or bleeding that won’t stop?</div>
            <div className="flex items-center justify-center gap-1.5 text-[18px] font-bold"><PhoneIcon size={16} /> 998</div>
          </div>
        )}
      </div>
    </PhoneFrame>
  )
}
