import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, getCurrentUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/clock";
import { errorResponse, ok, parseBody } from "@/lib/api";
import { DomainError } from "@/lib/domain";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const users = isDemoMode()
      ? await prisma.user.findMany({ orderBy: { displayName: "asc" } })
      : [];
    return ok({ user, demoMode: isDemoMode(), users });
  } catch (error) {
    return errorResponse(error);
  }
}

const schema = z.object({ userId: z.string().min(1) });

/** Demo-only identity switch. Real deployments would replace this with SSO. */
export async function POST(request: Request) {
  try {
    if (!isDemoMode()) throw new DomainError("Identity switching is only available in demo mode.", 403);
    const { userId } = await parseBody(request, schema);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new DomainError("Unknown user.", 404);
    const response = NextResponse.json({ user });
    response.cookies.set(SESSION_COOKIE, user.id, { httpOnly: true, sameSite: "lax", path: "/" });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
