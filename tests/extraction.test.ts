import "./setup-env";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { ingestPastedText, ingestPdf, extractDrafts, validateDrafts } from "@/lib/extraction";
import { FIXTURE_PAGES, FIXTURE_TEXT } from "@/lib/demo/fixture";
import { normalizeWhitespace } from "@/lib/extraction/validator";
import type { DraftItem } from "@/lib/extraction";

const fixturePdf = () =>
  new Uint8Array(readFileSync(resolve(process.cwd(), "fixtures/mariam-discharge-summary.pdf")));

const draft = (over: Partial<DraftItem>): DraftItem => ({
  kind: "action",
  title: "t",
  plain_language_text: "text",
  source_quote: "",
  source_page: null,
  due_at: null,
  ambiguity_reason: null,
  review_status: "pending",
  ...over,
});

describe("ingestion", () => {
  it("imports the fixture PDF as a 2-page digital-text document", async () => {
    const doc = await ingestPdf(fixturePdf());
    expect(doc.pages).toHaveLength(2);
    const all = normalizeWhitespace(doc.pages.join(" "));
    expect(all).toContain("Collect the discharge medications");
    expect(all).toContain("call 998");
  });

  it("rejects a PDF with no selectable text with the scanned-PDF message", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    const bytes = await pdf.save();
    await expect(ingestPdf(bytes)).rejects.toThrow(/no selectable text/i);
  });

  it("rejects non-PDF bytes, empty files and oversized uploads", async () => {
    await expect(ingestPdf(new TextEncoder().encode("hello world"))).rejects.toMatchObject({ status: 415 });
    await expect(ingestPdf(new Uint8Array(10 * 1024 * 1024 + 1))).rejects.toMatchObject({ status: 413 });
    await expect(ingestPdf(new Uint8Array(0))).rejects.toMatchObject({ status: 422 });
  });

  it("rejects empty pasted text", () => {
    expect(() => ingestPastedText("   ")).toThrow();
  });
});

describe("extraction (AI disabled -> deterministic fixture extractor)", () => {
  it("produces source-linked action and warning-sign drafts with page numbers", async () => {
    const doc = ingestPastedText(FIXTURE_TEXT);
    const out = await extractDrafts({ pages: FIXTURE_PAGES });
    expect(out.source).toBe("fixture");
    expect(out.fallbackReason).toMatch(/no llm configured/i);
    const kinds = new Set(out.candidates.map((i) => i.kind));
    expect(kinds.has("action")).toBe(true);
    expect(kinds.has("warning_sign")).toBe(true);
    const validated = validateDrafts(out.candidates, doc);
    expect(validated.length).toBeGreaterThanOrEqual(5);
    expect(validated.every((v) => v.ok)).toBe(true);
    for (const v of validated) {
      if (!v.ok) continue;
      expect(v.item.source_quote.length).toBeGreaterThan(10);
      expect(normalizeWhitespace(FIXTURE_TEXT)).toContain(normalizeWhitespace(v.item.source_quote));
      expect([1, 2]).toContain(v.sourcePage);
    }
  });

  it("rejects drafts whose quote is not verbatim in the document and flags unsupported doses", () => {
    const doc = ingestPastedText(FIXTURE_TEXT);
    const [notInDoc, badDose, ok] = validateDrafts(
      [
        draft({
          title: "Invented",
          plain_language_text: "Take 500 mg of something",
          source_quote: "This sentence does not exist in the discharge sheet.",
        }),
        draft({
          title: "Paracetamol",
          plain_language_text: "Take paracetamol 2 g every 6 hours",
          source_quote: "Take paracetamol 1 g every 6 hours as needed for pain, not more than 4 g in 24 hours.",
        }),
        draft({
          title: "Paracetamol",
          plain_language_text: "Take paracetamol 1 g every 6 hours if needed (max 4 g a day)",
          source_quote: "Take paracetamol 1 g every 6 hours as needed for pain, not more than 4 g in 24 hours.",
        }),
      ],
      doc,
    );
    expect(notInDoc.ok).toBe(false);
    if (!notInDoc.ok) expect(notInDoc.reason).toMatch(/not found/i);
    expect(badDose.ok).toBe(false);
    if (!badDose.ok) expect(badDose.reason).toMatch(/dose/i);
    expect(ok.ok).toBe(true);
  });
});
