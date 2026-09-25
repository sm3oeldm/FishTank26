import type { User } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db";
import { now } from "../clock";
import { DomainError, ITEM_KINDS } from "../domain";
import { assertDocumentViewer, assertReviewer, requireEpisodeAccess } from "../access";
import {
  extractDrafts,
  ingestPastedText,
  ingestPdf,
  validateDraft,
  validateDrafts,
  type ExtractedDocument,
} from "../extraction";
import { logActivity } from "./activity";

const PAGE_SEPARATOR = "\f";

export function documentToPages(extractedText: string): ExtractedDocument {
  return { pages: extractedText.split(PAGE_SEPARATOR) };
}

async function storeDocument(
  user: User,
  episodeId: string,
  fileName: string,
  doc: ExtractedDocument,
) {
  const at = await now();
  const document = await prisma.document.create({
    data: {
      episodeId,
      fileName,
      extractedText: doc.pages.join(PAGE_SEPARATOR),
      pageCount: doc.pages.length,
      uploadedAt: at,
    },
  });
  await logActivity({
    episodeId,
    actorId: user.id,
    eventType: "document_uploaded",
    note: fileName,
    at,
  });
  return document;
}

export async function uploadPdf(user: User, episodeId: string, fileName: string, bytes: Uint8Array) {
  const access = await requireEpisodeAccess(episodeId, user);
  assertReviewer(access);
  const doc = await ingestPdf(bytes);
  return storeDocument(user, episodeId, fileName || "discharge.pdf", doc);
}

export async function pasteText(user: User, episodeId: string, text: string) {
  const access = await requireEpisodeAccess(episodeId, user);
  assertReviewer(access);
  const doc = ingestPastedText(text);
  return storeDocument(user, episodeId, "pasted-text.txt", doc);
}

export async function getDocumentForViewer(user: User, episodeId: string) {
  const access = await requireEpisodeAccess(episodeId, user);
  assertDocumentViewer(access);
  return prisma.document.findFirst({
    where: { episodeId },
    orderBy: { uploadedAt: "desc" },
  });
}

export async function runExtraction(user: User, episodeId: string) {
  const access = await requireEpisodeAccess(episodeId, user);
  assertReviewer(access);
  if (access.episode.status === "published") {
    throw new DomainError("The plan is already published. Add reviewer-authored items instead.", 409);
  }
  const document = await prisma.document.findFirst({
    where: { episodeId },
    orderBy: { uploadedAt: "desc" },
  });
  if (!document) throw new DomainError("Upload or paste a discharge document first.", 409);

  const doc = documentToPages(document.extractedText);
  const outcome = await extractDrafts(doc);
  const validated = validateDrafts(outcome.candidates, doc);
  const at = await now();

  await prisma.$transaction(async (tx) => {
    await tx.planItem.deleteMany({
      where: { episodeId, reviewStatus: { in: ["pending", "rejected"] }, sourceType: { not: "reviewer_authored" } },
    });
    for (const v of validated) {
      await tx.planItem.create({
        data: {
          episodeId,
          kind: v.item.kind,
          title: v.item.title,
          draftText: v.item.plain_language_text,
          sourceQuote: v.item.source_quote,
          sourcePage: v.ok ? v.sourcePage : v.item.source_page,
          sourceType: outcome.source === "fixture" ? "fixture" : "extracted",
          reviewStatus: v.ok ? "pending" : "rejected",
          rejectionReason: v.ok ? null : v.reason,
          ambiguityReason: v.item.ambiguity_reason,
          dueAt: v.item.due_at ? new Date(v.item.due_at) : null,
        },
      });
    }
    await logActivity(
      {
        episodeId,
        actorId: user.id,
        eventType: "extraction_run",
        note: `${outcome.source}${outcome.model ? ` (${outcome.model})` : ""}: ${validated.filter((v) => v.ok).length} drafts, ${validated.filter((v) => !v.ok).length} rejected${outcome.fallbackReason ? ` — ${outcome.fallbackReason}` : ""}`,
        at,
      },
      tx,
    );
  });

  return {
    source: outcome.source,
    model: outcome.model,
    fallbackReason: outcome.fallbackReason,
    accepted: validated.filter((v) => v.ok).length,
    rejected: validated.filter((v) => !v.ok).length,
  };
}

export const patchItemSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  approvedText: z.string().trim().min(1).max(1000).optional(),
  kind: z.enum(ITEM_KINDS).optional(),
  dueAt: z.string().datetime({ offset: true }).nullable().optional(),
  ambiguityReason: z.string().trim().max(500).nullable().optional(),
  reviewStatus: z.enum(["pending", "approved", "removed"]).optional(),
  backupId: z.string().nullable().optional(),
});

