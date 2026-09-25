import type { User } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db";
import { now } from "../clock";
import { DomainError, ForbiddenError } from "../domain";
import { assertCircleManager, assertReviewer, requireEpisodeAccess } from "../access";
import { logActivity } from "./activity";

export const createEpisodeSchema = z.object({
  patientName: z.string().trim().min(1).max(120),
  dischargedAt: z.string().datetime({ offset: true }),
  timeZone: z.string().trim().min(1).max(64).default("Asia/Dubai"),
});

export async function createEpisode(user: User, input: z.infer<typeof createEpisodeSchema>) {
  if (user.role !== "reviewer") throw new ForbiddenError("Only reviewers start episodes.");
  const at = await now();
  const episode = await prisma.episode.create({
    data: {
      patientName: input.patientName,
      dischargedAt: new Date(input.dischargedAt),
      timeZone: input.timeZone,
      reviewerId: user.id,
    },
  });
  await logActivity({ episodeId: episode.id, actorId: user.id, eventType: "episode_created", at });
  return episode;
}

export const consentSchema = z.object({
  consentStatus: z.enum(["granted", "withdrawn"]),
});

export async function recordConsent(
  user: User,
  episodeId: string,
  consentStatus: "granted" | "withdrawn",
) {
  const access = await requireEpisodeAccess(episodeId, user);
  assertCircleManager(access);
  const at = await now();
  const episode = await prisma.episode.update({
    where: { id: episodeId },
    data: { consentStatus },
  });
  await logActivity({
    episodeId,
    actorId: user.id,
    eventType: consentStatus === "granted" ? "consent_granted" : "consent_withdrawn",
    at,
  });
  return episode;
}

export type PublishBlocker = { code: string; message: string };

export async function publishBlockers(episodeId: string): Promise<PublishBlocker[]> {
  const episode = await prisma.episode.findUniqueOrThrow({
    where: { id: episodeId },
    include: { items: true, grants: { where: { revokedAt: null } } },
  });
  const blockers: PublishBlocker[] = [];
  if (episode.consentStatus !== "granted") {
    blockers.push({ code: "consent", message: "Sharing consent has not been recorded." });
  }
  const approved = episode.items.filter((i) => i.reviewStatus === "approved");
  if (approved.length === 0) {
    blockers.push({ code: "no_items", message: "Approve at least one item before publishing." });
  }
  const pending = episode.items.filter((i) => i.reviewStatus === "pending");
  if (pending.length > 0) {
    blockers.push({
      code: "pending",
      message: `${pending.length} draft item(s) still need a decision (approve, edit, or remove).`,
    });
  }
  const ambiguous = approved.filter((i) => i.ambiguityReason);
  if (ambiguous.length > 0) {
    blockers.push({
      code: "ambiguity",
      message: `${ambiguous.length} approved item(s) still carry an unresolved ambiguity flag.`,
    });
  }
  const undated = approved.filter((i) => i.kind === "action" && !i.dueAt);
  if (undated.length > 0) {
    blockers.push({ code: "due", message: `${undated.length} approved action(s) have no deadline.` });
  }
  return blockers;
}

export async function publishEpisode(user: User, episodeId: string) {
  const access = await requireEpisodeAccess(episodeId, user);
  assertReviewer(access);
  const blockers = await publishBlockers(episodeId);
  if (blockers.length > 0) {
    throw new DomainError(blockers.map((b) => b.message).join(" "), 409);
  }
  const at = await now();
  const episode = await prisma.episode.update({
    where: { id: episodeId },
    data: { status: "published" },
  });
  await logActivity({ episodeId, actorId: user.id, eventType: "plan_published", at });
  return episode;
}
