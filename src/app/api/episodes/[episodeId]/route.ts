import { ok, withUser } from "@/lib/api";
import { getEpisodeView } from "@/lib/services/plan";

export const GET = withUser<{ episodeId: string }>(async (_request, user, { episodeId }) =>
  ok(await getEpisodeView(user, episodeId)),
);
