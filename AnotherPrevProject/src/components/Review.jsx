import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ShieldCheck, ShieldX, Sparkles, CalendarCheck, AlertTriangle, CheckCircle2, Lock, Send, Bug, Paperclip, FileUp, Loader2, FileText, RefreshCw, Check, Trash2 } from 'lucide-react'
import { PEOPLE, CIRCLE } from '../data.js'
import TaskIcon from './TaskIcon.jsx'

const KIND_COLOR = { action: '#047857', warning: '#b45309', info: '#64748b' }
const KIND_BG = { action: '#ecfdf5', warning: '#fffbeb', info: '#f1f5f9' }

function UploadCard({ loading, error, onPick, onFile, onSample }) {
  const [over, setOver] = useState(false)
  return (
    <div onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f) }}
      className={`flex h-full flex-col items-center justify-center rounded-xl border border-dashed p-10 text-center transition-colors ${over ? 'border-teal-500 bg-teal-50/60' : 'border-slate-300 bg-white'}`}>
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-teal-50 ring-1 ring-teal-100">
        {loading ? <Loader2 size={26} className="animate-spin text-teal-700" /> : <FileUp size={26} className="text-teal-700" />}
      </div>
      <div className="mt-4 text-lg font-semibold text-slate-900">{loading ? 'Reading document…' : 'Attach the discharge document'}</div>
      <div className="mt-1 text-sm text-slate-500">PDF or text file · drag it here or browse</div>
      <button onClick={onPick} disabled={loading}
        className="mt-5 flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-500">
        <Paperclip size={16} /> Browse files
      </button>
      {error && <div className="mt-4 max-w-sm rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="mt-5 max-w-xs text-xs text-slate-500">Upload the patient’s discharge letter to start. You can remove it at any time to start with another patient.</div>
    </div>
  )
}

