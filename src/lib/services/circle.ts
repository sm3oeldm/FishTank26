import type { User } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db";
import { now } from "../clock";
import { DomainError, GRANT_ROLES } from "../domain";
import { assertCircleManager, requireEpisodeAccess } from "../access";
import { logActivity } from "./activity";

export const inviteSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(GRANT_ROLES),
});

export async function inviteToCircle(
  user: User,
  episodeId: string,
  input: z.infer<typeof inviteSchema>,
) {
  const access = await requireEpisodeAccess(episodeId, user);
  assertCircleManager(access);
  const invitee = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!invitee) throw new DomainError("Unknown user.", 404);
  if (invitee.id === access.episode.reviewerId) {
    throw new DomainError("The reviewer already has access.", 409);
  }
  const at = await now();
  const grant = await prisma.careCircleGrant.upsert({
    where: { episodeId_userId: { episodeId, userId: input.userId } },
    create: { episodeId, userId: input.userId, role: input.role, invitedAt: at },
    update: { role: input.role, invitedAt: at, revokedAt: null, acceptedAt: null },
  });
  await logActivity({
    episodeId,
    actorId: user.id,
    eventType: "caregiver_invited",
    note: `${invitee.displayName} as ${input.role}`,
    at,
  });
  return grant;
}

export async function acceptInvitation(user: User, episodeId: string) {
  const grant = await prisma.careCircleGrant.findFirst({
    where: { episodeId, userId: user.id, revokedAt: null },
  });
  if (!grant) throw new DomainError("No pending invitation.", 404);
  const at = await now();
  const updated = await prisma.careCircleGrant.update({
    where: { id: grant.id },
    data: { acceptedAt: grant.acceptedAt ?? at },
  });
  await logActivity({ episodeId, actorId: user.id, eventType: "invitation_accepted", at });
  return updated;
}

export async function revokeFromCircle(user: User, episodeId: string, targetUserId: string) {
  const access = await requireEpisodeAccess(episodeId, user);
  assertCircleManager(access);
  const grant = await prisma.careCircleGrant.findFirst({
    where: { episodeId, userId: targetUserId, revokedAt: null },
    include: { user: true },
  });
  if (!grant) throw new DomainError("That person is not in the care circle.", 404);
  if (grant.role === "patient" && access.membership.kind !== "reviewer") {
    throw new DomainError("Only the reviewer can remove the patient.", 403);
  }
  const at = await now();
  await prisma.$transaction([
    prisma.careCircleGrant.update({ where: { id: grant.id }, data: { revokedAt: at } }),
    prisma.planItem.updateMany({
      where: { episodeId, ownerId: targetUserId, status: { in: ["awaiting_acceptance", "active"] } },
      data: { ownerId: null, status: "unclaimed" },
    }),
    prisma.planItem.updateMany({
      where: { episodeId, backupId: targetUserId },
      data: { backupId: null },
    }),
  ]);
  await logActivity({
    episodeId,
    actorId: user.id,
    eventType: "caregiver_revoked",
    note: grant.user.displayName,
    at,
  });
}
