import type { DraftItem, ExtractedDocument, ExtractionResult } from "./schema";

const ACTION_VERBS =
  /^(please\s+)?(collect|pick up|arrange|book|schedule|attend|complete|return|bring|visit|take|keep|change|remove|call|contact|make|continue|start|stop|avoid|check|record|measure|weigh|drink|rest|see|go|do\s+not)\b/i;

const WARNING_OPENER = /^(if|should|in case|seek|go to the emergency|call 999|call 998|contact the hospital)/i;
const WARNING_ROUTE = /\b(contact|call|phone|ring|emergency|return to|go to|seek)\b/i;

const RELATIVE_DATE =
  /\b(today|tomorrow|tonight|within\s+\d+\s+(day|days|week|weeks|hour|hours)|in\s+\d+\s+(day|days|week|weeks)|next\s+(week|month)|before\s+your|after\s+\d+\s+(day|days|week|weeks)|daily|every\s+(day|morning|evening|night))\b/i;
const NAMED_CONTACT_GAP = /\b(number on this sheet|the number provided|as advised|as instructed)\b/i;

export function splitSentences(text: string): string[] {
  return text
    .replace(/\r/g, "")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.replace(/^[\-\u2022*\d.)\s]+/, "").trim())
    .filter((s) => s.length > 3);
}

function titleFor(sentence: string): string {
  const words = sentence.replace(/[.!?]+$/, "").split(/\s+/);
  const short = words.slice(0, 6).join(" ");
  return short.length < sentence.length - 1 ? `${short}…` : short;
}

/**
 * Deterministic, rule-based extractor used when no LLM is configured. It
 * proposes candidates only from sentences that literally exist in the document,
 * so its output is labeled "fixture" in the review UI.
 */
export function fixtureExtract(doc: ExtractedDocument): ExtractionResult {
  const candidates: DraftItem[] = [];
  doc.pages.forEach((page, index) => {
    for (const sentence of splitSentences(page)) {
      const isWarning =
        (WARNING_OPENER.test(sentence) || /\bif\b/i.test(sentence)) && WARNING_ROUTE.test(sentence);
      const isAction = !isWarning && ACTION_VERBS.test(sentence);
      if (!isWarning && !isAction) continue;

      let ambiguity: string | null = null;
      if (isAction && RELATIVE_DATE.test(sentence)) {
        ambiguity = "Relative date — reviewer must confirm the deadline against the discharge date";
      }
      if (isWarning && NAMED_CONTACT_GAP.test(sentence)) {
        ambiguity = "Contact route refers to the sheet — reviewer must confirm the exact contact instruction";
      }

      candidates.push({
        kind: isWarning ? "warning_sign" : "action",
        title: titleFor(sentence),
        plain_language_text: sentence,
        source_quote: sentence,
        source_page: index + 1,
        due_at: null,
        ambiguity_reason: ambiguity,
        review_status: "pending",
      });
    }
  });
  return { source: "fixture", model: null, candidates };
}
