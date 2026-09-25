// People, recorded AI drafts for the sample sheet, UI strings, time helpers. English only.

export const DISCHARGE_UTC = Date.UTC(2026, 8, 25, 6, 0) // Fri 25 Sep 2026, 10:00 Asia/Dubai

export const PEOPLE = {
  mariam: { name: 'Mariam', role: 'Patient · 68', color: '#fbbf24', initial: 'M' },
  aisha: { name: 'Aisha', role: 'Daughter · primary', color: '#34d399', initial: 'A' },
  omar: { name: 'Omar', role: 'Son · backup', color: '#22d3ee', initial: 'O' },
  maricel: { name: 'Maricel', role: 'Home helper', color: '#a78bfa', initial: 'M' },
  fatima: { name: 'Nurse Fatima', role: 'Discharge reviewer', color: '#f472b6', initial: 'F' },
}
export const CIRCLE = ['aisha', 'omar', 'maricel']
export const BACKUP = 'omar'

// Recorded model output for the sample discharge sheet. The validator decides what survives.
export const AI_DRAFTS = [
  {
    id: 'pharmacy', kind: 'action', icon: '💊', helperOk: false,
    title: 'Collect medicines from the pharmacy',
    quote: 'Collect prescribed medicines from the pharmacy today, before 6 pm.',
    due: 8, dueLabel: 'Today 18:00',
  },
  {
    id: 'clinic', kind: 'action', icon: '🩺', helperOk: false,
    title: 'Book Cardiology clinic review',
    quote: 'Arrange a clinic review with Cardiology within seven days of discharge.',
    due: 168, dueLabel: 'By Fri 2 Oct',
    ambiguity: '“within seven days” → proposed Fri 2 Oct. Reviewer must confirm.',
  },
  {
    id: 'walk', kind: 'action', icon: '🚶', helperOk: true,
    title: 'Walk with Mama 10 min, twice a day',
    quote: 'Walk for 10 minutes, twice a day, with someone nearby.',
    due: null, dueLabel: 'Daily',
  },
  {
    id: 'diet', kind: 'action', icon: '🥗', helperOk: true,
    title: 'Prepare low-salt meals',
    quote: 'Follow a low-salt diet.',
    due: null, dueLabel: 'Ongoing',
  },
  {
    id: 'lifting', kind: 'info', icon: '🏋️',
    title: 'No lifting over 5 kg for one week',
    quote: 'Do not lift anything heavier than 5 kg for one week.',
  },
  {
    id: 'warning', kind: 'warning', icon: '🚨',
    title: 'Chest pain, or bleeding that won’t stop',
    quote: 'If chest pain returns, or bleeding from the wrist does not stop after 10 minutes of pressure, call 998. For other questions, call the Cardiology Unit on 02 000 0000.',
    contact: '998 · questions: 02 000 0000',
  },
]

// ── Time helpers (clock = hours since discharge) ──────────────
export function fmtClock(h) {
  const d = new Date(DISCHARGE_UTC + h * 3600e3)
  return {
    day: d.toLocaleDateString('en-GB', { timeZone: 'Asia/Dubai', weekday: 'short', day: 'numeric', month: 'short' }),
    time: d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Dubai', hour: '2-digit', minute: '2-digit', hour12: false }),
    hour: Number(d.toLocaleString('en-GB', { timeZone: 'Asia/Dubai', hour: '2-digit', hour12: false })),
  }
}
export const dayLabel = (h) => `Day ${Math.floor((h + 10) / 24)}`

export const T = {
  plan: "Mama's care plan", mine: 'My tasks', open: 'Nobody has this yet', others: 'Family is on it', done: 'Done',
  claim: "I'll do it", markDone: 'Done', help: 'Help', warn: 'Call if', due: 'Due', overdue: 'Overdue',
  owner: 'with', empty: 'Nothing here',
}
