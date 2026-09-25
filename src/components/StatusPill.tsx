import { humanize } from "@/lib/format";

const TONES: Record<string, string> = {
  unclaimed: "bg-slate-100 text-slate-700 ring-slate-200",
  awaiting_acceptance: "bg-sky-50 text-sky-700 ring-sky-200",
  active: "bg-teal-50 text-teal-700 ring-teal-200",
  needs_help: "bg-amber-50 text-amber-800 ring-amber-200",
  done: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  overdue: "bg-rose-50 text-rose-700 ring-rose-200",
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200",
  removed: "bg-slate-100 text-slate-500 ring-slate-200 line-through",
  draft: "bg-amber-50 text-amber-800 ring-amber-200",
  published: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  granted: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  withdrawn: "bg-rose-50 text-rose-700 ring-rose-200",
  reviewer: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  patient: "bg-violet-50 text-violet-700 ring-violet-200",
  caregiver: "bg-sky-50 text-sky-700 ring-sky-200",
  backup: "bg-slate-100 text-slate-700 ring-slate-200",
  fixture: "bg-slate-100 text-slate-600 ring-slate-200",
  extracted: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  reviewer_authored: "bg-violet-50 text-violet-700 ring-violet-200",
  warning_sign: "bg-rose-50 text-rose-700 ring-rose-200",
  action: "bg-teal-50 text-teal-700 ring-teal-200",
};

export function StatusPill({ value, label }: { value: string; label?: string }) {
  const tone = TONES[value] ?? "bg-slate-100 text-slate-700 ring-slate-200";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tone}`}>
      {label ?? humanize(value)}
    </span>
  );
}
