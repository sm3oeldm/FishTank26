import { ok, withUser } from "@/lib/api";
import { publishEpisode } from "@/lib/services/episodes";

export const POST = withUser<{ episodeId: string }>(async (_request, user, { episodeId }) =>
  ok(await publishEpisode(user, episodeId)),
);
