"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { ErrorBanner } from "@/components/Toast";

export function NewEpisodeForm() {
  const router = useRouter();
  const [patientName, setPatientName] = useState("");
  const [dischargedAt, setDischargedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="card space-y-4 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const episode = await api<{ id: string }>("/api/episodes", {
            method: "POST",
            json: { patientName, dischargedAt: new Date(`${dischargedAt}T12:00:00`).toISOString(), timeZone: "Asia/Dubai" },
          });
          router.push(`/episodes/${episode.id}`);
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed");
          setBusy(false);
        }
      }}
    >
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <div>
        <label className="label" htmlFor="patientName">
          Patient display name (fictional)
        </label>
        <input
          id="patientName"
          className="input"
          value={patientName}
          onChange={(e) => setPatientName(e.target.value)}
          placeholder="e.g. Mariam A."
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="dischargedAt">
          Discharge date
        </label>
        <input
          id="dischargedAt"
          type="date"
          className="input"
          value={dischargedAt}
          onChange={(e) => setDischargedAt(e.target.value)}
          required
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? "Creating…" : "Create episode"}
      </button>
    </form>
  );
}
