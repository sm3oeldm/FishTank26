import { z } from "zod";
import { ITEM_KINDS } from "../domain";

const ISO_DATETIME = z.string().datetime({ offset: true });

/** LLMs often return dates without seconds or offset; normalise anything parseable, drop the rest. */
const dueAtSchema = z.preprocess((value) => {
  if (typeof value !== "string" || value.trim() === "") return null;
  if (ISO_DATETIME.safeParse(value).success) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}, ISO_DATETIME.nullable());

export const draftItemSchema = z.object({
  kind: z.enum(ITEM_KINDS),
  title: z.string().trim().min(1).max(120),
  plain_language_text: z.string().trim().min(1).max(1000),
  source_quote: z.string().trim().min(1).max(1000),
  source_page: z.number().int().min(1).nullable(),
  due_at: dueAtSchema,
  ambiguity_reason: z.string().trim().max(500).nullable().default(null),
  review_status: z.literal("pending").default("pending"),
});

export type DraftItem = z.infer<typeof draftItemSchema>;

export const extractionResponseSchema = z.object({
  items: z.array(draftItemSchema).max(50),
});

export type ExtractionSource = "gemini" | "openai" | "fixture";

export type ExtractionResult = {
  source: ExtractionSource;
  model: string | null;
  candidates: DraftItem[];
};

export type ExtractedDocument = {
  pages: string[];
};
