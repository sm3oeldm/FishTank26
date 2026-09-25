import { ok, parseBody, withUser } from "@/lib/api";
import { patchItem, patchItemSchema } from "@/lib/services/review";

export const PATCH = withUser<{ episodeId: string; itemId: string }>(
  async (request, user, { episodeId, itemId }) => {
    const input = await parseBody(request, patchItemSchema);
    return ok(await patchItem(user, episodeId, itemId, input));
  },
);
