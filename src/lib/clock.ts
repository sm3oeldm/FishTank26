import { prisma } from "./db";

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

export async function getClockOffsetMinutes(): Promise<number> {
  if (!isDemoMode()) return 0;
  const clock = await prisma.demoClock.findUnique({ where: { id: 1 } });
  return clock?.offsetMinutes ?? 0;
}

export async function now(): Promise<Date> {
  const offset = await getClockOffsetMinutes();
  return new Date(Date.now() + offset * 60_000);
}

export async function advanceClock(minutes: number): Promise<Date> {
  const clock = await prisma.demoClock.upsert({
    where: { id: 1 },
    create: { id: 1, offsetMinutes: minutes },
    update: { offsetMinutes: { increment: minutes } },
  });
  return new Date(Date.now() + clock.offsetMinutes * 60_000);
}

export async function resetClock(): Promise<void> {
  await prisma.demoClock.upsert({
    where: { id: 1 },
    create: { id: 1, offsetMinutes: 0 },
    update: { offsetMinutes: 0 },
  });
}
