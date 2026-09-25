import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { MessageCircle, X, Send, FileText, Loader2, Phone, Sparkles } from 'lucide-react'
import { PEOPLE, fmtClock } from '../data.js'
import { aiChat } from '../ai.js'

function planText(tasks, clock) {
  if (!tasks.length) return 'The plan has not been published to the family yet.'
  const lines = tasks.filter((t) => t.kind === 'action').map((t) => {
    const who = t.owner ? PEOPLE[t.owner].name : 'nobody yet'
    const state = t.status === 'done' ? `done by ${who}${t.note ? ` (${t.note})` : ''}` : `${who} is responsible`
    return `- ${t.title}: ${state}${t.dueLabel && t.status !== 'done' ? `, due ${t.dueLabel}` : ''}`
  })
  const c = fmtClock(clock)
  return `Current time: ${c.day} ${c.time}.\nFamily: Aisha (daughter), Omar (son, backup), Maricel (home helper).\n${lines.join('\n')}`
}

const SUGGESTIONS = [
  'When is Mama’s clinic follow-up?',
  'Can Mama lift the laundry basket?',
  'Who is picking up her medicines?',
  'What should we watch out for?',
  'How much aspirin should she take?',
]

// "Ask Carely": questions about Mama's discharge letter, answered by AI from the letter only.
export default function Chat({ doc, tasks, clock, enabled, bottom = 20 }) {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const box = useRef(null)
  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' }) }, [msgs, busy])

  async function ask(q) {
    const question = (q || draft).trim()
    if (!question || busy) return
    setDraft('')
    const history = msgs.map((m) => ({ role: m.role, text: m.role === 'user' ? m.text : JSON.stringify({ answer: m.text, quotes: m.quotes || [], urgent: !!m.urgent }) }))
    setMsgs((m) => [...m, { role: 'user', text: question }])
    setBusy(true)
    try {
      const r = await aiChat({ doc, planText: planText(tasks, clock), history, question })
      setMsgs((m) => [...m, { role: 'assistant', text: r.answer, quotes: r.quotes, urgent: r.urgent, model: r.model }])
    } catch {
      setMsgs((m) => [...m, { role: 'assistant', text: 'I can’t reach the AI right now. Please check the letter or call the care team.', quotes: [] }])
    } finally {
      setBusy(false)
    }
  }

  if (!doc) return null
  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} onClick={() => setOpen(true)}
            className="fixed right-6 z-40 flex items-center gap-2 rounded-full bg-stone-900 px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-stone-800" style={{ bottom }}>
            <MessageCircle size={17} /> Ask about Mama’s letter
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.2 }}
            className="fixed right-6 z-50 flex h-[520px] w-[390px] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl" style={{ bottom }}>
            <div className="flex items-center gap-3 border-b border-stone-200 bg-[#faf7f2] px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-700 text-white"><Sparkles size={17} /></div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-stone-900">Ask Carely</div>
                <div className="truncate text-xs text-stone-500">{enabled ? 'AI answers only from Mama’s discharge letter' : 'AI is offline'}</div>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-full p-1.5 text-stone-500 hover:bg-stone-200"><X size={16} /></button>
            </div>

            <div ref={box} className="scroll-thin min-h-0 flex-1 space-y-3 overflow-y-auto bg-white px-4 py-3">
              {!msgs.length && (
                <div className="text-sm text-stone-600">
                  Hi! I’ve read <b>{doc.name}</b>. Ask me anything about Mama’s care. I only answer from the letter, and I’ll show you where it says so.
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button key={s} onClick={() => ask(s)} disabled={!enabled}
                        className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs text-stone-700 hover:bg-stone-100 disabled:opacity-50">{s}</button>
                    ))}
                  </div>
                </div>
              )}
              {msgs.map((m, i) => m.role === 'user' ? (
                <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-teal-700 px-3 py-2 text-sm text-white">{m.text}</div>
              ) : (
                <div key={i} className="max-w-[92%]">
                  <div className={`rounded-2xl rounded-bl-md border px-3 py-2 text-sm ${m.urgent ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-stone-200 bg-stone-50 text-stone-800'}`}>
                    {m.urgent && <div className="mb-1 flex items-center gap-1.5 font-semibold"><Phone size={14} /> Call 998 now</div>}
                    {m.text}
                  </div>
                  {m.quotes?.map((q) => (
                    <div key={q} className="mt-1.5 flex gap-1.5 rounded-lg border-l-2 border-teal-600 bg-teal-50/60 px-2 py-1 text-xs italic text-stone-600">
                      <FileText size={12} className="mt-0.5 shrink-0 not-italic text-teal-700" /> “{q}”
                    </div>
                  ))}
                  {m.model && <div className="mt-1 text-[10px] text-stone-400">{m.quotes?.length ? 'Quoted from the letter · ' : ''}{m.model}</div>}
                </div>
              ))}
              {busy && <div className="flex items-center gap-2 text-sm text-stone-500"><Loader2 size={14} className="animate-spin" /> Reading the letter…</div>}
            </div>

            <form onSubmit={(e) => { e.preventDefault(); ask() }} className="flex gap-2 border-t border-stone-200 p-3">
              <input value={draft} onChange={(e) => setDraft(e.target.value)} disabled={!enabled} placeholder={enabled ? 'Ask a question…' : 'AI is offline'}
                className="min-w-0 flex-1 rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-teal-600 focus:outline-none" />
              <button disabled={!enabled || busy || !draft.trim()} className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-700 text-white disabled:bg-stone-200 disabled:text-stone-400"><Send size={15} /></button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
