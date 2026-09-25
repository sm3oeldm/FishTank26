"use client";

import { useState } from "react";
import type { EpisodeView, PlanItemView } from "@/lib/services/plan";
import { fromLocalInputValue, humanize, toLocalInputValue } from "@/lib/format";
import { StatusPill } from "@/components/StatusPill";
import { ErrorBanner } from "@/components/Toast";
import { useAction } from "./useAction";

type ExtractionSummary = {
  source: string;
  model: string | null;
  fallbackReason: string | null;
  accepted: number;
  rejected: number;
};

export function ReviewPanel({ view }: { view: EpisodeView }) {
  const published = view.episode.status === "published";
  const pending = view.items.filter((i) => i.reviewStatus === "pending");
  const approved = view.items.filter((i) => i.reviewStatus === "approved");
  const rejected = view.items.filter((i) => i.reviewStatus === "rejected");
  const removed = view.items.filter((i) => i.reviewStatus === "removed");

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_2fr]">
      <div className="space-y-4">
        <IngestPanel view={view} />
        <AddItemForm view={view} />
      </div>
      <div className="space-y-6">
        <p className="text-xs text-slate-500">
          Every draft keeps the exact sentence it came from. Drafts stay invisible to caregivers until approved and
          published. Items whose quote could not be found in the document are shown as rejected — never hidden.
        </p>
        <DraftSection title="Needs your decision" items={pending} view={view} tone="text-amber-800" open />
        <DraftSection title="Approved" items={approved} view={view} tone="text-emerald-700" open={!published} />
        <DraftSection title="Rejected by validator (quote not in document)" items={rejected} view={view} tone="text-rose-700" />
        <DraftSection title="Removed by reviewer" items={removed} view={view} tone="text-slate-500" />
      </div>
    </div>
  );
}

function IngestPanel({ view }: { view: EpisodeView }) {
  const { run, error, setError, busy } = useAction();
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"pdf" | "text">("pdf");
  const [summary, setSummary] = useState<ExtractionSummary | null>(null);
  const episodeId = view.episode.id;

  return (
    <section className="card space-y-3 p-4">
      <h2 className="font-semibold">1. Discharge document</h2>
      {view.hasDocument ? (
        <p className="text-sm text-emerald-700">
          Loaded: <span className="font-medium">{view.documentName}</span>
        </p>
      ) : (
        <p className="text-sm text-slate-600">Upload a digital-text PDF (≤10 MB) or paste the discharge text.</p>
      )}
      <div className="flex gap-1 text-xs">
        <button className={`btn btn-sm ${mode === "pdf" ? "btn-primary" : ""}`} onClick={() => setMode("pdf")}>
          PDF upload
        </button>
        <button className={`btn btn-sm ${mode === "text" ? "btn-primary" : ""}`} onClick={() => setMode("text")}>
          Paste text
        </button>
      </div>
      {mode === "pdf" ? (
        <form
          className="space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const input = form.elements.namedItem("file") as HTMLInputElement | null;
            const file = input?.files?.[0];
            if (!file) return;
            const body = new FormData();
            body.append("file", file);
            await run("upload", `/api/episodes/${episodeId}/document`, { method: "POST", body });
            form.reset();
          }}
        >
          <input name="file" type="file" accept="application/pdf" className="input" required />
          <button type="submit" className="btn btn-sm" disabled={busy !== null}>
            Upload PDF
          </button>
        </form>
      ) : (
        <form
          className="space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const result = await run("paste", `/api/episodes/${episodeId}/document`, { method: "POST", json: { text } });
            if (result) setText("");
          }}
        >
          <textarea
            className="input min-h-32 font-mono text-xs"
            placeholder="Paste the discharge instructions here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button type="submit" className="btn btn-sm" disabled={busy !== null || text.trim().length === 0}>
            Save pasted text
          </button>
        </form>
      )}

      <div className="border-t border-slate-100 pt-3">
        <h2 className="font-semibold">2. Extract draft items</h2>
        <p className="mt-1 text-xs text-slate-500">
          Proposes tasks and warning-sign cards with their exact source sentence. Re-running replaces undecided drafts
          only; approved and reviewer-authored items are kept.
        </p>
        <button
          className="btn btn-primary mt-2"
          disabled={busy !== null || !view.hasDocument || view.episode.status === "published"}
          onClick={async () => {
            const result = await run<ExtractionSummary>("extract", `/api/episodes/${episodeId}/extract`, { method: "POST" });
            if (result) setSummary(result);
          }}
        >
          {busy === "extract" ? "Extracting…" : "Run extraction"}
        </button>
        {summary ? (
          <p className="mt-2 text-xs text-slate-600">
            <StatusPill value={summary.source} label={summary.source === "fixture" ? "fixture extractor" : `LLM: ${summary.model}`} />{" "}
            {summary.accepted} draft(s) proposed, {summary.rejected} rejected by the quote validator.
            {summary.fallbackReason ? <span className="block text-amber-800">{summary.fallbackReason}</span> : null}
          </p>
        ) : null}
      </div>
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
    </section>
  );
}

