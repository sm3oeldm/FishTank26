import { ok, withUser } from "@/lib/api";
import { listNotifications } from "@/lib/services/notifications";

export const GET = withUser(async (_request, user) => ok(await listNotifications(user)));
