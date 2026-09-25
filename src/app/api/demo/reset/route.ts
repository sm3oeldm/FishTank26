import { ok, withUser } from "@/lib/api";
import { isDemoMode } from "@/lib/clock";
import { DomainError } from "@/lib/domain";
import { seedDemo } from "@/lib/demo/seed";

export const POST = withUser(async (_request, user) => {
  if (!isDemoMode()) throw new DomainError("Demo reset is disabled.", 403);
  if (user.role !== "reviewer") throw new DomainError("Only the reviewer can reset the demo.", 403);
  return ok(await seedDemo());
});
