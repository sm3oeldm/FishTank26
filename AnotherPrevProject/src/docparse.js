// Read an attached discharge document (PDF or text) into pages → blocks, then draft tasks from it.
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { AI_DRAFTS } from './data.js'
import { isInjection } from './logic.js'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export const norm = (s) => s.replace(/\s+/g, ' ').trim()
const BULLET = /^\s*(?:[-•*▪●]|\d{1,2}[.)])\s+/

async function pdfLines(file) {
  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await pdfjs.getDocument({ data }).promise
  const pages = []
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n)
    const content = await page.getTextContent()
    const rows = new Map()
    for (const it of content.items) {
      if (!it.str) continue
      const y = Math.round(it.transform[5])
      const key = [...rows.keys()].find((k) => Math.abs(k - y) <= 2) ?? y
      const row = rows.get(key) || []
      row.push({ x: it.transform[4], s: it.str })
      rows.set(key, row)
    }
    const lines = [...rows.entries()].sort((a, b) => b[0] - a[0]).map(([, r]) => norm(r.sort((a, b) => a.x - b.x).map((x) => x.s).join(' '))).filter(Boolean)
    pages.push(lines)
  }
  return pages
}

async function textLines(file) {
  const t = await file.text()
  return t.split(/\f/).map((pg) => pg.split(/\r?\n/).map(norm).filter(Boolean))
}

function toBlocks(lines, page) {
  const blocks = []
  for (const raw of lines) {
    const bullet = BULLET.test(raw)
    const line = raw.replace(BULLET, '')
    const prev = blocks[blocks.length - 1]
    if (!bullet && prev && prev.type === 'item' && !/[.!?]$/.test(prev.text)) { prev.text = `${prev.text} ${line}`; continue }
    let type
    if (isInjection(line)) type = 'note'
    else if (bullet || (/[.!?]$/.test(line) && line.length > 30)) type = 'item'
    else if (/^[^:]{1,28}:\s/.test(line)) type = 'meta'
    else type = 'heading'
    blocks.push({ id: `p${page}b${blocks.length}`, page, type, text: line })
  }
  return blocks
}

export async function readDocument(file) {
  const isPdf = /pdf$/i.test(file.type) || /\.pdf$/i.test(file.name)
  const isText = /^text\//.test(file.type) || /\.(txt|md)$/i.test(file.name)
  if (!isPdf && !isText) throw new Error('Please attach a PDF or a .txt file.')
  const pages = isPdf ? await pdfLines(file) : await textLines(file)
  const doc = { name: file.name, pages: pages.map((lines, i) => ({ page: i + 1, blocks: toBlocks(lines, i + 1) })) }
  doc.blocks = doc.pages.flatMap((p) => p.blocks)
  doc.text = doc.blocks.map((b) => b.text).join('\n')
  if (!norm(doc.text)) throw new Error('No text found. Scanned documents are not supported yet; attach a text-based PDF.')
  return doc
}

export const findBlock = (doc, quote) => {
  const q = norm(quote).toLowerCase()
  return doc.blocks.find((b) => { const t = norm(b.text).toLowerCase(); return t.includes(q) || (t.length > 20 && q.includes(t)) })
}

const ICONS = [
  [/pharmac|medicine|medication|prescription|tablet/i, '💊'], [/clinic|appointment|review|follow[- ]?up|doctor/i, '🩺'],
  [/walk|exercise|activity/i, '🚶'], [/diet|salt|meal|food|eat|drink|fluid/i, '🥗'], [/test|blood|lab|scan/i, '🧪'], [/wound|dressing|stitch/i, '🩹'],
]
const iconFor = (t) => ICONS.find(([re]) => re.test(t))?.[1] || '📋'
const shortTitle = (t) => { const s = t.replace(/[.!?]+$/, ''); return s.length > 48 ? `${s.slice(0, 46).replace(/\s+\S*$/, '')}…` : s }

function heuristicDrafts(doc) {
  const out = []
  for (const b of doc.blocks.filter((x) => x.type === 'item')) {
    const t = b.text
    const base = { quote: t, title: shortTitle(t), icon: iconFor(t), id: b.id }
    if (/\b(if|call|emergency|998|999|911|seek|go to)\b/i.test(t) && /(pain|bleed|fever|swell|breath|dizz|faint|vomit|rash|chest)/i.test(t)) {
      const phones = t.match(/\b\d{3}\b(?!\s*(?:kg|mg|minutes|days|hours))|\b0\d[\d ]{7,10}\d\b/g) || []
      out.push({ ...base, kind: 'warning', icon: '🚨', contact: phones.join(' · ') || 'see sheet' })
    } else if (/^(do not|don't|avoid|no )/i.test(t)) {
      out.push({ ...base, kind: 'info' })
    } else {
      const d = { ...base, kind: 'action', helperOk: /walk|exercise|diet|salt|meal|food/i.test(t), due: null, dueLabel: 'Ongoing' }
      const within = t.match(/within (\w+) days?|in (\w+) days?/i)
      if (/today/i.test(t)) { d.due = 8; d.dueLabel = 'Today 18:00' }
      else if (/tomorrow/i.test(t)) { d.due = 32; d.dueLabel = 'Tomorrow' }
      else if (within) { d.due = 168; d.dueLabel = 'Proposed date'; d.ambiguity = `“${within[0]}” → proposed deadline. Reviewer must confirm.` }
      out.push(d)
    }
  }
  return out
}

// Recorded model output for the sample sheet (reliable on stage); heuristic drafting for any other document.
export function draftFrom(doc) {
  const sample = ['Collect prescribed medicines from the pharmacy today', 'Arrange a clinic review with Cardiology'].every((q) => norm(doc.text).toLowerCase().includes(q.toLowerCase()))
  const drafts = sample ? AI_DRAFTS.map((d) => ({ ...d })) : heuristicDrafts(doc)
  for (const b of doc.blocks.filter((x) => x.type === 'note')) {
    drafts.push({ id: `inject-${b.id}`, kind: 'action', icon: '🧨', title: shortTitle(b.text.replace(/^note to automated systems:\s*/i, '')).replace(/^./, (c) => c.toUpperCase()), quote: b.text, injection: true })
  }
  for (const d of drafts) {
    const blk = d.quote && findBlock(doc, d.quote)
    d.sid = blk ? blk.id : null
    d.page = blk ? blk.page : d.page
  }
  return { drafts, sample }
}
