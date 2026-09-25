import { ok, parseBody, withUser } from "@/lib/api";
import { transitionSchema, transitionTask } from "@/lib/services/tasks";

export const POST = withUser<{ episodeId: string; itemId: string }>(
  async (request, user, { episodeId, itemId }) => {
    const input = await parseBody(request, transitionSchema);
    return ok(await transitionTask(user, episodeId, itemId, input));
  },
);
