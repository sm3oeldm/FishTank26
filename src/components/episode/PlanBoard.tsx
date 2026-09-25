"use client";

import { useState } from "react";
import type { EpisodeView, PlanItemView } from "@/lib/services/plan";
import { formatDateTime, relativeTo } from "@/lib/format";
import { StatusPill } from "@/components/StatusPill";
import { ErrorBanner } from "@/components/Toast";
import { useAction } from "./useAction";

export function PlanBoard({ view }: { view: EpisodeView }) {
  const published = view.episode.status === "published";
  const approved = view.items.filter((i) => i.reviewStatus === "approved");
  const actions = approved.filter((i) => i.kind === "action");
  const cards = approved.filter((i) => i.kind === "warning_sign");

  const groups: { title: string; items: PlanItemView[]; tone: string }[] = [
    { title: "Overdue", items: actions.filter((i) => i.overdue), tone: "text-rose-700" },
    { title: "Needs help", items: actions.filter((i) => i.status === "needs_help" && !i.overdue), tone: "text-amber-800" },
    { title: "Unclaimed", items: actions.filter((i) => i.status === "unclaimed" && !i.overdue), tone: "text-slate-700" },
    {
      title: "Awaiting acceptance",
      items: actions.filter((i) => i.status === "awaiting_acceptance" && !i.overdue),
      tone: "text-sky-700",
    },
    { title: "In progress", items: actions.filter((i) => i.status === "active" && !i.overdue), tone: "text-teal-700" },
    { title: "Done", items: actions.filter((i) => i.status === "done"), tone: "text-emerald-700" },
  ];

  if (!published && !view.viewer.canReview) {
    return (
      <div className="card p-8 text-center text-sm text-slate-600">
        The reviewer has not published this plan yet. You will see approved tasks and warning-sign cards here once it
        is published.
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-5">
        {!published ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Preview of approved items. Caregivers cannot see anything until you publish.
          </p>
        ) : null}
        {actions.length === 0 ? (
          <div className="card p-6 text-sm text-slate-600">No approved actions yet.</div>
        ) : null}
        {groups
          .filter((g) => g.items.length > 0)
          .map((g) => (
            <section key={g.title}>
              <h2 className={`mb-2 text-sm font-semibold uppercase tracking-wide ${g.tone}`}>
                {g.title} <span className="text-slate-400">({g.items.length})</span>
              </h2>
              <ul className="space-y-3">
                {g.items.map((item) => (
                  <TaskCard key={item.id} item={item} view={view} />
                ))}
              </ul>
            </section>
          ))}
      </div>
      <aside className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-rose-700">When to seek help</h2>
        <p className="text-xs text-slate-500">
          Informational cards approved by the reviewer. This app does not judge whether a symptom is safe — follow the
          card and contact the named service.
        </p>
        {cards.length === 0 ? <div className="card p-4 text-sm text-slate-600">No warning-sign cards approved.</div> : null}
        {cards.map((card) => (
          <div key={card.id} id={`item-${card.id}`} className="card border-rose-200 p-4">
            <h3 className="font-semibold text-rose-800">{card.title}</h3>
            <p className="mt-1 text-sm text-slate-800">{card.text}</p>
            <SourceQuote item={card} />
          </div>
        ))}
      </aside>
    </div>
  );
}

function SourceQuote({ item }: { item: PlanItemView }) {
  const [open, setOpen] = useState(false);
  if (item.sourceType === "reviewer_authored") {
    return <p className="mt-2 text-xs text-violet-700">Added by the reviewer (not from the discharge document).</p>;
  }
  return (
    <div className="mt-2">
      <button type="button" className="text-xs text-teal-700 hover:underline" onClick={() => setOpen((o) => !o)}>
        {open ? "Hide" : "Show"} source sentence{item.sourcePage ? ` (page ${item.sourcePage})` : ""}
      </button>
      {open ? <blockquote className="quote mt-1">“{item.sourceQuote}”</blockquote> : null}
    </div>
  );
}

