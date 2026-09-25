import { cookies } from "next/headers";
import type { User } from "@prisma/client";
import { prisma } from "./db";
import { DomainError } from "./domain";

export const SESSION_COOKIE = "ch_user";

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  return prisma.user.findUnique({ where: { id } });
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new DomainError("Select a demo identity first.", 401);
  return user;
}