function AddItemForm({ view }: { view: EpisodeView }) {
  const { run, error, setError, busy } = useAction();
  const [kind, setKind] = useState<"action" | "warning_sign">("action");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [sourceQuote, setSourceQuote] = useState("");
  const [reviewerAuthored, setReviewerAuthored] = useState(false);
  const [dueAt, setDueAt] = useState("");

  return (
    <form
      className="card space-y-2 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const result = await run("add-item", `/api/episodes/${view.episode.id}/items`, {
          method: "POST",
          json: {
            kind,
            title,
            text,
            sourceQuote: reviewerAuthored ? "" : sourceQuote,
            reviewerAuthored,
            dueAt: kind === "action" ? fromLocalInputValue(dueAt) : null,
          },
        });
        if (result) {
          setTitle("");
          setText("");
          setSourceQuote("");
          setDueAt("");
        }
      }}
    >
      <h2 className="font-semibold">Add an item manually</h2>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs">
          <span className="label">Kind</span>
          <select className="input py-1" value={kind} onChange={(e) => setKind(e.target.value as "action" | "warning_sign")}>
            <option value="action">Action / task</option>
            <option value="warning_sign">Warning-sign card</option>
          </select>
        </label>
        {kind === "action" ? (
          <label className="text-xs">
            <span className="label">Deadline</span>
            <input type="datetime-local" className="input py-1" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </label>
        ) : null}
      </div>
      <input className="input" placeholder="Short title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <textarea
        className="input min-h-16"
        placeholder="Plain-language instruction for caregivers"
        value={text}
        onChange={(e) => setText(e.target.value)}
        required
      />
      <label className="flex items-center gap-2 text-xs text-slate-700">
        <input type="checkbox" checked={reviewerAuthored} onChange={(e) => setReviewerAuthored(e.target.checked)} />
        Reviewer-authored (not quoted from the document — will be labeled as such)
      </label>
      {!reviewerAuthored ? (
        <textarea
          className="input min-h-16 text-xs"
          placeholder="Paste the exact sentence from the document (validated verbatim)"
          value={sourceQuote}
          onChange={(e) => setSourceQuote(e.target.value)}
          required
        />
      ) : null}
      <button type="submit" className="btn btn-sm" disabled={busy !== null}>
        Add as draft
      </button>
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
    </form>
  );
}

function DraftSection({
  title,
  items,
  view,
  tone,
  open = false,
}: {
  title: string;
  items: PlanItemView[];
  view: EpisodeView;
  tone: string;
  open?: boolean;
}) {
  const [expanded, setExpanded] = useState(open);
  return (
    <section>
      <button
        type="button"
        className={`mb-2 flex w-full items-center justify-between text-left text-sm font-semibold uppercase tracking-wide ${tone}`}
        onClick={() => setExpanded((v) => !v)}
      >
        <span>
          {title} <span className="text-slate-400">({items.length})</span>
        </span>
        <span className="text-xs text-slate-400">{expanded ? "hide" : "show"}</span>
      </button>
      {expanded ? (
        items.length === 0 ? (
          <p className="text-sm text-slate-500">None.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <DraftCard key={item.id} item={item} view={view} />
            ))}
          </ul>
        )
      ) : null}
    </section>
  );
}

