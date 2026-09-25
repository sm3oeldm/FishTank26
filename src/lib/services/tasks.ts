import type { PlanItem, User } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db";
import { now } from "../clock";
import { DomainError, type TaskStatus } from "../domain";
import { assertReviewer, requireEpisodeAccess, type EpisodeAccess } from "../access";
import { nextStatus, type TaskEvent } from "../task-state";
import { logActivity } from "./activity";
import { createNotification } from "./notifications";

async function loadPublishedItem(episodeId: string, itemId: string): Promise<PlanItem> {
  const item = await prisma.planItem.findFirst({ where: { id: itemId, episodeId } });
  if (!item) throw new DomainError("Item not found.", 404);
  if (item.reviewStatus !== "approved") {
    throw new DomainError("Only approved items can be worked on.", 409);
  }
  if (item.kind !== "action") {
    throw new DomainError("Warning-sign cards are informational and have no task state.", 409);
  }
  return item;
}

function requirePublished(access: EpisodeAccess): void {
  if (access.episode.status !== "published") {
    throw new DomainError("The plan has not been published yet.", 409);
  }
}

async function isEligibleCaregiver(episodeId: string, userId: string): Promise<boolean> {
  const grant = await prisma.careCircleGrant.findFirst({
    where: { episodeId, userId, revokedAt: null, role: { in: ["caregiver", "backup", "patient"] } },
  });
  return grant !== null;
}

export const assignSchema = z.object({
  ownerId: z.string().min(1),
  backupId: z.string().nullable().optional(),
});

export async function assignTask(
  user: User,
  episodeId: string,
  itemId: string,
  input: z.infer<typeof assignSchema>,
) {
  const access = await requireEpisodeAccess(episodeId, user);
  if (!access.canManageCircle) {
    throw new DomainError("Only the reviewer or patient can assign tasks.", 403);
  }
  const item = await loadPublishedItem(episodeId, itemId);
  if (!(await isEligibleCaregiver(episodeId, input.ownerId))) {
    throw new DomainError("Owner must be an active care-circle member.", 409);
  }
  if (input.backupId && !(await isEligibleCaregiver(episodeId, input.backupId))) {
    throw new DomainError("Backup must be an active care-circle member.", 409);
  }
  if (input.backupId && input.backupId === input.ownerId) {
    throw new DomainError("Backup must be a different person from the owner.", 409);
  }
  const from: TaskStatus = item.status === "done" ? "done" : "unclaimed";
  const status = from === "unclaimed" ? nextStatus("unclaimed", "assign") : item.status;
  if (item.status !== "unclaimed" && item.status !== "awaiting_acceptance") {
    throw new DomainError(`Cannot reassign a task that is ${item.status.replace("_", " ")}.`, 409);
  }
  const at = await now();
  const owner = await prisma.user.findUniqueOrThrow({ where: { id: input.ownerId } });
  const updated = await prisma.planItem.update({
    where: { id: itemId },
    data: {
      ownerId: input.ownerId,
      backupId: input.backupId === undefined ? item.backupId : input.backupId,
      status: status as TaskStatus,
    },
  });
  await logActivity({
    episodeId,
    itemId,
    actorId: user.id,
    eventType: "task_assigned",
    note: `Assigned to ${owner.displayName}`,
    at,
  });
  return updated;
}

export const transitionSchema = z.object({
  event: z.enum(["claim", "accept", "decline", "complete", "needs_help", "resume", "reopen"]),
  note: z.string().trim().max(500).optional(),
  outcomeDate: z.string().datetime({ offset: true }).nullable().optional(),
});

export async function transitionTask(
  user: User,
  episodeId: string,
  itemId: string,
  input: z.infer<typeof transitionSchema>,
) {
  const access = await requireEpisodeAccess(episodeId, user);
  requirePublished(access);
  const item = await loadPublishedItem(episodeId, itemId);
  const event: TaskEvent = input.event;
  const isReviewer = access.membership.kind === "reviewer";
  const isOwner = item.ownerId === user.id;
  const isBackup = item.backupId === user.id;

  switch (event) {
    case "reopen":
      if (!isReviewer) throw new DomainError("Only the reviewer can reopen a completed task.", 403);
      break;
    case "claim":
      if (isReviewer) throw new DomainError("Reviewers assign tasks rather than claiming them.", 403);
      if (!(await isEligibleCaregiver(episodeId, user.id))) {
        throw new DomainError("Only care-circle members can claim tasks.", 403);
      }
      break;
    case "accept":
    case "decline":
      if (!isOwner) throw new DomainError("Only the assigned person can respond to this task.", 403);
      break;
    case "complete":
    case "needs_help":
    case "resume":
      if (!isOwner && !isBackup && !isReviewer) {
        throw new DomainError("Only the owner, backup, or reviewer can update this task.", 403);
      }
      break;
  }

  const status = nextStatus(item.status as TaskStatus, event);
  const at = await now();
  const data: {
    status: TaskStatus;
    ownerId?: string | null;
    outcomeDate?: Date | null;
  } = { status };
  if (event === "claim") data.ownerId = user.id;
  if (event === "decline") data.ownerId = null;
  if (event === "complete") data.outcomeDate = input.outcomeDate ? new Date(input.outcomeDate) : at;
  if (event === "reopen") data.outcomeDate = null;

  const updated = await prisma.planItem.update({ where: { id: itemId }, data });
  await logActivity({
    episodeId,
    itemId,
    actorId: user.id,
    eventType: `task_${event}`,
    note: input.note ?? null,
    at,
  });

  if (event === "needs_help") {
    const recipients = new Set<string>([access.episode.reviewerId]);
    if (item.backupId) recipients.add(item.backupId);
    recipients.delete(user.id);
    for (const recipientId of recipients) {
      await createNotification({
        episodeId,
        itemId,
        recipientId,
        trigger: "needs_help",
        dedupeKey: `needs_help:${itemId}:${recipientId}:${at.getTime()}`,
        at,
      });
    }
  }
  return updated;
}

export async function reviewerReopen(user: User, episodeId: string, itemId: string, note?: string) {
  const access = await requireEpisodeAccess(episodeId, user);
  assertReviewer(access);
  return transitionTask(user, episodeId, itemId, { event: "reopen", note });
}
