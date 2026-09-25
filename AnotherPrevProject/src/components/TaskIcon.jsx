import { Pill, Stethoscope, Footprints, Utensils, Dumbbell, AlertTriangle, FlaskConical, Bandage, ClipboardList, ShieldAlert, Bug } from 'lucide-react'

// Plain line icons instead of emoji. Pick by task id / kind / text.
export default function TaskIcon({ task, size = 16, className = '' }) {
  const t = `${task?.id || ''} ${task?.title || ''} ${task?.quote || ''}`.toLowerCase()
  let I = ClipboardList
  if (task?.injection) I = Bug
  else if (task?.kind === 'warning') I = AlertTriangle
  else if (task?.id === 'aspirin') I = ShieldAlert
  else if (/pharmac|medicine|medication|prescription|tablet|antibiotic/.test(t)) I = Pill
  else if (/clinic|appointment|review|follow[- ]?up|doctor|gp/.test(t)) I = Stethoscope
  else if (/walk|exercise|activity/.test(t)) I = Footprints
  else if (/diet|salt|meal|food|eat/.test(t)) I = Utensils
  else if (/lift|heavy/.test(t)) I = Dumbbell
  else if (/test|blood|lab|scan/.test(t)) I = FlaskConical
  else if (/wound|dressing|stitch/.test(t)) I = Bandage
  return <I size={size} className={className} strokeWidth={1.9} />
}
