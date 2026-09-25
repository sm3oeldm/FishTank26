import { ok, parseBody, withUser } from "@/lib/api";
import { createEpisode, createEpisodeSchema } from "@/lib/services/episodes";
import { listEpisodes } from "@/lib/services/plan";

export const GET = withUser(async (_request, user) => ok(await listEpisodes(user)));

export const POST = withUser(async (request, user) => {
  const input = await parseBody(request, createEpisodeSchema);
  return ok(await createEpisode(user, input), 201);
});
