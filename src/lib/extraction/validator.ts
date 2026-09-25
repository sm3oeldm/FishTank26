import type { DraftItem, ExtractedDocument } from "./schema";

export type ValidatedItem =
  | { ok: true; item: DraftItem; sourcePage: number }
  | { ok: false; item: DraftItem; reason: string };

export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeQuotes(text: string): string {
  return text.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
}

function canonical(text: string): string {
  return normalizeQuotes(normalizeWhitespace(text));
}

export function findQuotePage(quote: string, doc: ExtractedDocument): number | null {
  const needle = canonical(quote);
  if (!needle) return null;
  for (let i = 0; i < doc.pages.length; i++) {
    if (canonical(doc.pages[i]).includes(needle)) return i + 1;
  }
  return null;
}

const DOSE_PATTERN = /\b\d+(\.\d+)?\s?(mg|mcg|µg|ug|ml|g|units?|iu|tablets?|caps(ules)?)\b/gi;

function doses(text: string): string[] {
  return (text.match(DOSE_PATTERN) ?? []).map((d) => d.replace(/\s+/g, "").toLowerCase());
}

/** Every dose mentioned in the plain-language text must appear verbatim in the quoted source. */
function hasUnsupportedDose(item: DraftItem): boolean {
  const quoted = new Set(doses(item.source_quote));
  return doses(item.plain_language_text).some((d) => !quoted.has(d));
}

/**
 * Every draft must quote the uploaded document verbatim (whitespace and curly
 * quotes normalized). A draft whose quote is not in the document is kept and
 * surfaced as rejected so the reviewer can see the safety mechanism fire.
 */
export function validateDraft(item: DraftItem, doc: ExtractedDocument): ValidatedItem {
  if (!item.source_quote.trim()) {
    return { ok: false, item, reason: "rejected — empty source quote" };
  }
  const page = findQuotePage(item.source_quote, doc);
  if (page === null) {
    return { ok: false, item, reason: "rejected — source quote not found in document" };
  }
  if (hasUnsupportedDose(item)) {
    return { ok: false, item, reason: "rejected — dose not present in source quote" };
  }
  return { ok: true, item, sourcePage: page };
}

export function validateDrafts(items: DraftItem[], doc: ExtractedDocument): ValidatedItem[] {
  return items.map((item) => validateDraft(item, doc));
}