function TaskCard({ item, view }: { item: PlanItemView; view: EpisodeView }) {
  const { run, error, setError, busy } = useAction();
  const { viewer, circle, episode } = view;
  const me = viewer.id;
  const isOwner = item.owner?.id === me;
  const isBackup = item.backup?.id === me;
  const isReviewer = viewer.membership === "reviewer";
  const isMember = viewer.membership !== "reviewer";
  const published = episode.status === "published";
  const [note, setNote] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [ownerId, setOwnerId] = useState(item.owner?.id ?? "");
  const [backupId, setBackupId] = useState(item.backup?.id ?? "");

  const transition = (event: string) =>
    run(event, `/api/episodes/${episode.id}/items/${item.id}/transition`, {
      method: "POST",
      json: { event, note: note || undefined },
    });

  const assignable = published && viewer.canManageCircle && (item.status === "unclaimed" || item.status === "awaiting_acceptance");
  const candidates = circle;

  return (
    <li id={`item-${item.id}`} className={`card p-4 ${item.overdue ? "border-rose-300" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{item.title}</h3>
          <p className="mt-1 text-sm text-slate-800">{item.text}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusPill value={item.overdue ? "overdue" : item.status} />
          <span className={`text-xs ${item.overdue ? "text-rose-700" : "text-slate-500"}`}>
            {formatDateTime(item.dueAt, episode.timeZone)} · {relativeTo(item.dueAt, view.now)}
          </span>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-slate-500">Owner</dt>
          <dd className="font-medium">{item.owner ? item.owner.displayName : <span className="text-slate-400">nobody yet</span>}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Backup</dt>
          <dd className="font-medium">{item.backup ? item.backup.displayName : <span className="text-slate-400">—</span>}</dd>
        </div>
        {item.outcomeDate ? (
          <div className="col-span-2">
            <dt className="text-slate-500">Reported done</dt>
            <dd>{formatDateTime(item.outcomeDate, episode.timeZone)} (self-reported by caregiver)</dd>
          </div>
        ) : null}
      </dl>

      <SourceQuote item={item} />

      {published ? (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap gap-1.5">
            {isMember && item.status === "unclaimed" ? (
              <button className="btn btn-sm btn-primary" disabled={busy !== null} onClick={() => void transition("claim")}>
                I&apos;ll do this
              </button>
            ) : null}
            {isOwner && item.status === "awaiting_acceptance" ? (
              <>
                <button className="btn btn-sm btn-primary" disabled={busy !== null} onClick={() => void transition("accept")}>
                  Accept
                </button>
                <button className="btn btn-sm" disabled={busy !== null} onClick={() => void transition("decline")}>
                  Decline
                </button>
              </>
            ) : null}
            {(isOwner || isBackup || isReviewer) && item.status === "active" ? (
              <>
                <button className="btn btn-sm btn-primary" disabled={busy !== null} onClick={() => void transition("complete")}>
                  Mark done
                </button>
                <button className="btn btn-sm" disabled={busy !== null} onClick={() => void transition("needs_help")}>
                  I need help
                </button>
              </>
            ) : null}
            {(isOwner || isBackup || isReviewer) && item.status === "needs_help" ? (
              <>
                <button className="btn btn-sm btn-primary" disabled={busy !== null} onClick={() => void transition("resume")}>
                  Resume
                </button>
                <button className="btn btn-sm" disabled={busy !== null} onClick={() => void transition("complete")}>
                  Mark done
                </button>
              </>
            ) : null}
            {(isOwner || isBackup || isReviewer) && (item.status === "unclaimed" || item.status === "awaiting_acceptance") ? (
              <button className="btn btn-sm" disabled={busy !== null} onClick={() => void transition("needs_help")}>
                Flag: needs help
              </button>
            ) : null}
            {isReviewer && item.status === "done" ? (
              <button className="btn btn-sm" disabled={busy !== null} onClick={() => void transition("reopen")}>
                Reopen
              </button>
            ) : null}
            {assignable ? (
              <button className="btn btn-sm" onClick={() => setAssignOpen((o) => !o)}>
                {item.owner ? "Reassign" : "Assign"}
              </button>
            ) : null}
          </div>
          {(isOwner || isBackup || isReviewer || (isMember && item.status === "unclaimed")) && item.status !== "done" ? (
            <input
              className="input py-1 text-xs"
              placeholder="Optional note for the activity log (e.g. pharmacy closed, will go tomorrow)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          ) : null}
          {assignOpen && assignable ? (
            <form
              className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_auto]"
              onSubmit={(e) => {
                e.preventDefault();
                void run("assign", `/api/episodes/${episode.id}/items/${item.id}/assign`, {
                  method: "POST",
                  json: { ownerId, backupId: backupId || null },
                }).then((r) => {
                  if (r) setAssignOpen(false);
                });
              }}
            >
              <label className="text-xs">
                <span className="label">Owner</span>
                <select className="input py-1" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} required>
                  <option value="">Choose…</option>
                  {candidates.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs">
                <span className="label">Backup (optional)</span>
                <select className="input py-1" value={backupId} onChange={(e) => setBackupId(e.target.value)}>
                  <option value="">None</option>
                  {candidates
                    .filter((m) => m.id !== ownerId)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.displayName}
                      </option>
                    ))}
                </select>
              </label>
              <button type="submit" className="btn btn-sm btn-primary self-end" disabled={busy !== null || !ownerId}>
                Save
              </button>
            </form>
          ) : null}
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      ) : null}
    </li>
  );
}
