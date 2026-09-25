import { z } from "zod";
import { ok, parseBody, withUser } from "@/lib/api";
import { advanceClock, getClockOffsetMinutes, isDemoMode, now, resetClock } from "@/lib/clock";
import { DomainError } from "@/lib/domain";
import { runScheduler } from "@/lib/services/notifications";

function assertDemoReviewer(role: string) {
  if (!isDemoMode()) throw new DomainError("Demo clock is disabled.", 403);
  if (role !== "reviewer") throw new DomainError("Only the reviewer can control the demo clock.", 403);
}

export const GET = withUser(async () =>
  ok({ demoMode: isDemoMode(), now: (await now()).toISOString(), offsetMinutes: await getClockOffsetMinutes() }),
);

const schema = z.object({
  action: z.enum(["advance", "reset"]),
  minutes: z.number().int().min(1).max(60 * 24 * 30).optional(),
});

/** Advancing the clock also runs the scheduler so overdue/backup notices appear immediately. */
export const POST = withUser(async (request, user) => {
  assertDemoReviewer(user.role);
  const input = await parseBody(request, schema);
  if (input.action === "reset") {
    await resetClock();
  } else {
    await advanceClock(input.minutes ?? 60);
  }
  const scheduler = await runScheduler();
  return ok({
    now: scheduler.ranAt.toISOString(),
    offsetMinutes: await getClockOffsetMinutes(),
    created: scheduler.created,
  });
});
