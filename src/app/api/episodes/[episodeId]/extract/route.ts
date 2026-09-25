import { ok, withUser } from "@/lib/api";
import { runExtraction } from "@/lib/services/review";

export const POST = withUser<{ episodeId: string }>(async (_request, user, { episodeId }) =>
  ok(await runExtraction(user, episodeId)),
);
