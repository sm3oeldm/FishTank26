import { z } from "zod";
import { ITEM_KINDS } from "../domain";

export const draftItemSchema = z.object({
  kind: z.enum(ITEM_KINDS),
  title: z.string().trim().min(1).max(120),
  plain_language_text: z.string().trim().min(1).max(1000),
  source_quote: z.string().trim().min(1).max(1000),
  source_page: z.number().int().min(1).nullable(),
  due_at: z.string().datetime({ offset: true }).nullable(),
  ambiguity_reason: z.string().trim().max(500).nullable(),
  review_status: z.literal("pending"),
});

export type DraftItem = z.infer<typeof draftItemSchema>;

export const extractionResponseSchema = z.object({
  items: z.array(draftItemSchema).max(50),
});

export type ExtractionSource = "openai" | "fixture";

export type ExtractionResult = {
  source: ExtractionSource;
  model: string | null;
  candidates: DraftItem[];
};

export type ExtractedDocument = {
  pages: string[];
};
