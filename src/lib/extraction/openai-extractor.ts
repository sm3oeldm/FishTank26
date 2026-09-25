import OpenAI from "openai";
import { SYSTEM_PROMPT, pagesAsUserContent } from "./prompt";
import { extractionResponseSchema, type ExtractedDocument, type ExtractionResult } from "./schema";

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function openaiExtract(doc: ExtractedDocument): Promise<ExtractionResult> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const userContent = pagesAsUserContent(doc.pages);

  const completion = await client.chat.completions.create({
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = extractionResponseSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error(`Extractor returned an invalid shape: ${parsed.error.message}`);
  }
  return { source: "openai", model, candidates: parsed.data.items };
}
