import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { RotateCcw, ChevronRight, FileText, Users, Clock3, Moon, Sun, Share2, BellRing, Smartphone } from 'lucide-react'
import Review from './components/Review.jsx'
import People from './components/People.jsx'
import Circle from './components/Circle.jsx'
import PlanBoard from './components/PlanBoard.jsx'
import { CaregiverPhone, MamaPhone } from './components/Phone.jsx'
import { Intro, Impact } from './components/Slides.jsx'
import { PEOPLE, fmtClock, dayLabel } from './data.js'
import { validateDraft, deriveNotifications, GRACE_H } from './logic.js'
import { readDocument, draftFrom } from './docparse.js'
import { aiStatus, aiExtract } from './ai.js'
import Chat from './components/Chat.jsx'

const SLIDES = ['intro', 'demo', 'impact']
const NOTES = { clinic: 'Booked · Wed 1 Oct, 10:30', pharmacy: 'Picked up · all 4 medicines', walk: 'Walked 10 min', diet: 'Low-salt lunch ready' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function validated(doc, drafts = draftFrom(doc).drafts) {
  return drafts.map((d) => {
    if (d.injection) return { ...d, valid: false, reason: 'Instruction hidden inside the document: treated as data, never obeyed' }
    const v = validateDraft(d, doc.text)
    return { ...d, valid: v.ok, reason: v.reason }
  })
}

export default function App() {
  const [slide, setSlide] = useState(0)
  const [stage, setStage] = useState('review')
  const [phase, setPhase] = useState('idle')
  const [scanIdx, setScanIdx] = useState(0)
  const [drafts, setDrafts] = useState([])
  const [confirmed, setConfirmed] = useState(false)
  const [consent, setConsent] = useState(false)
  const [tasks, setTasks] = useState([])
  const [clock, setClock] = useState(0)
  const [events, setEvents] = useState([])
  const [hearts, setHearts] = useState([])
  const [third, setThird] = useState('aisha') // whose phone is shown
  const [view, setView] = useState('plan') // family screen: plan list or care graph
  const [beat, setBeat] = useState(0)
  const [fired, setFired] = useState({}) // notifications that have fired, kept for the audit trail
  const [toast, setToast] = useState(null) // on-screen "notification sent" popup
  const seenNotif = useRef(new Set())
  const [doc, setDoc] = useState(null)
  const [ai, setAi] = useState({ llm: false })
  const [extractedBy, setExtractedBy] = useState(null)
  const [docLoading, setDocLoading] = useState(false)
  const [docError, setDocError] = useState(null)
  const runId = useRef(0)
  const fileInput = useRef(null)

  useEffect(() => { aiStatus().then(setAi) }, [])

  const log = useCallback((actor, en, at) => setEvents((e) => [...e, { id: e.length + Math.random(), actor, en, at }]), [])

  const reset = () => {
    runId.current++
    setStage('review'); setPhase('idle'); setScanIdx(0); setDrafts([]); setConfirmed(false); setConsent(false)
    setTasks([]); setClock(0); setEvents([]); setHearts([]); setThird('aisha'); setView('plan'); setBeat(0); setFired({}); setToast(null); seenNotif.current = new Set()
    setDoc(null); setDocError(null); setDocLoading(false)
  }

  // ── Attach the discharge document ──
  // Remove the attached document: the whole episode starts over for the next patient.
  const removeDoc = () => { reset(); setSlide(1) }
  const openPicker = () => { setSlide(1); setStage('review'); fileInput.current?.click() }
  async function loadFile(file) {
    if (!file) return
    setDocLoading(true); setDocError(null)
    try {
      const d = await readDocument(file)
      runId.current++
      setDoc(d); setPhase('idle'); setScanIdx(0); setDrafts([]); setConfirmed(false); setConsent(false)
      setBeat((b) => Math.max(b, 1))
    } catch (e) {
      setDocError(e.message || 'Could not read that file.')
    } finally {
      setDocLoading(false)
    }
  }
  async function loadSample() {
    const r = await fetch('/sample-discharge.pdf')
    const blob = await r.blob()
    loadFile(new File([blob], 'Mariam_Discharge_Sample.pdf', { type: 'application/pdf' }))
  }

  // ── Review actions ──
  async function extract() {
    if (phase !== 'idle' || !doc) return
    const id = ++runId.current
    setSlide(1); setPhase('scanning'); setExtractedBy(null)
    // Real AI reads the letter while the scan animation runs; built-in rules are the fallback.
    const aiJob = ai.llm ? aiExtract(doc).catch(() => null) : Promise.resolve(null)
    const n = doc.blocks.filter((b) => b.type === 'item').length
    for (let i = 1; i <= n; i++) { await sleep(Math.max(160, 1700 / n)); if (runId.current !== id) return; setScanIdx(i) }
    const res = await aiJob
    if (runId.current !== id) return
    if (res && res.drafts.length) { setDrafts(validated(doc, res.drafts)); setExtractedBy(`Gemini AI · ${res.model}`) }
    else { setDrafts(validated(doc)); setExtractedBy(ai.llm ? 'Built-in rules (AI busy, fallback)' : 'Built-in rules (offline)') }
    setPhase('done')
  }
  const confirm = () => { if (phase === 'done') setConfirmed(true) }
  const toggleConsent = () => { if (phase === 'done') setConsent((c) => !c) }
  function publish() {
    if (tasks.length) { setStage('circle'); return } // already published: never wipe progress
    const needsConfirm = drafts.some((d) => d.valid && d.ambiguity)
    if (!(phase === 'done' && (confirmed || !needsConfirm) && consent)) return
    const plan = drafts.filter((d) => d.valid).map((d) => ({ ...d, owner: null, status: 'unclaimed', thanked: false, needsHelp: false }))
    if (!plan.some((p) => p.kind === 'action')) return
    setTasks(plan)
    log('mariam', 'approved sharing with Aisha, Omar and Maricel (limited)', clock)
    log('fatima', `published the plan from ${doc?.name}: ${plan.filter((p) => p.kind === 'action').length} tasks, every one source-linked`, clock)
    setStage('circle'); setView('plan')
  }

  // ── Care circle actions ──
  const patch = (id, fn) => setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...fn(t) } : t)))
  const claim = (id, who) => {
    const t = tasks.find((x) => x.id === id)
    if (!t || t.owner || t.status === 'done') return
    patch(id, () => ({ owner: who, status: 'active' }))
    log(who, `took “${t.title}”`, clock)
  }
  const done = (id, who) => {
    const t = tasks.find((x) => x.id === id)
    if (!t || t.status === 'done') return
    patch(id, (x) => ({ status: 'done', owner: x.owner || who, needsHelp: false, doneAt: clock, note: NOTES[id] }))
    log(who, `completed “${t.title}”${NOTES[id] ? ` (${NOTES[id]})` : ''}`, clock)
  }
  const help = (id, who) => {
    const t = tasks.find((x) => x.id === id)
    if (!t) return
    patch(id, () => ({ needsHelp: true, owner: null, status: 'unclaimed' }))
    log(who, `asked for help with “${t.title}”; it's back with the family`, clock)
  }
  const thank = (id) => {
    const t = tasks.find((x) => x.id === id)
    if (!t || t.thanked || !t.owner) return
    patch(id, () => ({ thanked: true }))
    setHearts((h) => [...h, { key: `${id}-${Date.now()}`, to: t.owner }])
    log('mariam', `sent thanks to${PEOPLE[t.owner].name}`, clock)
  }
  useEffect(() => {
    if (!hearts.length) return
    const t = setTimeout(() => setHearts((h) => h.slice(1)), 1800)
    return () => clearTimeout(t)
  }, [hearts])

  const notifs = useMemo(() => deriveNotifications(tasks, clock), [tasks, clock])
  // When a notification fires (from N or from dragging the timeline): show whose phone got it, and switch to that phone.
  useEffect(() => {
    const live = new Set(notifs.map((n) => n.key))
    seenNotif.current = new Set([...seenNotif.current].filter((k) => live.has(k))) // dragging back lets it fire again
    const fresh = notifs.filter((n) => !seenNotif.current.has(n.key))
    if (!fresh.length) return
    fresh.forEach((n) => seenNotif.current.add(n.key))
    const n = fresh[fresh.length - 1]
    const to = n.level === 'escalation' ? 'omar' : n.to[0]
    setThird(to)
    setToast({ key: n.key, to, text: n.en, level: n.level })
  }, [notifs])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(t)
  }, [toast])
  useEffect(() => {
    setFired((f) => {
      let changed = false
      const n = { ...f }
      for (const x of notifs) if (!n[x.key]) { n[x.key] = x; changed = true }
      return changed ? n : f
    })
  }, [notifs])

  // ── Director: one key runs the whole story ──
  const BEATS = [
    { label: 'Attach discharge document', run: () => openPicker() },
    { label: 'Extract with AI', run: () => extract() },
    { label: 'Nurse confirms the deadline', run: () => confirm() },
    { label: 'Mariam gives consent', run: () => setConsent(true) },
    { label: 'Publish to the family', run: () => publish() },
    { label: 'Aisha takes the clinic booking', run: () => { setThird('aisha'); claim('clinic', 'aisha') } },
    { label: 'Maricel takes walks & meals', run: () => { claim('walk', 'maricel'); setTimeout(() => claim('diet', 'maricel'), 350); setThird('maricel') } },
    { label: 'Aisha books the appointment', run: () => { setThird('aisha'); done('clinic', 'aisha') } },
    { label: 'Time → today 18:00', run: () => { setThird('aisha'); setClock(8) } },
    { label: `Time → +${GRACE_H}h (backup alert)`, run: () => { setThird('omar'); setClock(8 + GRACE_H) } },
    { label: 'Omar takes the medicines', run: () => { setThird('omar'); claim('pharmacy', 'omar') } },
    { label: 'Omar picks them up', run: () => { setThird('omar'); done('pharmacy', 'omar') } },
    { label: 'Mama says thank you', run: () => { setThird('mama'); thank('pharmacy'); setTimeout(() => thank('clinic'), 500) } },
  ]
  const next = () => {
    if (slide === 0) { setSlide(1); return }
    if (slide === 2) return
    if (phase === 'scanning') return // wait for the AI read to finish
    let i = beat
    if (doc && i === 0) i = 1 // document already attached
    if (tasks.length && i < 5) i = 5 // plan already published by hand: skip review beats
    const b = BEATS[i]
    if (!b) { setSlide(2); return }
    b.run()
    if (i === 0) return // advances when the file is loaded
    setBeat(i + 1)
  }
  const beatIdx = tasks.length && beat < 5 ? 5 : doc && beat === 0 ? 1 : beat
  const nextRef = useRef(next)
  nextRef.current = next

  useEffect(() => {
    const onKey = (e) => {
      const el = document.activeElement
      if (el?.tagName === 'TEXTAREA' || (el?.tagName === 'INPUT' && el.type !== 'range')) return
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); if (!e.repeat) nextRef.current(); return }
      if (el?.type === 'range' && e.key.startsWith('Arrow')) return // arrows move the demo clock
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); setSlide((s) => Math.min(SLIDES.length - 1, s + 1)) }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); setSlide((s) => Math.max(0, s - 1)) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const c = fmtClock(clock)
  const night = c.hour >= 19 || c.hour < 6

  return (
    <div className="relative h-full w-full">
      <input ref={fileInput} type="file" accept=".pdf,.txt,application/pdf,text/plain" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; loadFile(f) }} />

      {/* Header */}
      <header className="absolute inset-x-0 top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
        <button onClick={() => setSlide(0)} className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-sm font-semibold text-white">C</div>
          <div className="text-left leading-tight">
            <div className="text-base font-semibold tracking-tight text-slate-900">Carely</div>
            <div className="text-xs text-slate-500">Caregiver Handoff</div>
          </div>
        </button>
        <span className="ml-4 mr-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> UAE Year of Family 2026
        </span>

        {slide === 1 && (
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 text-xs font-medium">
            <button onClick={() => setStage('review')} className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 transition-colors ${stage === 'review' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}><FileText size={13} /> 1 · Review</button>
            <ChevronRight size={14} className="text-slate-300" />
            <button onClick={() => { if (tasks.length) { setStage('circle'); setView('plan') } }} className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 transition-colors ${stage === 'circle' && view === 'plan' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'} ${tasks.length ? '' : 'cursor-not-allowed opacity-50'}`}><Users size={13} /> 2 · Plan</button>
            <ChevronRight size={14} className="text-slate-300" />
            <button onClick={() => { if (tasks.length) { setStage('circle'); setView('graph') } }} className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 transition-colors ${stage === 'circle' && view === 'graph' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'} ${tasks.length ? '' : 'cursor-not-allowed opacity-50'}`}><Share2 size={13} /> 3 · Care graph</button>
          </div>
        )}

        <div className="flex items-center gap-3">
          {slide === 1 && BEATS[beatIdx] ? (
            <motion.button key={beatIdx} onClick={next} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm hover:bg-slate-50">
              <kbd className="rounded border border-slate-200 bg-slate-100 px-1.5 font-mono text-[10px] text-slate-600">N</kbd>
              <span className="text-slate-500">Next:</span> <span className="font-medium text-slate-900">{BEATS[beatIdx].label}</span> <ChevronRight size={14} className="text-slate-400" />
            </motion.button>
          ) : (
            <span className="hidden rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 xl:inline">UAE Year of Family 2026</span>
          )}
          <button onClick={reset} title="Reset demo" className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50"><RotateCcw size={14} /></button>
          <div className="flex gap-1.5">
            {SLIDES.map((s, i) => (
              <button key={s} onClick={() => setSlide(i)} className={`h-1.5 rounded-full transition-all ${slide === i ? 'w-6 bg-teal-700' : 'w-3 bg-slate-300 hover:bg-slate-400'}`} />
            ))}
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.main key={slide === 1 ? `demo-${stage}` : SLIDES[slide]} className="absolute inset-0 pt-16" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          {slide === 0 && <Intro onStart={() => setSlide(1)} />}
          {slide === 2 && <Impact />}
          {slide === 1 && stage === 'review' && (
            <Review doc={doc} loading={docLoading} error={docError} onPick={openPicker} onFile={loadFile} onSample={loadSample}
              phase={phase} scanIdx={scanIdx} drafts={drafts} confirmed={confirmed} consent={consent}
              onRemove={removeDoc} extractedBy={extractedBy} aiOn={ai.llm} onExtract={extract} onConfirm={confirm} onConsent={toggleConsent} onPublish={publish} />
          )}
          {slide === 1 && stage === 'circle' && (
            <div className="grid h-full grid-cols-[300px_minmax(0,1fr)_auto] grid-rows-[minmax(0,1fr)_auto] gap-x-6 gap-y-3 bg-[#faf7f2] px-6 pb-4 pt-5">
              <People tasks={tasks} clock={clock} active={third} onPick={setThird} />
              <div className="flex min-h-0 flex-col gap-3">
                <div className="min-h-0 flex-1">
                  {view === 'plan' ? <PlanBoard tasks={tasks} clock={clock} /> : (
                    <div className="flex h-full flex-col rounded-2xl border border-stone-200 bg-white p-4">
                      <div className="flex items-end justify-between">
                        <div>
                          <div className="serif text-xl font-semibold text-stone-900">Care graph</div>
                          <div className="text-sm text-stone-500">Who owns which task, at a glance</div>
                        </div>
                        <div className="flex gap-3 text-xs text-stone-500">
                          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" />Unclaimed</span>
                          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-600" />Overdue</span>
                          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-600" />Done</span>
                        </div>
                      </div>
                      <div className="min-h-0 flex-1"><Circle tasks={tasks} clock={clock} hearts={hearts} /></div>
                    </div>
                  )}
                </div>
                <ActivityFeed events={events} notifs={Object.values(fired).filter((n) => n.at <= clock)} />
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="flex gap-0.5 rounded-full border border-stone-200 bg-white p-0.5 text-xs font-medium shadow-sm">
                  {[['aisha', 'Aisha'], ['omar', 'Omar'], ['mama', 'Mama'], ['maricel', 'Maricel']].map(([k, label]) => (
                    <button key={k} onClick={() => setThird(k)} className={`rounded-full px-3 py-1 ${third === k ? 'bg-stone-800 text-white' : 'text-stone-500 hover:text-stone-800'}`}>{label}</button>
                  ))}
                </div>
                <AnimatePresence mode="wait">
                  <motion.div key={third} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
                    {third === 'mama'
                      ? <MamaPhone tasks={tasks} clock={clock} onThank={thank} />
                      : <CaregiverPhone who={third} helper={third === 'maricel'} tasks={tasks} clock={clock} notifs={notifs} onClaim={claim} onDone={done} onHelp={help} />}
                  </motion.div>
                </AnimatePresence>
              </div>
              <TimeBar clock={clock} setClock={setClock} night={night} />
            </div>
          )}
        </motion.main>
      </AnimatePresence>

      <AnimatePresence>
        {toast && slide === 1 && stage === 'circle' && (
          <motion.div key={toast.key} initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}
            className={`fixed left-1/2 top-20 z-50 flex w-[440px] -translate-x-1/2 items-start gap-3 rounded-2xl border bg-white p-4 shadow-xl ${toast.level === 'escalation' ? 'border-blue-300' : 'border-amber-300'}`}>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toast.level === 'escalation' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}><BellRing size={18} /></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-stone-900"><Smartphone size={14} /> Notification sent to {PEOPLE[toast.to]?.name}’s phone</div>
              <div className="mt-0.5 text-sm text-stone-600">{toast.text}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {slide === 1 && <Chat doc={doc} tasks={tasks} clock={clock} enabled={ai.llm} bottom={stage === 'circle' ? 96 : 20} />}

    </div>
  )
}

