import { motion } from 'motion/react'
import { ArrowRight, ShieldCheck, Users, Building2, Map, Bot, HeartHandshake } from 'lucide-react'

const fade = (d = 0) => ({ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { delay: d, duration: 0.25, ease: 'easeOut' } })

const BUBBLES = [
  { who: 'Aisha', text: 'Did anyone get Mama’s medicine?', time: '9:12 AM', c: '#0f766e' },
  { who: 'Omar', text: 'I thought you did', time: '9:14 AM', c: '#b45309' },
  { who: 'Aisha', text: 'When is the clinic appointment??', time: '9:15 AM', c: '#0f766e' },
  { who: 'Maricel', text: 'Ma’am, can Mama eat this?', time: '9:21 AM', c: '#7c3aed', out: true },
]

export function Intro({ onStart }) {
  return (
    <div className="relative h-full">
      <div className="relative mx-auto flex h-full max-w-6xl items-center gap-12 px-10">
        <div className="min-w-0 flex-1">
          <motion.div {...fade(0)} className="flex items-center gap-2 text-sm">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600">UAE Year of Family 2026</span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600">Healthtech</span>
          </motion.div>
          <motion.h1 {...fade(0.05)} className="mt-6 max-w-3xl font-display text-5xl font-semibold leading-[1.1] tracking-tight text-slate-900">
            Mama came home from hospital.<br /><span className="text-teal-700">Everyone wants to help.</span><br />Nobody knows who’s doing what.
          </motion.h1>
          <motion.p {...fade(0.1)} className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
            The discharge sheet says <i>what</i> to do. Carely makes sure someone in the family actually <b className="font-semibold text-slate-900">owns</b> each step, and notices when it slips.
          </motion.p>
          <motion.div {...fade(0.15)} className="mt-8 grid max-w-2xl grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="font-display text-3xl font-semibold text-slate-900">≈25%</div>
              <div className="mt-1 text-sm text-slate-600">fewer readmissions at 90 days when family caregivers are part of discharge planning</div>
              <div className="mt-3 text-xs text-slate-500">Meta-analysis · J Am Geriatr Soc 2017</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="font-display text-3xl font-semibold text-slate-900">1 sheet → 1 plan</div>
              <div className="mt-1 text-sm text-slate-600">every task traced to its exact sentence, approved by a nurse, owned by a person</div>
              <div className="mt-3 text-xs text-slate-500">AI drafts · humans approve</div>
            </div>
          </motion.div>
          <motion.div {...fade(0.2)} className="mt-8 flex items-center gap-5">
            <button onClick={onStart} className="group flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-3 text-base font-medium text-white hover:bg-teal-800">
              Meet Carely <ArrowRight className="transition group-hover:translate-x-0.5" size={18} />
            </button>
            <div className="text-sm text-slate-500">Care, shared by the whole family.</div>
          </motion.div>
        </div>

        {/* family group chat mock */}
        <div className="pointer-events-none hidden w-[340px] shrink-0 lg:block">
          <motion.div {...fade(0.2)} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600"><Users size={16} /></div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">Family group</div>
                  <div className="text-xs text-slate-500">Aisha, Omar, Maricel, +3</div>
                </div>
              </div>
              <span className="rounded-full bg-green-600 px-2 py-0.5 text-[11px] font-medium text-white">43 unread</span>
            </div>
            <div className="space-y-2 bg-[#efeae2] px-3 py-4">
              {BUBBLES.map((b, i) => (
                <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.15, duration: 0.2 }}
                  className={`flex ${b.out ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[240px] rounded-lg px-3 py-1.5 shadow-sm ${b.out ? 'bg-[#dcf8c6]' : 'bg-white'}`}>
                    {!b.out && <div className="text-xs font-semibold" style={{ color: b.c }}>{b.who}</div>}
                    <div className="text-sm text-slate-800">{b.text}</div>
                    <div className="mt-0.5 text-right text-[10px] text-slate-500">{b.time}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export function Impact() {
  const cards = [
    { icon: HeartHandshake, title: 'Why now', items: ['2026 is the UAE Year of Family: families caring for families', 'DoH Abu Dhabi: “Predict, Prevent, Act”. A missed follow-up is a preventable readmission', 'Family WhatsApp groups are where discharge plans go to die'] },
    { icon: ShieldCheck, title: 'Safe by design', items: ['AI only drafts; a nurse signs off the plan before the family sees it', 'Each task must quote the discharge sheet word for word, or it’s blocked', 'Hidden instructions inside documents are ignored; no dosing advice, ever'] },
    { icon: Building2, title: 'Who pays', items: ['Hospitals: fewer avoidable readmissions, a better patient experience', 'Insurers: missed follow-ups and medicines are expensive', 'Home-care providers: a shared plan with the family'] },
    { icon: Map, title: 'Next', items: ['WhatsApp delivery, Arabic voice for elderly patients', 'Malaffi FHIR CarePlan + Sahatna booking links', 'Pilot with one discharge team; measure owned tasks and follow-ups'] },
  ]
  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col justify-center px-10">
      <motion.div {...fade(0)} className="text-sm font-medium text-slate-500">Carely · Caregiver Handoff</motion.div>
      <motion.h2 {...fade(0.05)} className="mt-2 font-display text-4xl font-semibold tracking-tight text-slate-900">
        From discharge sheet to a family that’s got it.
      </motion.h2>
      <div className="mt-8 grid grid-cols-2 gap-4">
        {cards.map((c, i) => (
          <motion.div key={c.title} {...fade(0.08 + i * 0.04)} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50"><c.icon className="text-teal-700" size={18} /></div>
              <div className="font-display text-lg font-semibold text-slate-900">{c.title}</div>
            </div>
            <ul className="mt-4 space-y-2">
              {c.items.map((t) => <li key={t} className="flex gap-2 text-[15px] leading-snug text-slate-700"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400" />{t}</li>)}
            </ul>
          </motion.div>
        ))}
      </div>
      <motion.div {...fade(0.25)} className="mt-6 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-600">
        <Bot size={18} className="shrink-0 text-teal-700" />
        <span><b className="font-semibold text-slate-900">Devin build plan:</b> small, testable slices (quote validator, task states, escalation, access rules), one Devin session each, merged only when tests pass.</span>
        <Users size={18} className="ml-auto shrink-0 text-slate-400" />
      </motion.div>
    </div>
  )
}
