import type { User } from "@prisma/client";
import { prisma } from "../db";
import { now } from "../clock";
import { listAccessibleEpisodeIds, requireEpisodeAccess, type EpisodeAccess } from "../access";
import { isOverdue } from "../task-state";
import type { TaskStatus } from "../domain";
import { publishBlockers } from "./episodes";

export type PersonRef = { id: string; displayName: string; role: string };

export type PlanItemView = {
  id: string;
  kind: string;
  title: string;
  text: string;
  draftText: string;
  approvedText: string | null;
  sourceQuote: string;
  sourcePage: number | null;
  sourceType: string;
  reviewStatus: string;
  rejectionReason: string | null;
  ambiguityReason: string | null;
  dueAt: string | null;
  status: TaskStatus;
  overdue: boolean;
  owner: PersonRef | null;
  backup: PersonRef | null;
  outcomeDate: string | null;
};

export type CircleMember = PersonRef & {
  grantRole: string;
  invitedAt: string;
  acceptedAt: string | null;
};

export type ActivityView = {
  id: string;
  itemId: string | null;
  itemTitle: string | null;
  actor: PersonRef;
  eventType: string;
  note: string | null;
  createdAt: string;
};

export type EpisodeView = {
  episode: {
    id: string;
    patientName: string;
    dischargedAt: string;
    timeZone: string;
    consentStatus: string;
    status: string;
    reviewer: PersonRef;
  };
  viewer: {
    id: string;
    displayName: string;
    membership: EpisodeAccess["membership"]["kind"];
    canSeeDocument: boolean;
    canReview: boolean;
    canManageCircle: boolean;
  };
  now: string;
  hasDocument: boolean;
  documentName: string | null;
  items: PlanItemView[];
  circle: CircleMember[];
  activity: ActivityView[];
  publishBlockers: { code: string; message: string }[] | null;
};

const person = (u: { id: string; displayName: string; role: string }): PersonRef => ({
  id: u.id,
  displayName: u.displayName,
  role: u.role,
});

/**
 * Role-scoped read model. Caregivers receive approved items only, with the
 * approved text and approved source quote; drafts, rejected candidates and
 * reviewer-only fields never leave the server for them.
 */
export async function getEpisodeView(user: User, episodeId: string): Promise<EpisodeView> {
  const access = await requireEpisodeAccess(episodeId, user);
  const current = await now();
  const [episode, items, grants, activity, document] = await Promise.all([
    prisma.episode.findUniqueOrThrow({ where: { id: episodeId }, include: { reviewer: true } }),
    prisma.planItem.findMany({
      where: { episodeId },
      orderBy: [{ kind: "asc" }, { dueAt: "asc" }, { createdAt: "asc" }],
      include: { owner: true, backup: true },
    }),
    prisma.careCircleGrant.findMany({
      where: { episodeId, revokedAt: null },
      include: { user: true },
      orderBy: { invitedAt: "asc" },
    }),
    prisma.activityEvent.findMany({
      where: { episodeId },
      include: { actor: true, item: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.document.findFirst({ where: { episodeId }, orderBy: { uploadedAt: "desc" } }),
  ]);

  const caregiverView = !access.canReview;
  const visibleItems = caregiverView
    ? episode.status === "published"
      ? items.filter((i) => i.reviewStatus === "approved")
      : []
    : items;

  return {
    episode: {
      id: episode.id,
      patientName: episode.patientName,
      dischargedAt: episode.dischargedAt.toISOString(),
      timeZone: episode.timeZone,
      consentStatus: episode.consentStatus,
      status: episode.status,
      reviewer: person(episode.reviewer),
    },
    viewer: {
      id: user.id,
      displayName: user.displayName,
      membership: access.membership.kind,
      canSeeDocument: access.canSeeDocument,
      canReview: access.canReview,
      canManageCircle: access.canManageCircle,
    },
    now: current.toISOString(),
    hasDocument: document !== null,
    documentName: access.canSeeDocument ? document?.fileName ?? null : null,
    items: visibleItems.map((i) => ({
      id: i.id,
      kind: i.kind,
      title: i.title,
      text: i.approvedText ?? i.draftText,
      draftText: caregiverView ? i.approvedText ?? i.draftText : i.draftText,
      approvedText: i.approvedText,
      sourceQuote: i.sourceQuote,
      sourcePage: i.sourcePage,
      sourceType: i.sourceType,
      reviewStatus: i.reviewStatus,
      rejectionReason: caregiverView ? null : i.rejectionReason,
      ambiguityReason: caregiverView ? null : i.ambiguityReason,
      dueAt: i.dueAt?.toISOString() ?? null,
      status: i.status as TaskStatus,
      overdue: i.kind === "action" && isOverdue({ dueAt: i.dueAt, status: i.status as TaskStatus }, current),
      owner: i.owner ? person(i.owner) : null,
      backup: i.backup ? person(i.backup) : null,
      outcomeDate: i.outcomeDate?.toISOString() ?? null,
    })),
    circle: grants.map((g) => ({
      ...person(g.user),
      grantRole: g.role,
      invitedAt: g.invitedAt.toISOString(),
      acceptedAt: g.acceptedAt?.toISOString() ?? null,
    })),
    activity: (caregiverView ? activity.filter((a) => a.itemId !== null || a.eventType === "plan_published") : activity).map(
      (a) => ({
        id: a.id,
        itemId: a.itemId,
        itemTitle: a.item?.title ?? null,
        actor: person(a.actor),
        eventType: a.eventType,
        note: a.note,
        createdAt: a.createdAt.toISOString(),
      }),
    ),
    publishBlockers: access.canReview && episode.status !== "published" ? await publishBlockers(episodeId) : null,
  };
}

export type EpisodeSummary = {
  id: string;
  patientName: string;
  dischargedAt: string;
  status: string;
  consentStatus: string;
  membership: string;
  openTasks: number;
  overdueTasks: number;
  pendingDrafts: number;
};

export async function listEpisodes(user: User): Promise<EpisodeSummary[]> {
  const ids = await listAccessibleEpisodeIds(user);
  if (ids.length === 0) return [];
  const current = await now();
  const episodes = await prisma.episode.findMany({
    where: { id: { in: ids } },
    include: { items: true, grants: { where: { userId: user.id, revokedAt: null } } },
    orderBy: { dischargedAt: "desc" },
  });
  return episodes.map((e) => {
    const isReviewer = e.reviewerId === user.id;
    const approvedActions = e.items.filter((i) => i.kind === "action" && i.reviewStatus === "approved");
    return {
      id: e.id,
      patientName: e.patientName,
      dischargedAt: e.dischargedAt.toISOString(),
      status: e.status,
      consentStatus: e.consentStatus,
      membership: isReviewer ? "reviewer" : e.grants[0]?.role ?? "caregiver",
      openTasks: e.status === "published" ? approvedActions.filter((i) => i.status !== "done").length : 0,
      overdueTasks:
        e.status === "published"
          ? approvedActions.filter((i) => isOverdue({ dueAt: i.dueAt, status: i.status as TaskStatus }, current)).length
          : 0,
      pendingDrafts: isReviewer ? e.items.filter((i) => i.reviewStatus === "pending").length : 0,
    };
  });
}
