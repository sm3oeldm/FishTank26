import { SYSTEM_PROMPT, pagesAsUserContent } from "./prompt";
import { extractionResponseSchema, type ExtractedDocument, type ExtractionResult } from "./schema";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODELS = ["gemini-3-flash-preview", "gemini-3.1-flash-lite-preview", "gemini-flash-latest"];
const RETRYABLE = new Set([429, 500, 503]);
const ATTEMPTS_PER_MODEL = 2;

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string };
}

class GeminiHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(`Gemini ${status}: ${message}`);
  }
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function candidateModels(): string[] {
  const preferred = process.env.GEMINI_MODEL;
  return preferred ? [preferred, ...DEFAULT_MODELS.filter((m) => m !== preferred)] : DEFAULT_MODELS;
}

async function generate(model: string, doc: ExtractedDocument): Promise<string> {
  const res = await fetch(`${GEMINI_ENDPOINT}/${model}:generateContent`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY ?? "",
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: pagesAsUserContent(doc.pages) }] }],
      generationConfig: { temperature: 0, responseMimeType: "application/json" },
    }),
  });
  const body = (await res.json()) as GeminiResponse;
  if (!res.ok) throw new GeminiHttpError(res.status, body.error?.message ?? "request failed");
  return body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "{}";
}

async function generateWithFallback(doc: ExtractedDocument): Promise<{ model: string; raw: string }> {
  let lastError: unknown;
  for (const model of candidateModels()) {
    for (let attempt = 1; attempt <= ATTEMPTS_PER_MODEL; attempt++) {
      try {
        return { model, raw: await generate(model, doc) };
      } catch (error) {
        lastError = error;
        if (!(error instanceof GeminiHttpError) || !RETRYABLE.has(error.status)) break;
        if (attempt < ATTEMPTS_PER_MODEL) await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Gemini request failed");
}

export async function geminiExtract(doc: ExtractedDocument): Promise<ExtractionResult> {
  const { model, raw } = await generateWithFallback(doc);
  const parsed = extractionResponseSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error(`Extractor returned an invalid shape: ${parsed.error.message}`);
  }
  return { source: "gemini", model, candidates: parsed.data.items };
}
