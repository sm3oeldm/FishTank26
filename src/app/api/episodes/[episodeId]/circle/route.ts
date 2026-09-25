import { z } from "zod";
import { ok, parseBody, withUser } from "@/lib/api";
import { acceptInvitation, inviteSchema, inviteToCircle, revokeFromCircle } from "@/lib/services/circle";

export const POST = withUser<{ episodeId: string }>(async (request, user, { episodeId }) => {
  const input = await parseBody(request, inviteSchema);
  return ok(await inviteToCircle(user, episodeId, input), 201);
});

export const PUT = withUser<{ episodeId: string }>(async (_request, user, { episodeId }) =>
  ok(await acceptInvitation(user, episodeId)),
);

const revokeSchema = z.object({ userId: z.string().min(1) });

export const DELETE = withUser<{ episodeId: string }>(async (request, user, { episodeId }) => {
  const { userId } = await parseBody(request, revokeSchema);
  await revokeFromCircle(user, episodeId, userId);
  return ok({ ok: true });
});
