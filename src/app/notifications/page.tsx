import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listNotifications } from "@/lib/services/notifications";
import { formatDateTime, humanize } from "@/lib/format";
import { MarkReadButton } from "@/components/MarkReadButton";

const COPY: Record<string, string> = {
  due_soon: "Reminder: this task is due within 24 hours.",
  overdue: "This task has passed its deadline and is still open.",
  backup_overdue: "You are the backup: the owner has not completed this task 24 hours after the deadline.",
  needs_help: "A caregiver asked for help with this task.",
};

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) return <p className="text-sm text-slate-600">Choose a demo identity first.</p>;
  const notifications = await listNotifications(user);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Notifications</h1>
      <p className="text-sm text-slate-600">
        In-app only for the hackathon. Each notice is created at most once per task and trigger, so re-running the
        scheduler never duplicates it.
      </p>
      {notifications.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-600">Nothing yet.</div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li key={n.id} className={`card flex items-start justify-between gap-3 p-4 ${n.readAt ? "opacity-60" : ""}`}>
              <div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold">{humanize(n.trigger)}</span>
                  <span className="text-xs text-slate-500">{formatDateTime(n.createdAt.toISOString())}</span>
                </div>
                <p className="text-sm text-slate-700">{COPY[n.trigger] ?? ""}</p>
                <Link href={`/episodes/${n.episode.id}#item-${n.item.id}`} className="text-sm text-teal-700 hover:underline">
                  {n.episode.patientName} → {n.item.title}
                </Link>
              </div>
              {!n.readAt ? <MarkReadButton id={n.id} /> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
