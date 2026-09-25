"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type Doc = { fileName: string; pageCount: number; pages: string[]; uploadedAt: string };

export function DocumentViewer({ episodeId }: { episodeId: string }) {
  const [doc, setDoc] = useState<Doc | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ document: Doc | null }>(`/api/episodes/${episodeId}/document`)
      .then((r) => setDoc(r.document))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [episodeId]);

  if (error) return <p className="text-sm text-rose-700">{error}</p>;
  if (doc === undefined) return <p className="text-sm text-slate-500">Loading document…</p>;
  if (doc === null) return <div className="card p-6 text-sm text-slate-600">No document uploaded yet.</div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        <span className="font-medium">{doc.fileName}</span> · {doc.pageCount} page(s). Visible to the reviewer and the
        patient only; caregivers see approved items and their source sentences instead.
      </p>
      {doc.pages.map((page, i) => (
        <article key={i} className="card p-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Page {i + 1}</h3>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800">{page}</pre>
        </article>
      ))}
    </div>
  );
}