function Paper({ doc, phase, litCount, drafts, hover, onPick, onRemove }) {
  const done = phase === 'done'
  const items = doc.blocks.filter((b) => b.type === 'item')
  const lit = new Set(items.slice(0, litCount).map((b) => b.id))
  return (
    <div className="paper relative h-full overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm">
      {phase === 'scanning' && <div className="scanline pointer-events-none absolute inset-x-0 z-10 h-10 bg-teal-500/15" />}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-2 text-xs text-slate-600">
        <span className="flex items-center gap-2 truncate"><FileText size={14} className="shrink-0 text-slate-500" /><b className="truncate font-medium text-slate-700">{doc.name}</b> · {doc.pages.length} page{doc.pages.length > 1 ? 's' : ''}</span>
        <span className="flex items-center gap-1">
          <button onClick={onPick} className="flex items-center gap-1 rounded-md px-2 py-0.5 text-slate-600 hover:bg-slate-200"><RefreshCw size={12} /> Replace</button>
          <button onClick={onRemove} className="flex items-center gap-1 rounded-md px-2 py-0.5 text-red-600 hover:bg-red-50"><Trash2 size={12} /> Remove</button>
        </span>
      </div>
      <div className="scroll-thin h-[calc(100%-33px)] overflow-y-auto px-8 py-5">
        {doc.pages.map((p) => (
          <div key={p.page} className="mb-5">
            <div className="mb-2 text-xs font-medium text-slate-500">Page {p.page}</div>
            {p.blocks.map((b) => {
              if (b.type === 'heading') return <div key={b.id} className="serif mt-2 text-lg font-semibold text-slate-900">{b.text}</div>
              if (b.type === 'meta') return <div key={b.id} className="text-[12.5px] text-slate-600">{b.text}</div>
              if (b.type === 'note') return (
                <div key={b.id} className="mt-3 text-[11px] italic text-slate-500">
                  <span data-sid={b.id} className="rounded-sm px-1">{b.text}</span>
                </div>
              )
              const d = drafts.find((x) => x.sid === b.id && x.valid)
              const on = lit.has(b.id) || done
              const kind = d ? d.kind : 'info'
              const color = KIND_COLOR[kind]
              return (
                <div key={b.id} className="serif my-2 flex gap-2 text-[15.5px] leading-snug">
                  <span className="text-slate-400">•</span>
                  <span data-sid={b.id} className={`rounded-sm px-1 transition-colors duration-200 ${hover && hover === d?.id ? 'ring-1 ring-offset-1' : ''}`}
                    style={{ background: on ? KIND_BG[kind] : 'transparent', boxShadow: on ? `inset 0 -2px 0 ${color}` : 'none', '--tw-ring-color': color }}>{b.text}</span>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Review({ doc, loading, error, onPick, onFile, onSample, onRemove, extractedBy, aiOn, phase, scanIdx, drafts, confirmed, consent, onExtract, onConfirm, onConsent, onPublish }) {
  const wrap = useRef(null)
  const [lines, setLines] = useState([])
  const [hover, setHover] = useState(null)
  const done = phase === 'done'

  const measure = useCallback(() => {
    const root = wrap.current
    if (!root || !done) return setLines([])
    const R = root.getBoundingClientRect()
    const out = []
    for (const d of drafts) {
      if (!d.valid || !d.sid) continue
      const s = root.querySelector(`[data-sid="${d.sid}"]`)
      const c = root.querySelector(`[data-card="${d.id}"]`)
      if (!s || !c) continue
      const a = s.getBoundingClientRect(), b = c.getBoundingClientRect()
      const L = c.parentElement.getBoundingClientRect()
      if (b.top > L.bottom - 10 || b.bottom < L.top + 10) continue
      const x1 = a.right - R.left + 6, y1 = a.top + Math.min(12, a.height / 2) - R.top
      const x2 = b.left - R.left - 4, y2 = b.top + Math.min(26, b.height / 2) - R.top
      out.push({ id: d.id, kind: d.kind, d: `M ${x1} ${y1} C ${x1 + 60} ${y1}, ${x2 - 60} ${y2}, ${x2} ${y2}` })
    }
    setLines(out)
  }, [drafts, done])

  useLayoutEffect(() => { measure() }, [measure, confirmed, consent])
  useEffect(() => {
    const timers = [300, 900, 1600, 2400].map((ms) => setTimeout(measure, ms))
    const ro = new ResizeObserver(measure)
    if (wrap.current) ro.observe(wrap.current)
    const el = wrap.current
    const onScroll = () => measure()
    el?.addEventListener('scroll', onScroll, true)
    return () => { timers.forEach(clearTimeout); ro.disconnect(); el?.removeEventListener('scroll', onScroll, true) }
  }, [measure])

  const accepted = drafts.filter((d) => d.valid)
  const rejected = drafts.filter((d) => !d.valid)
  const needsConfirm = accepted.some((d) => d.ambiguity)
  const canPublish = done && (confirmed || !needsConfirm) && consent && accepted.some((d) => d.kind === 'action')

  return (
    <div ref={wrap} className="relative grid h-full grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-10 px-6 pb-5">
      <div className="min-h-0">
        {doc ? <Paper doc={doc} phase={phase} litCount={scanIdx} drafts={drafts} hover={hover} onPick={onPick} onRemove={onRemove} />
          : <UploadCard loading={loading} error={error} onPick={onPick} onFile={onFile} onSample={onSample} />}
      </div>

      <div className="flex min-h-0 flex-col">
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-800">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> UAE Year of Family 2026 · families caring for families
            </div>
            <div className="text-xs font-medium text-slate-500">Step 1 · AI drafts, nurse approves</div>
            <div className="text-xl font-semibold text-slate-900">Care plan draft</div>
          </div>
          {!done && (
            <motion.button onClick={onExtract} disabled={!doc || phase === 'scanning'}
              className="flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-500">
              {phase === 'scanning' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} {phase === 'scanning' ? 'Reading document…' : 'Extract with AI'}
            </motion.button>
          )}
          {done && (
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              <ShieldCheck size={14} /> {accepted.length} items, each checked against the letter{extractedBy ? <span className="ml-1 border-l border-emerald-200 pl-2 font-normal text-emerald-800">{extractedBy}</span> : null}
            </div>
          )}
        </div>

        <div className="scroll-thin mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {!done && phase !== 'scanning' && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm leading-relaxed text-slate-600">
              {doc ? <>Document attached. Press <b className="font-semibold text-slate-900">Extract with AI</b>.</> : <>Attach the patient's discharge document to begin.</>}{' '}
              The AI turns it into a draft plan. <b className="font-semibold text-slate-900">Every item is checked against the letter, word for word</b>. Nothing reaches the family until the nurse approves.
            </div>
          )}
          <AnimatePresence>
            {done && accepted.map((d, i) => (
              <motion.div key={d.id} data-card={d.id} onMouseEnter={() => setHover(d.id)} onMouseLeave={() => setHover(null)}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.3 + i * 0.06 }}
                className={`relative overflow-hidden rounded-xl border bg-white p-3 transition-colors ${hover === d.id ? 'border-slate-300 shadow-sm' : 'border-slate-200'}`}>
                <div className="absolute inset-y-0 left-0 w-[3px]" style={{ background: KIND_COLOR[d.kind] }} />
                <div className="flex items-start justify-between gap-2 pl-1.5">
                  <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-900">
                    <TaskIcon task={d} size={16} className="shrink-0 text-slate-500" /><span className="truncate">{d.title}</span>
                    {d.kind === 'warning' && <span className="shrink-0 rounded border border-amber-200 bg-amber-50 px-1.5 py-px text-[10px] font-medium text-amber-800">Important · when to call for help</span>}
                    {d.kind === 'info' && <span className="shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-px text-[10px] font-medium text-slate-600">Info</span>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1 text-[11px] text-emerald-700"><CheckCircle2 size={12} /> Quote verified · p.{d.page}</div>
                </div>
                {d.ambiguity && (
                  <div className={`mt-2 flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${confirmed ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                    <span className={confirmed ? 'flex items-center gap-1 text-emerald-700' : 'text-amber-700'}>
                      {confirmed ? <><Check size={12} /> Deadline confirmed by Nurse Fatima</> : <><AlertTriangle size={12} className="-mt-0.5 mr-1 inline" />{d.ambiguity}</>}
                    </span>
                    {!confirmed && <button onClick={onConfirm} className="flex shrink-0 items-center gap-1 rounded-md bg-amber-600 px-2.5 py-1 font-medium text-white hover:bg-amber-700"><CalendarCheck size={13} /> Confirm</button>}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {done && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.6 }} className="mt-3 space-y-2">
            <button onClick={onConsent}
              className={`flex w-full items-start gap-3 rounded-xl border bg-white p-3 text-left transition-colors ${consent ? 'border-teal-300' : 'border-slate-200 hover:bg-slate-50'}`}>
              <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${consent ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-400 bg-white'}`}>{consent && <Check size={12} strokeWidth={3} />}</div>
              <div className="text-sm">
                <div className="text-slate-700"><b className="font-semibold text-slate-900">Mariam</b> approves sharing her plan with</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {CIRCLE.map((k) => (
                    <span key={k} className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: PEOPLE[k].color }} />
                      {PEOPLE[k].name} · {PEOPLE[k].role}{k === 'maricel' ? ' (limited view)' : ''}
                    </span>
                  ))}
                </div>
              </div>
            </button>
            <button onClick={onPublish} disabled={!canPublish}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none">
              {canPublish ? <Send size={16} /> : <Lock size={15} />}
              {canPublish ? `Nurse Fatima approves ${accepted.length} items & publishes to the family` : needsConfirm && !confirmed ? 'Confirm the unclear deadline to publish' : 'Record consent to publish'}
            </button>
          </motion.div>
        )}
      </div>

      <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
        {lines.map((l) => (
          <g key={l.id} opacity={hover && hover !== l.id ? 0.15 : 1}>
            <path d={l.d} fill="none" stroke={KIND_COLOR[l.kind]} strokeOpacity={0.7} strokeWidth={1.25} className="flow-line" />
          </g>
        ))}
      </svg>
    </div>
  )
}