function DraftCard({ item, view }: { item: PlanItemView; view: EpisodeView }) {
  const { run, error, setError, busy } = useAction();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [text, setText] = useState(item.approvedText ?? item.draftText);
  const [kind, setKind] = useState(item.kind);
  const [dueAt, setDueAt] = useState(toLocalInputValue(item.dueAt));
  const [clearAmbiguity, setClearAmbiguity] = useState(false);
  const published = view.episode.status === "published";
  const url = `/api/episodes/${view.episode.id}/items/${item.id}`;
  const decided = item.reviewStatus === "rejected" || item.reviewStatus === "removed";

  const save = async (reviewStatus?: "approved" | "pending") => {
    const result = await run("patch", url, {
      method: "PATCH",
      json: {
        title,
        approvedText: text,
        kind,
        dueAt: kind === "action" ? fromLocalInputValue(dueAt) : null,
        ambiguityReason: clearAmbiguity || !item.ambiguityReason ? null : item.ambiguityReason,
        reviewStatus,
      },
    });
    if (result) setEditing(false);
  };

  return (
    <li className={`card p-4 ${item.reviewStatus === "rejected" ? "border-rose-200 bg-rose-50/40" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          <StatusPill value={item.kind} />
          <StatusPill value={item.reviewStatus} />
          <StatusPill value={item.sourceType} label={item.sourceType === "fixture" ? "fixture extractor" : humanize(item.sourceType)} />
          {item.ambiguityReason ? <StatusPill value="pending" label="ambiguous" /> : null}
        </div>
        {!decided && !editing ? (
          <button className="btn btn-sm btn-ghost" onClick={() => setEditing(true)}>
            Edit
          </button>
        ) : null}
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="input min-h-20" value={text} onChange={(e) => setText(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs">
              <span className="label">Kind</span>
              <select className="input py-1" value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="action">Action / task</option>
                <option value="warning_sign">Warning-sign card</option>
              </select>
            </label>
            {kind === "action" ? (
              <label className="text-xs">
                <span className="label">Deadline</span>
                <input type="datetime-local" className="input py-1" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
              </label>
            ) : null}
          </div>
          {item.ambiguityReason ? (
            <label className="flex items-start gap-2 text-xs text-amber-900">
              <input type="checkbox" checked={clearAmbiguity} onChange={(e) => setClearAmbiguity(e.target.checked)} />
              <span>
                I have resolved this ambiguity: <em>{item.ambiguityReason}</em>
              </span>
            </label>
          ) : null}
          <div className="flex gap-1">
            <button className="btn btn-sm btn-primary" disabled={busy !== null} onClick={() => void save("approved")}>
              Save &amp; approve
            </button>
            <button className="btn btn-sm" disabled={busy !== null} onClick={() => void save()}>
              Save
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2">
          <h3 className="font-semibold">{item.title}</h3>
          <p className="text-sm text-slate-800">{item.approvedText ?? item.draftText}</p>
          {item.kind === "action" ? (
            <p className="mt-1 text-xs text-slate-500">
              Deadline: {item.dueAt ? new Date(item.dueAt).toLocaleString("en-GB", { timeZone: view.episode.timeZone }) : "not set"}
            </p>
          ) : null}
          {item.ambiguityReason ? (
            <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-900">Flagged: {item.ambiguityReason}</p>
          ) : null}
          {item.rejectionReason ? (
            <p className="mt-1 rounded bg-rose-50 px-2 py-1 text-xs text-rose-800">{item.rejectionReason}</p>
          ) : null}
        </div>
      )}

      {item.sourceType === "reviewer_authored" ? (
        <p className="mt-2 text-xs text-violet-700">Reviewer-authored — no document quote.</p>
      ) : (
        <blockquote className="quote mt-2">
          “{item.sourceQuote}”{item.sourcePage ? <span className="not-italic text-xs text-slate-500"> — page {item.sourcePage}</span> : null}
        </blockquote>
      )}

      {!editing && !decided ? (
        <div className="mt-3 flex flex-wrap gap-1 border-t border-slate-100 pt-3">
          {item.reviewStatus === "pending" ? (
            <button
              className="btn btn-sm btn-primary"
              disabled={busy !== null || Boolean(item.ambiguityReason) || (item.kind === "action" && !item.dueAt)}
              title={
                item.ambiguityReason
                  ? "Resolve the ambiguity via Edit first"
                  : item.kind === "action" && !item.dueAt
                    ? "Set a deadline via Edit first"
                    : undefined
              }
              onClick={() => void run("approve", url, { method: "PATCH", json: { reviewStatus: "approved" } })}
            >
              Approve
            </button>
          ) : null}
          {item.reviewStatus === "approved" && !published ? (
            <button className="btn btn-sm" disabled={busy !== null} onClick={() => void run("unapprove", url, { method: "PATCH", json: { reviewStatus: "pending" } })}>
              Back to draft
            </button>
          ) : null}
          <button className="btn btn-sm btn-danger" disabled={busy !== null} onClick={() => void run("remove", url, { method: "PATCH", json: { reviewStatus: "removed" } })}>
            Remove
          </button>
        </div>
      ) : null}
      {decided && item.reviewStatus === "removed" ? (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <button className="btn btn-sm" disabled={busy !== null} onClick={() => void run("restore", url, { method: "PATCH", json: { reviewStatus: "pending" } })}>
            Restore to drafts
          </button>
        </div>
      ) : null}
      <div className="mt-2">
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
      </div>
    </li>
  );
}
