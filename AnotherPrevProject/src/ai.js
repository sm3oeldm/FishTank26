// Real AI (Gemini, via the local server) — extraction + grounded Q&A. Falls back to built-in rules.
import { findBlock, norm } from './docparse.js'
import { fmtClock } from './data.js'

const ID_RULES = [
  [/pharmac|medicine|medication|prescription|tablet/i, 'pharmacy'], [/clinic|appointment|review|follow[- ]?up/i, 'clinic'],
  [/walk|exercise/i, 'walk'], [/diet|salt|meal|food/i, 'diet'], [/lift|heavy/i, 'lifting'],
]
const NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, fourteen: 14 }

export async function aiStatus() {
  try { return await (await fetch('/api/status')).json() } catch { return { llm: false } }
}

export async function aiExtract(doc) {
  const r = await fetch('/api/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: doc.text }) })
  if (!r.ok) throw new Error('AI unavailable')
  const j = await r.json()
  const used = new Set()
  const drafts = (j.items || []).map((it, i) => {
    const text = `${it.quote} ${it.title}`
    let id = it.kind === 'warning' ? 'warning' : ID_RULES.find(([re]) => re.test(text))?.[1] || `item${i}`
    if (used.has(id)) id = `${id}-${i}`
    used.add(id)
    const d = { id, kind: it.kind, title: it.title, quote: it.quote, helperOk: !!it.helper_ok }
    if (it.kind === 'warning') d.contact = it.contact || (it.quote.match(/\b99\d\b|\b0\d[\d ]{7,10}\d\b/g) || []).join(' · ') || 'see letter'
    if (it.kind === 'action') {
      const q = it.quote
      const within = q.match(/within (\w+) days?/i)
      if (/today/i.test(q)) { d.due = 8; d.dueLabel = 'Today 18:00' }
      else if (/tomorrow/i.test(q)) { d.due = 32; d.dueLabel = 'Tomorrow' }
      else if (within) {
        const n = NUM[within[1].toLowerCase()] || Number(within[1]) || 7
        d.due = n * 24; d.dueLabel = `By ${fmtClock(n * 24).day}`
        d.ambiguity = `“${within[0]}” → proposed ${fmtClock(n * 24).day}. Reviewer must confirm.`
      } else { d.due = null; d.dueLabel = /day|daily|twice/i.test(q) ? 'Daily' : 'Ongoing' }
    }
    const blk = findBlock(doc, it.quote)
    d.sid = blk ? blk.id : null
    d.page = blk ? blk.page : 1
    return d
  })
  return { drafts, model: j.model }
}

export async function aiChat({ doc, planText, history, question }) {
  const r = await fetch('/api/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ letter: doc.text, plan: planText, history, question }),
  })
  if (!r.ok) throw new Error('AI unavailable')
  const j = await r.json()
  const letter = norm(doc.text).toLowerCase()
  const quotes = (j.quotes || []).filter((q) => q && letter.includes(norm(q).toLowerCase())) // only show quotes that really are in the letter
  return { answer: j.answer, quotes, urgent: !!j.urgent, model: j.model }
}
