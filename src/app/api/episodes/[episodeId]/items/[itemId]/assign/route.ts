import { ok, parseBody, withUser } from "@/lib/api";
import { assignSchema, assignTask } from "@/lib/services/tasks";

export const POST = withUser<{ episodeId: string; itemId: string }>(
  async (request, user, { episodeId, itemId }) => {
    const input = await parseBody(request, assignSchema);
    return ok(await assignTask(user, episodeId, itemId, input));
  },
);
