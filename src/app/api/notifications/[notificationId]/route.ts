import { ok, withUser } from "@/lib/api";
import { markRead } from "@/lib/services/notifications";

export const POST = withUser<{ notificationId: string }>(async (_request, user, { notificationId }) =>
  ok({ updated: await markRead(user, notificationId) }),
);
