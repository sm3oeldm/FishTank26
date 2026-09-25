// Validation + derived state. Pure functions — easy to test (and to hand to Devin).
import { BACKUP, PEOPLE } from './data.js'

const norm = (s) => s.replace(/\s+/g, ' ').trim()

// An AI draft survives only if its quote appears verbatim in the attached document.
export function validateDraft(d, docText) {
  if (!d.quote || !norm(d.quote)) return { ok: false, reason: 'No source quote' }
  if (!norm(docText).toLowerCase().includes(norm(d.quote).toLowerCase())) return { ok: false, reason: 'Source quote not found in document' }
  return { ok: true }
}

// Text inside the document that tries to instruct the system is treated as data.
export const isInjection = (text) => /\b(automated systems?|ignore (all|previous) instructions|mark all .* completed)\b/i.test(text)

export const GRACE_H = 24

// Derived, idempotent notifications: same inputs → same list (no duplicates on replay).
export function deriveNotifications(tasks, clock) {
  const out = []
  for (const t of tasks) {
    if (t.kind !== 'action' || t.due == null || t.status === 'done') continue
    if (clock >= t.due) {
      out.push({ key: `${t.id}:overdue`, at: t.due, task: t.id, to: t.owner ? [t.owner] : ['aisha', 'omar'], level: 'overdue',
        en: t.owner ? `Overdue: ${t.title}` : `Nobody has claimed: ${t.title}` })
    }
    if (clock >= t.due + GRACE_H) {
      out.push({ key: `${t.id}:backup`, at: t.due + GRACE_H, task: t.id, to: [BACKUP], level: 'escalation',
        en: `Backup alert: “${t.title}” is ${GRACE_H}h overdue. Can you take it?` })
    }
  }
  return out.sort((a, b) => a.at - b.at)
}

export const isOverdue = (t, clock) => t.kind === 'action' && t.due != null && t.status !== 'done' && clock >= t.due
export const isEscalated = (t, clock) => isOverdue(t, clock) && clock >= t.due + GRACE_H

export function eventText(e) {
  const who = PEOPLE[e.actor]?.name || e.actor
  return `${who} ${e.text}`
}
