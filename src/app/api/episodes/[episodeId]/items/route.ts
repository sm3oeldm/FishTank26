import { ok, parseBody, withUser } from "@/lib/api";
import { addManualItem, manualItemSchema } from "@/lib/services/review";

export const POST = withUser<{ episodeId: string }>(async (request, user, { episodeId }) => {
  const input = await parseBody(request, manualItemSchema);
  return ok(await addManualItem(user, episodeId, input), 201);
});
