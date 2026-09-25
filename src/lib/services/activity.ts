import type { Prisma } from "@prisma/client";
import { prisma } from "../db";

export type ActivityInput = {
  episodeId: string;
  itemId?: string | null;
  actorId: string;
  eventType: string;
  note?: string | null;
  at: Date;
};

export async function logActivity(
  input: ActivityInput,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return tx.activityEvent.create({
    data: {
      episodeId: input.episodeId,
      itemId: input.itemId ?? null,
      actorId: input.actorId,
      eventType: input.eventType,
      note: input.note ?? null,
      createdAt: input.at,
    },
  });
}
