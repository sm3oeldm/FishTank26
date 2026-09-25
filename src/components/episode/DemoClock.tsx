"use client";

import { formatDateTime } from "@/lib/format";
import { useAction } from "./useAction";
import { ErrorBanner } from "@/components/Toast";

type ClockResult = { now: string; offsetMinutes: number; created: { due_soon: number; overdue: number; backup_overdue: number } };

export function DemoClock({
  nowIso,
  offsetMinutes,
  timeZone,
}: {
  nowIso: string;
  offsetMinutes: number;
  timeZone: string;
}) {
  const { run, error, setError, busy } = useAction();
  const advance = (minutes: number) =>
    run<ClockResult>(`clock-${minutes}`, "/api/demo/clock", { method: "POST", json: { action: "advance", minutes } });

  return (
    <div className="card border-indigo-200 bg-indigo-50/60 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="label mb-0">Reviewer demo clock</span>
          <span className="font-mono text-slate-800">{formatDateTime(nowIso, timeZone)}</span>
          {offsetMinutes !== 0 ? (
            <span className="ml-2 text-xs text-indigo-700">(+{Math.round(offsetMinutes / 60)} h simulated)</span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1">
          <button className="btn btn-sm" disabled={busy !== null} onClick={() => void advance(60)}>
            +1 h
          </button>
          <button className="btn btn-sm" disabled={busy !== null} onClick={() => void advance(3 * 60)}>
            +3 h
          </button>
          <button className="btn btn-sm" disabled={busy !== null} onClick={() => void advance(24 * 60)}>
            +24 h
          </button>
          <button className="btn btn-sm" disabled={busy !== null} onClick={() => void advance(2 * 24 * 60)}>
            +2 d
          </button>
          <button
            className="btn btn-sm btn-ghost"
            disabled={busy !== null}
            onClick={() => void run("clock-reset", "/api/demo/clock", { method: "POST", json: { action: "reset" } })}
          >
            reset
          </button>
          <button
            className="btn btn-sm btn-danger"
            disabled={busy !== null}
            onClick={() => {
              if (confirm("Reset the whole demo dataset? This wipes all episodes and re-seeds Mariam.")) {
                void run("demo-reset", "/api/demo/reset", { method: "POST" });
              }
            }}
          >
            re-seed demo
          </button>
        </div>
      </div>
      <p className="mt-1 text-xs text-indigo-800">
        Advancing the clock also runs the reminder scheduler (24 h reminder → overdue → backup after 24 h grace).
      </p>
      <div className="mt-2">
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
      </div>
    </div>
  );
}
