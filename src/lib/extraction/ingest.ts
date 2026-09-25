import { extractText } from "unpdf";
import { DomainError } from "../domain";
import type { ExtractedDocument } from "./schema";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MIN_TEXT_CHARS = 40;

export class UnreadablePdfError extends DomainError {
  constructor() {
    super(
      "This PDF has no selectable text (it may be a scan). Paste the discharge text instead.",
      422,
    );
    this.name = "UnreadablePdfError";
  }
}

export function ingestPastedText(text: string): ExtractedDocument {
  const cleaned = text.replace(/\r\n/g, "\n").trim();
  if (cleaned.length < MIN_TEXT_CHARS) {
    throw new DomainError("Paste the full discharge text (at least a few sentences).", 422);
  }
  const pages = cleaned
    .split(/\f/)
    .map((p) => p.trim())
    .filter(Boolean);
  return { pages: pages.length ? pages : [cleaned] };
}

export async function ingestPdf(bytes: Uint8Array): Promise<ExtractedDocument> {
  if (bytes.byteLength === 0) throw new DomainError("The uploaded file is empty.", 422);
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new DomainError("PDFs must be 10 MB or smaller.", 413);
  }
  const header = new TextDecoder().decode(bytes.subarray(0, 5));
  if (header !== "%PDF-") throw new DomainError("Only PDF files or pasted text are accepted.", 415);

  let result: { totalPages: number; text: string[] };
  try {
    result = await extractText(bytes, { mergePages: false });
  } catch {
    throw new DomainError("The PDF could not be parsed. Paste the discharge text instead.", 422);
  }
  const pages = result.text.map((p) => p.replace(/[ \t]+\n/g, "\n").trim());
  const total = pages.join("").replace(/\s+/g, "").length;
  if (total < MIN_TEXT_CHARS) throw new UnreadablePdfError();
  return { pages };
}
