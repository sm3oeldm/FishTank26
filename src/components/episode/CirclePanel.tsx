"use client";

import { useEffect, useState } from "react";
import type { EpisodeView } from "@/lib/services/plan";
import { api } from "@/lib/client";
import { formatDateTime } from "@/lib/format";
import { StatusPill } from "@/components/StatusPill";
import { ErrorBanner } from "@/components/Toast";
import { useAction } from "./useAction";

type UserOption = { id: string; displayName: string; role: string };

export function CirclePanel({ view }: { view: EpisodeView }) {
  const { run, error, setError, busy } = useAction();
  const { episode, viewer, circle } = view;
  const [users, setUsers] = useState<UserOption[]>([]);
  const [inviteId, setInviteId] = useState("");
  const [inviteRole, setInviteRole] = useState<"patient" | "caregiver" | "backup">("caregiver");

  useEffect(() => {
    if (!viewer.canManageCircle) return;
    api<{ users: UserOption[] }>("/api/session")
      .then((r) => setUsers(r.users))
      .catch(() => setUsers([]));
  }, [viewer.canManageCircle]);

  const inCircle = new Set(circle.map((m) => m.id));
  const invitable = users.filter((u) => !inCircle.has(u.id) && u.id !== episode.reviewer.id);
  const myGrant = circle.find((m) => m.id === viewer.id);

  return (
    <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
      <section className="card p-4">
        <h2 className="font-semibold">Care circle</h2>
        <p className="mt-1 text-xs text-slate-500">
          Access is enforced on the server for every request. Revoking someone removes their access immediately and
          returns any of their open tasks to <em>unclaimed</em>.
        </p>
        <ul className="mt-3 divide-y divide-slate-100">
          <li className="flex items-center justify-between py-2 text-sm">
            <span>
              <span className="font-medium">{episode.reviewer.displayName}</span>
              <span className="ml-2 text-xs text-slate-500">can see the raw document</span>
            </span>
            <StatusPill value="reviewer" />
          </li>
          {circle.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span>
                <span className="font-medium">{m.displayName}</span>
                <span className="ml-2 text-xs text-slate-500">
                  {m.acceptedAt ? `joined ${formatDateTime(m.acceptedAt, episode.timeZone)}` : "invited — not yet accepted"}
                  {m.grantRole === "patient" ? " · can see the raw document" : " · sees approved plan only"}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <StatusPill value={m.grantRole} />
                {viewer.canManageCircle && m.id !== viewer.id ? (
                  <button
                    className="btn btn-sm btn-danger"
                    disabled={busy !== null}
                    onClick={() =>
                      void run("revoke", `/api/episodes/${episode.id}/circle`, { method: "DELETE", json: { userId: m.id } })
                    }
                  >
                    Revoke
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
        {myGrant && !myGrant.acceptedAt ? (
          <button
            className="btn btn-primary mt-3"
            disabled={busy !== null}
            onClick={() => void run("accept-invite", `/api/episodes/${episode.id}/circle`, { method: "PUT" })}
          >
            Accept my invitation
          </button>
        ) : null}
        <div className="mt-3">
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      </section>

      <div className="space-y-4">
        {viewer.canManageCircle ? (
          <form
            className="card space-y-2 p-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const result = await run("invite", `/api/episodes/${episode.id}/circle`, {
                method: "POST",
                json: { userId: inviteId, role: inviteRole },
              });
              if (result) setInviteId("");
            }}
          >
            <h2 className="font-semibold">Invite</h2>
            <select className="input" value={inviteId} onChange={(e) => setInviteId(e.target.value)} required>
              <option value="">Choose a person…</option>
              {invitable.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "patient" | "caregiver" | "backup")}
            >
              <option value="caregiver">Caregiver</option>
              <option value="backup">Backup caregiver</option>
              <option value="patient">Patient / authorised representative</option>
            </select>
            <button type="submit" className="btn btn-sm btn-primary" disabled={busy !== null || !inviteId}>
              Send invitation
            </button>
          </form>
        ) : null}

        {viewer.canManageCircle ? (
          <section className="card space-y-2 p-4">
            <h2 className="font-semibold">Sharing consent</h2>
            <p className="text-xs text-slate-500">
              The patient (or authorised representative) must agree to share the plan before it can be published.
            </p>
            <div className="flex items-center gap-2">
              <StatusPill value={episode.consentStatus} />
              {episode.consentStatus !== "granted" ? (
                <button
                  className="btn btn-sm btn-primary"
                  disabled={busy !== null}
                  onClick={() =>
                    void run("consent", `/api/episodes/${episode.id}/consent`, {
                      method: "POST",
                      json: { consentStatus: "granted" },
                    })
                  }
                >
                  Record consent
                </button>
              ) : (
                <button
                  className="btn btn-sm"
                  disabled={busy !== null}
                  onClick={() =>
                    void run("consent", `/api/episodes/${episode.id}/consent`, {
                      method: "POST",
                      json: { consentStatus: "withdrawn" },
                    })
                  }
                >
                  Withdraw
                </button>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
