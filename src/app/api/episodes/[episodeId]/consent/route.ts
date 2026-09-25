import { ok, parseBody, withUser } from "@/lib/api";
import { consentSchema, recordConsent } from "@/lib/services/episodes";

export const POST = withUser<{ episodeId: string }>(async (request, user, { episodeId }) => {
  const { consentStatus } = await parseBody(request, consentSchema);
  return ok(await recordConsent(user, episodeId, consentStatus));
});
