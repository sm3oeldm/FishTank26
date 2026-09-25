import type { TaskStatus } from "./domain";
import { DomainError } from "./domain";

export type TaskEvent =
  | "assign"
  | "claim"
  | "accept"
  | "decline"
  | "complete"
  | "needs_help"
  | "resume"
  | "reopen";

const TRANSITIONS: Record<TaskEvent, { from: TaskStatus[]; to: TaskStatus }> = {
  assign: { from: ["unclaimed"], to: "awaiting_acceptance" },
  claim: { from: ["unclaimed"], to: "active" },
  accept: { from: ["awaiting_acceptance"], to: "active" },
  decline: { from: ["awaiting_acceptance"], to: "unclaimed" },
  complete: { from: ["active"], to: "done" },
  needs_help: { from: ["unclaimed", "awaiting_acceptance", "active"], to: "needs_help" },
  resume: { from: ["needs_help"], to: "active" },
  reopen: { from: ["done"], to: "active" },
};

export function nextStatus(current: TaskStatus, event: TaskEvent): TaskStatus {
  const rule = TRANSITIONS[event];
  if (!rule.from.includes(current)) {
    throw new DomainError(`Cannot ${event.replace("_", " ")} a task that is ${current.replace("_", " ")}.`, 409);
  }
  return rule.to;
}

export function isOverdue(item: { dueAt: Date | null; status: TaskStatus }, now: Date): boolean {
  return item.dueAt !== null && item.status !== "done" && now.getTime() > item.dueAt.getTime();
}