function ActivityFeed({ events, notifs }) {
  const items = [
    ...[...events].reverse().map((e) => ({ key: e.id, at: e.at, color: PEOPLE[e.actor]?.color || '#94a3b8', text: <><b className="font-medium text-slate-900">{PEOPLE[e.actor]?.name}</b> {e.en}</> })),
    ...notifs.map((n) => ({ key: n.key, at: n.at, color: n.level === 'escalation' ? '#b91c1c' : '#b45309', text: <><b className={`font-medium ${n.level === 'escalation' ? 'text-red-700' : 'text-amber-700'}`}>{n.level === 'escalation' ? 'Escalated → Omar' : 'Reminder'}</b> {n.en}</> })),
  ].sort((a, b) => b.at - a.at)
  return (
    <div className="h-[150px] rounded-2xl border border-stone-200 bg-white px-3 pt-2">
      <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-500">
        <span>Audit trail · who did what, when</span><span className="font-normal tabular-nums">{items.length} events</span>
      </div>
      <div className="scroll-thin h-[108px] space-y-1 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {items.map((it) => (
            <motion.div key={it.key} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="flex items-baseline gap-2 text-xs text-slate-600">
              <span className="h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full" style={{ background: it.color }} />
              <span className="w-[96px] shrink-0 text-[11px] tabular-nums text-slate-500">{dayLabel(it.at)} · {fmtClock(it.at).time}</span>
              <span className="min-w-0">{it.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

function TimeBar({ clock, setClock, night }) {
  const c = fmtClock(clock)
  const marks = [
    { h: 0, label: 'Discharge' },
    { h: 8, label: 'Pharmacy due' },
    { h: 8 + GRACE_H, label: 'Backup alert' },
    { h: 72, label: 'Day 3' },
  ]
  return (
    <div className="col-span-3 flex items-center gap-5 rounded-xl border border-slate-200 bg-white px-5 py-2.5 shadow-sm">
      <div className="flex w-[190px] shrink-0 items-center gap-3">
        {night ? <Moon size={18} className="text-slate-500" /> : <Sun size={18} className="text-amber-600" />}
        <div>
          <div className="text-lg font-semibold leading-none tabular-nums text-slate-900">{c.time}</div>
          <div className="mt-0.5 text-xs text-slate-500">{c.day} · {dayLabel(clock)}</div>
        </div>
      </div>
      <div className="relative flex-1 pb-4">
        <input type="range" min={0} max={72} step={1} value={clock} onChange={(e) => setClock(Number(e.target.value))} onPointerUp={(e) => e.currentTarget.blur()} className="w-full accent-teal-700" />
        {marks.map((m) => (
          <button key={m.h} onClick={() => setClock(m.h)} className="absolute top-6 -translate-x-1/2 whitespace-nowrap text-[11px] text-slate-500 hover:text-slate-900" style={{ left: `${(m.h / 72) * 100}%` }}>
            {m.label}
          </button>
        ))}
      </div>
      <div className="flex shrink-0 items-center gap-1.5 text-xs text-slate-500"><Clock3 size={13} /> Demo clock</div>
    </div>
  )
}
