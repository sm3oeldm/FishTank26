import type { CareCircleGrant, Episode, User } from "@prisma/client";
import { prisma } from "./db";
import { ForbiddenError, NotFoundError } from "./domain";

export type Membership =
  | { kind: "reviewer" }
  | { kind: "patient"; grant: CareCircleGrant }
  | { kind: "caregiver"; grant: CareCircleGrant }
  | { kind: "backup"; grant: CareCircleGrant };

export type EpisodeAccess = {
  episode: Episode;
  user: User;
  membership: Membership;
  canSeeDocument: boolean;
  canReview: boolean;
  canManageCircle: boolean;
  canActOnTasks: boolean;
};

function isActiveGrant(grant: CareCircleGrant): boolean {
  return grant.revokedAt === null;
}

export function resolveMembership(
  episode: Episode,
  user: User,
  grants: CareCircleGrant[],
): Membership | null {
  if (episode.reviewerId === user.id) return { kind: "reviewer" };
  const grant = grants.find((g) => g.userId === user.id && isActiveGrant(g));
  if (!grant) return null;
  if (grant.role === "patient") return { kind: "patient", grant };
  if (grant.role === "backup") return { kind: "backup", grant };
  return { kind: "caregiver", grant };
}

export function buildAccess(
  episode: Episode,
  user: User,
  membership: Membership,
): EpisodeAccess {
  const isReviewer = membership.kind === "reviewer";
  const isPatient = membership.kind === "patient";
  return {
    episode,
    user,
    membership,
    canSeeDocument: isReviewer || isPatient,
    canReview: isReviewer,
    canManageCircle: isReviewer || isPatient,
    canActOnTasks: true,
  };
}

/**
 * Server-side membership check. Non-members receive a 404 rather than a 403 so
 * a guessed URL does not confirm that an episode exists.
 */
export async function requireEpisodeAccess(
  episodeId: string,
  user: User,
): Promise<EpisodeAccess> {
  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    include: { grants: true },
  });
  if (!episode) throw new NotFoundError("Episode not found.");
  const membership = resolveMembership(episode, user, episode.grants);
  if (!membership) throw new NotFoundError("Episode not found.");
  return buildAccess(episode, user, membership);
}

export function assertReviewer(access: EpisodeAccess): void {
  if (!access.canReview) throw new ForbiddenError("Only the discharge reviewer can do this.");
}

export function assertCircleManager(access: EpisodeAccess): void {
  if (!access.canManageCircle) {
    throw new ForbiddenError("Only the patient or reviewer can manage the care circle.");
  }
}

export function assertDocumentViewer(access: EpisodeAccess): void {
  if (!access.canSeeDocument) {
    throw new ForbiddenError("Caregivers see the approved plan, not the raw document.");
  }
}

export async function listAccessibleEpisodeIds(user: User): Promise<string[]> {
  const [reviewed, granted] = await Promise.all([
    prisma.episode.findMany({ where: { reviewerId: user.id }, select: { id: true } }),
    prisma.careCircleGrant.findMany({
      where: { userId: user.id, revokedAt: null },
      select: { episodeId: true },
    }),
  ]);
  return Array.from(new Set([...reviewed.map((e) => e.id), ...granted.map((g) => g.episodeId)]));
}
