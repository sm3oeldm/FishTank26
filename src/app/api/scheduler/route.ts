import { ok, withUser } from "@/lib/api";
import { runScheduler } from "@/lib/services/notifications";

/** Idempotent reminder/overdue/backup sweep. Safe to call repeatedly. */
export const POST = withUser(async () => ok(await runScheduler()));
