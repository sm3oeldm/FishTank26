"use client";

import { useState } from "react";
import type { EpisodeView } from "@/lib/services/plan";
import { formatDate } from "@/lib/format";
import { StatusPill } from "@/components/StatusPill";
import { ErrorBanner } from "@/components/Toast";
import { DemoClock } from "./DemoClock";
import { PlanBoard } from "./PlanBoard";
import { ReviewPanel } from "./ReviewPanel";
import { CirclePanel } from "./CirclePanel";
import { ActivityFeed } from "./ActivityFeed";
import { DocumentViewer } from "./DocumentViewer";
import { useAction } from "./useAction";

type Tab = "plan" | "review" | "circle" | "document" | "activity";

export function EpisodeWorkspace({
  view,
  demoMode,
  clockOffsetMinutes,
}: {
  view: EpisodeView;
  demoMode: boolean;
  clockOffsetMinutes: number;
}) {
  const { episode, viewer } = view;
  const published = episode.status === "published";
  const [tab, setTab] = useState<Tab>(viewer.canReview && !published ? "review" : "plan");
  const { run, error, setError, busy } = useAction();

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: "plan", label: published ? "Shared plan" : "Plan preview", show: true },
    { id: "review", label: "Document review", show: viewer.canReview },
    { id: "circle", label: `Care circle (${view.circle.length})`, show: true },
    { id: "document", label: "Source document", show: viewer.canSeeDocument },
    { id: "activity", label: "Activity", show: true },
  ];

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{episode.patientName}</h1>
            <p className="text-sm text-slate-600">
              Discharged {formatDate(episode.dischargedAt, episode.timeZone)} · Reviewer {episode.reviewer.displayName}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <StatusPill value={episode.status} label={published ? "Published to care circle" : "Draft — not visible to caregivers"} />
              <StatusPill value={episode.consentStatus} label={`Consent: ${episode.consentStatus}`} />
              <StatusPill value={viewer.membership} label={`You: ${viewer.membership}`} />
            </div>
          </div>
          {viewer.canReview && !published ? (
            <div className="max-w-sm">
              <button
                className="btn btn-primary"
                disabled={busy !== null || (view.publishBlockers?.length ?? 0) > 0}
                onClick={() => void run("publish", `/api/episodes/${episode.id}/publish`, { method: "POST" })}
              >
                Publish plan to care circle
              </button>
              {view.publishBlockers && view.publishBlockers.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs text-amber-800">
                  {view.publishBlockers.map((b) => (
                    <li key={b.code}>• {b.message}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-emerald-700">All checks passed — ready to publish.</p>
              )}
            </div>
          ) : null}
        </div>
        <div className="mt-3">
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      </section>

      {demoMode && viewer.canReview ? (
        <DemoClock nowIso={view.now} offsetMinutes={clockOffsetMinutes} timeZone={episode.timeZone} />
      ) : null}

      <nav className="flex flex-wrap gap-1 border-b border-slate-200">
        {tabs
          .filter((t) => t.show)
          .map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
                tab === t.id ? "border-teal-700 text-teal-800" : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              {t.label}
            </button>
          ))}
      </nav>

      {tab === "plan" ? <PlanBoard view={view} /> : null}
      {tab === "review" && viewer.canReview ? <ReviewPanel view={view} /> : null}
      {tab === "circle" ? <CirclePanel view={view} /> : null}
      {tab === "document" && viewer.canSeeDocument ? <DocumentViewer episodeId={episode.id} /> : null}
      {tab === "activity" ? <ActivityFeed view={view} /> : null}
    </div>
  );
}
