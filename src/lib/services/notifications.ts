import type { User } from "@prisma/client";
import { prisma } from "../db";
import { now } from "../clock";
import { BACKUP_GRACE_MS, DUE_SOON_WINDOW_MS, type NotificationTrigger } from "../domain";
import { isOverdue } from "../task-state";
import type { TaskStatus } from "../domain";

export type NotificationInput = {
  episodeId: string;
  itemId: string;
  recipientId: string;
  trigger: NotificationTrigger;
  dedupeKey: string;
  at: Date;
};

/** Idempotent: the unique dedupeKey means re-running the scheduler never duplicates a notice. */
export async function createNotification(input: NotificationInput): Promise<boolean> {
  const existing = await prisma.notification.findUnique({ where: { dedupeKey: input.dedupeKey } });
  if (existing) return false;
  await prisma.notification.create({
    data: {
      episodeId: input.episodeId,
      itemId: input.itemId,
      recipientId: input.recipientId,
      trigger: input.trigger,
      dedupeKey: input.dedupeKey,
      createdAt: input.at,
    },
  });
  return true;
}

export type SchedulerResult = {
  ranAt: Date;
  created: { due_soon: number; overdue: number; backup_overdue: number };
};

/**
 * Evaluates every published, approved, open action against the (demo) clock:
 *  - due_soon        : owner, within 24h of the deadline
 *  - overdue         : owner (or reviewer when unclaimed), once the deadline passes
 *  - backup_overdue  : backup (or reviewer when none), 24h after the deadline
 */
export async function runScheduler(): Promise<SchedulerResult> {
  const ranAt = await now();
  const items = await prisma.planItem.findMany({
    where: {
      kind: "action",
      reviewStatus: "approved",
      status: { not: "done" },
      dueAt: { not: null },
      episode: { status: "published" },
    },
    include: { episode: { select: { reviewerId: true } } },
  });

  const created = { due_soon: 0, overdue: 0, backup_overdue: 0 };

  for (const item of items) {
    if (!item.dueAt) continue;
    const dueMs = item.dueAt.getTime();
    const nowMs = ranAt.getTime();
    const primary = item.ownerId ?? item.episode.reviewerId;

    if (item.ownerId && nowMs >= dueMs - DUE_SOON_WINDOW_MS && nowMs < dueMs) {
      const ok = await createNotification({
        episodeId: item.episodeId,
        itemId: item.id,
        recipientId: primary,
        trigger: "due_soon",
        dedupeKey: `due_soon:${item.id}:${dueMs}`,
        at: ranAt,
      });
      if (ok) created.due_soon++;
    }

    if (isOverdue({ dueAt: item.dueAt, status: item.status as TaskStatus }, ranAt)) {
      const ok = await createNotification({
        episodeId: item.episodeId,
        itemId: item.id,
        recipientId: primary,
        trigger: "overdue",
        dedupeKey: `overdue:${item.id}:${dueMs}`,
        at: ranAt,
      });
      if (ok) created.overdue++;

      if (nowMs >= dueMs + BACKUP_GRACE_MS) {
        const backupRecipient = item.backupId ?? item.episode.reviewerId;
        const okBackup = await createNotification({
          episodeId: item.episodeId,
          itemId: item.id,
          recipientId: backupRecipient,
          trigger: "backup_overdue",
          dedupeKey: `backup_overdue:${item.id}:${dueMs}`,
          at: ranAt,
        });
        if (okBackup) created.backup_overdue++;
      }
    }
  }

  return { ranAt, created };
}

export async function listNotifications(user: User) {
  return prisma.notification.findMany({
    where: { recipientId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      item: { select: { id: true, title: true, dueAt: true, status: true } },
      episode: { select: { id: true, patientName: true } },
    },
    take: 50,
  });
}

export async function markRead(user: User, notificationId: string) {
  const at = await now();
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, recipientId: user.id, readAt: null },
    data: { readAt: at },
  });
  return result.count > 0;
}
