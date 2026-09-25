import "./setup-env";
import { prisma } from "@/lib/db";
import { seedDemo, type SeedResult } from "@/lib/demo/seed";
import type { User } from "@prisma/client";

export type Demo = SeedResult & {
  layla: User;
  mariam: User;
  sara: User;
  omar: User;
  khalid: User;
};

export async function seed(): Promise<Demo> {
  const result = await seedDemo();
  const users = await prisma.user.findMany();
  const byId = (id: string) => {
    const u = users.find((x) => x.id === id);
    if (!u) throw new Error(`missing demo user ${id}`);
    return u;
  };
  return {
    ...result,
    layla: byId("u_layla"),
    mariam: byId("u_mariam"),
    sara: byId("u_sara"),
    omar: byId("u_omar"),
    khalid: byId("u_khalid"),
  };
}

export async function expectStatus(promise: Promise<unknown>, status: number) {
  try {
    await promise;
  } catch (err) {
    const s = (err as { status?: number }).status;
    if (s !== status) throw new Error(`expected status ${status}, got ${s ?? "none"}: ${(err as Error).message}`);
    return;
  }
  throw new Error(`expected rejection with status ${status}, but promise resolved`);
}

export { prisma };
