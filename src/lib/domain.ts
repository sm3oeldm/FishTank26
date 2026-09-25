export const USER_ROLES = ["reviewer", "patient", "caregiver"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const GRANT_ROLES = ["patient", "caregiver", "backup"] as const;
export type GrantRole = (typeof GRANT_ROLES)[number];

export const ITEM_KINDS = ["action", "warning_sign"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export const REVIEW_STATUSES = ["pending", "approved", "rejected", "removed"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const TASK_STATUSES = [
  "unclaimed",
  "awaiting_acceptance",
  "active",
  "needs_help",
  "done",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const CONSENT_STATUSES = ["pending", "granted", "withdrawn"] as const;
export type ConsentStatus = (typeof CONSENT_STATUSES)[number];

export const EPISODE_STATUSES = ["draft", "published"] as const;
export type EpisodeStatus = (typeof EPISODE_STATUSES)[number];

export const NOTIFICATION_TRIGGERS = [
  "due_soon",
  "overdue",
  "backup_overdue",
  "needs_help",
] as const;
export type NotificationTrigger = (typeof NOTIFICATION_TRIGGERS)[number];

export const SOURCE_TYPES = ["extracted", "reviewer_authored", "fixture"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const HOUR_MS = 60 * 60 * 1000;
export const DUE_SOON_WINDOW_MS = 24 * HOUR_MS;
export const BACKUP_GRACE_MS = 24 * HOUR_MS;

export class DomainError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = "You do not have access to this episode.") {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends DomainError {
  constructor(message = "Not found.") {
    super(message, 404);
    this.name = "NotFoundError";
  }
}