export async function patchItem(
  user: User,
  episodeId: string,
  itemId: string,
  input: z.infer<typeof patchItemSchema>,
) {
  const access = await requireEpisodeAccess(episodeId, user);
  assertReviewer(access);
  const item = await prisma.planItem.findFirst({ where: { id: itemId, episodeId } });
  if (!item) throw new DomainError("Item not found.", 404);
  if (item.reviewStatus === "rejected" && input.reviewStatus === "approved") {
    throw new DomainError("A rejected draft cannot be approved; its quote is not in the document.", 409);
  }
  if (input.reviewStatus === "approved") {
    const kind = input.kind ?? item.kind;
    const dueAt = input.dueAt === undefined ? item.dueAt : input.dueAt;
    const ambiguity = input.ambiguityReason === undefined ? item.ambiguityReason : input.ambiguityReason || null;
    if (kind === "action" && !dueAt) throw new DomainError("Set a deadline before approving an action.", 422);
    if (ambiguity) throw new DomainError("Resolve the ambiguity flag before approving.", 422);
  }
  if (input.backupId) {
    const grant = await prisma.careCircleGrant.findFirst({
      where: { episodeId, userId: input.backupId, revokedAt: null },
    });
    if (!grant) throw new DomainError("Backup must be an active care-circle member.", 409);
  }

  const at = await now();
  const nextApprovedText =
    input.approvedText ?? (input.reviewStatus === "approved" ? item.approvedText ?? item.draftText : item.approvedText);

  const updated = await prisma.planItem.update({
    where: { id: itemId },
    data: {
      title: input.title,
      kind: input.kind,
      approvedText: nextApprovedText,
      dueAt: input.dueAt === undefined ? undefined : input.dueAt ? new Date(input.dueAt) : null,
      ambiguityReason: input.ambiguityReason === undefined ? undefined : input.ambiguityReason || null,
      reviewStatus: input.reviewStatus,
      backupId: input.backupId === undefined ? undefined : input.backupId,
    },
  });

  const eventType =
    input.reviewStatus === "approved"
      ? "item_approved"
      : input.reviewStatus === "removed"
        ? "item_removed"
        : "item_edited";
  await logActivity({ episodeId, itemId, actorId: user.id, eventType, at });
  return updated;
}

export const manualItemSchema = z.object({
  kind: z.enum(ITEM_KINDS),
  title: z.string().trim().min(1).max(120),
  text: z.string().trim().min(1).max(1000),
  sourceQuote: z.string().trim().max(1000).optional().default(""),
  reviewerAuthored: z.boolean().default(false),
  dueAt: z.string().datetime({ offset: true }).nullable().optional(),
});

/**
 * Reviewer-added items must either quote the document (validated like any
 * draft) or be explicitly labeled reviewer-authored.
 */
export async function addManualItem(
  user: User,
  episodeId: string,
  input: z.infer<typeof manualItemSchema>,
) {
  const access = await requireEpisodeAccess(episodeId, user);
  assertReviewer(access);
  if (!input.reviewerAuthored && !input.sourceQuote) {
    throw new DomainError("Attach a source quote or mark the item as reviewer-authored.", 422);
  }

  let reviewStatus: "pending" | "rejected" = "pending";
  let rejectionReason: string | null = null;
  let sourcePage: number | null = null;

  if (!input.reviewerAuthored) {
    const document = await prisma.document.findFirst({
      where: { episodeId },
      orderBy: { uploadedAt: "desc" },
    });
    if (!document) throw new DomainError("Upload a document before quoting it.", 409);
    const result = validateDraft(
      {
        kind: input.kind,
        title: input.title,
        plain_language_text: input.text,
        source_quote: input.sourceQuote,
        source_page: null,
        due_at: input.dueAt ?? null,
        ambiguity_reason: null,
        review_status: "pending",
      },
      documentToPages(document.extractedText),
    );
    if (result.ok) sourcePage = result.sourcePage;
    else {
      reviewStatus = "rejected";
      rejectionReason = result.reason;
    }
  }

  const at = await now();
  const item = await prisma.planItem.create({
    data: {
      episodeId,
      kind: input.kind,
      title: input.title,
      draftText: input.text,
      sourceQuote: input.reviewerAuthored ? "" : input.sourceQuote,
      sourcePage,
      sourceType: input.reviewerAuthored ? "reviewer_authored" : "extracted",
      reviewStatus,
      rejectionReason,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
    },
  });
  await logActivity({
    episodeId,
    itemId: item.id,
    actorId: user.id,
    eventType: reviewStatus === "rejected" ? "item_rejected" : "item_added",
    note: rejectionReason,
    at,
  });
  return item;
}
