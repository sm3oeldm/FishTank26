import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listEpisodes } from "@/lib/services/plan";
import { StatusPill } from "@/components/StatusPill";
import { formatDate } from "@/lib/format";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <h1 className="text-xl font-semibold">Welcome to Caregiver Handoff</h1>
        <p className="mt-2 text-sm text-slate-600">
          Pick a demo identity from the top-right menu to continue. Try <strong>Nurse Layla</strong> to review a
          discharge document, <strong>Omar</strong> or <strong>Sara</strong> to act as caregivers, or{" "}
          <strong>Khalid</strong> to see what an uninvited person gets (nothing).
        </p>
      </div>
    );
  }
  const episodes = await listEpisodes(user);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Your episodes</h1>
          <p className="text-sm text-slate-600">
            Signed in as <strong>{user.displayName}</strong>. You only see episodes where you are the reviewer or an
            active care-circle member.
          </p>
        </div>
        {user.role === "reviewer" ? (
          <Link href="/episodes/new" className="btn btn-primary">
            + New discharge episode
          </Link>
        ) : null}
      </div>

      {episodes.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-600">
          No episodes are shared with you. If you were expecting one, the patient or reviewer must invite you to the
          care circle first — guessing a link will not work.
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {episodes.map((e) => (
            <li key={e.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link href={`/episodes/${e.id}`} className="text-lg font-semibold hover:text-teal-700">
                    {e.patientName}
                  </Link>
                  <p className="text-xs text-slate-500">Discharged {formatDate(e.dischargedAt)}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-1">
                  <StatusPill value={e.status} />
                  <StatusPill value={e.membership} />
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-lg bg-slate-50 p-2">
                  <dt className="text-xs text-slate-500">Open tasks</dt>
                  <dd className="text-lg font-semibold">{e.openTasks}</dd>
                </div>
                <div className={`rounded-lg p-2 ${e.overdueTasks > 0 ? "bg-rose-50" : "bg-slate-50"}`}>
                  <dt className="text-xs text-slate-500">Overdue</dt>
                  <dd className={`text-lg font-semibold ${e.overdueTasks > 0 ? "text-rose-700" : ""}`}>
                    {e.overdueTasks}
                  </dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <dt className="text-xs text-slate-500">{e.membership === "reviewer" ? "Drafts to review" : "Consent"}</dt>
                  <dd className="text-lg font-semibold">
                    {e.membership === "reviewer" ? e.pendingDrafts : <StatusPill value={e.consentStatus} />}
                  </dd>
                </div>
              </dl>
              <Link href={`/episodes/${e.id}`} className="btn mt-4 w-full justify-center">
                Open {e.status === "published" ? "shared plan" : "review workspace"}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
