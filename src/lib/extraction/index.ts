import { fixtureExtract } from "./fixture-extractor";
import { geminiExtract, isGeminiConfigured } from "./gemini-extractor";
import { isOpenAIConfigured, openaiExtract } from "./openai-extractor";
import type { ExtractedDocument, ExtractionResult } from "./schema";

export type ExtractionOutcome = ExtractionResult & { fallbackReason: string | null };

function configuredLlm(): ((doc: ExtractedDocument) => Promise<ExtractionResult>) | null {
  if (isGeminiConfigured()) return geminiExtract;
  if (isOpenAIConfigured()) return openaiExtract;
  return null;
}

/**
 * Uses the LLM adapter when configured (Gemini preferred, then OpenAI); otherwise
 * (or on failure) falls back to the deterministic fixture extractor and reports
 * why, so the UI can label it.
 */
export async function extractDrafts(doc: ExtractedDocument): Promise<ExtractionOutcome> {
  const llm = configuredLlm();
  if (!llm) {
    return { ...fixtureExtract(doc), fallbackReason: "No LLM configured — fixture extractor used" };
  }
  try {
    return { ...(await llm(doc)), fallbackReason: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return { ...fixtureExtract(doc), fallbackReason: `LLM unavailable (${message}) — fixture extractor used` };
  }
}

export { validateDrafts, validateDraft, findQuotePage } from "./validator";
export { ingestPdf, ingestPastedText, MAX_UPLOAD_BYTES } from "./ingest";
export type { DraftItem, ExtractedDocument, ExtractionResult } from "./schema";
