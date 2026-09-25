import type { EpisodeView } from "@/lib/services/plan";
import { formatDateTime, humanize } from "@/lib/format";

export function ActivityFeed({ view }: { view: EpisodeView }) {
  if (view.activity.length === 0) {
    return <div className="card p-6 text-sm text-slate-600">No activity yet.</div>;
  }
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2">When</th>
            <th className="px-4 py-2">Who</th>
            <th className="px-4 py-2">Event</th>
            <th className="px-4 py-2">Item / note</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {view.activity.map((a) => (
            <tr key={a.id}>
              <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-slate-600">
                {formatDateTime(a.createdAt, view.episode.timeZone)}
              </td>
              <td className="px-4 py-2">{a.actor.displayName}</td>
              <td className="px-4 py-2 font-medium">{humanize(a.eventType)}</td>
              <td className="px-4 py-2 text-slate-700">
                {a.itemTitle ? <span className="font-medium">{a.itemTitle}</span> : null}
                {a.itemTitle && a.note ? " — " : null}
                {a.note ? <span className="text-slate-600">{a.note}</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
