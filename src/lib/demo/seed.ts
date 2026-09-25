import { prisma } from "../db";
import { resetClock } from "../clock";
import { HOUR_MS } from "../domain";
import { createEpisode, publishEpisode, recordConsent } from "../services/episodes";
import { patchItem, runExtraction } from "../services/review";
import { acceptInvitation, inviteToCircle } from "../services/circle";
import { assignTask, transitionTask } from "../services/tasks";
import { FIXTURE_FILE_NAME, FIXTURE_PAGES } from "./fixture";

export const DEMO_USERS = [
  { id: "u_layla", displayName: "Nurse Layla (discharge reviewer)", role: "reviewer" },
  { id: "u_mariam", displayName: "Mariam (patient)", role: "patient" },
  { id: "u_sara", displayName: "Sara (daughter)", role: "caregiver" },
  { id: "u_omar", displayName: "Omar (son)", role: "caregiver" },
  { id: "u_khalid", displayName: "Khalid (neighbour, not invited)", role: "caregiver" },
] as const;

export type SeedResult = { episodeId: string; itemIds: Record<string, string> };

async function wipe() {
  await prisma.notification.deleteMany();
  await prisma.activityEvent.deleteMany();
  await prisma.planItem.deleteMany();
  await prisma.careCircleGrant.deleteMany();
  await prisma.document.deleteMany();
  await prisma.episode.deleteMany();
  await prisma.user.deleteMany();
}

/**
 * Rebuilds the Mariam demo through the real service layer so the audit trail
 * reflects genuine state transitions. Deadlines are relative to seed time so the
 * demo clock can push tasks into overdue/backup flows.
 */
export async function seedDemo(): Promise<SeedResult> {
  await wipe();
  await resetClock();
  const base = new Date();

  for (const u of DEMO_USERS) {
    await prisma.user.create({ data: { id: u.id, displayName: u.displayName, role: u.role } });
  }
  const layla = await prisma.user.findUniqueOrThrow({ where: { id: "u_layla" } });
  const mariam = await prisma.user.findUniqueOrThrow({ where: { id: "u_mariam" } });
  const sara = await prisma.user.findUniqueOrThrow({ where: { id: "u_sara" } });
  const omar = await prisma.user.findUniqueOrThrow({ where: { id: "u_omar" } });

  const episode = await createEpisode(layla, {
    patientName: "Mariam A.",
    dischargedAt: new Date(base.getTime() - 20 * HOUR_MS).toISOString(),
    timeZone: "Asia/Dubai",
  });

  await prisma.document.create({
    data: {
      episodeId: episode.id,
      fileName: FIXTURE_FILE_NAME,
      extractedText: FIXTURE_PAGES.join("\f"),
      pageCount: FIXTURE_PAGES.length,
      uploadedAt: base,
    },
  });

  await inviteToCircle(layla, episode.id, { userId: mariam.id, role: "patient" });
  await inviteToCircle(layla, episode.id, { userId: sara.id, role: "caregiver" });
  await inviteToCircle(layla, episode.id, { userId: omar.id, role: "caregiver" });
  await acceptInvitation(mariam, episode.id);
  await acceptInvitation(sara, episode.id);
  await acceptInvitation(omar, episode.id);
  await recordConsent(mariam, episode.id, "granted");

  await runExtraction(layla, episode.id);
  const drafts = await prisma.planItem.findMany({ where: { episodeId: episode.id } });
  const find = (needle: string) => {
    const item = drafts.find((d) => d.sourceQuote.includes(needle));
    if (!item) throw new Error(`Fixture drift: no draft containing "${needle}"`);
    return item;
  };

  const pharmacy = find("Collect the discharge medications");
  const clinic = find("Book a surgical clinic review");
  const bloodTest = find("Return to the hospital laboratory");
  const dressings = find("Keep the wound dressings dry");
  const paracetamol = find("Take paracetamol");
  const ibuprofen = find("Do not take ibuprofen");
  const lifting = find("Avoid lifting");
  const feverCard = find("fever above 38.5");
  const chestCard = find("severe chest pain");
  const woundCard = find("Call the number on this sheet");

  const iso = (ms: number) => new Date(base.getTime() + ms).toISOString();

  await patchItem(layla, episode.id, pharmacy.id, {
    title: "Collect discharge medications from pharmacy",
    approvedText: "Collect Mariam's discharge medications from the hospital outpatient pharmacy before it closes at 6 pm.",
    dueAt: iso(2 * HOUR_MS),
    ambiguityReason: null,
    reviewStatus: "approved",
  });
  await patchItem(layla, episode.id, clinic.id, {
    title: "Book surgical clinic review (within 7 days)",
    approvedText: "Book a surgical clinic review appointment within 7 days of discharge so the wound sites can be checked.",
    dueAt: iso(5 * 24 * HOUR_MS),
    ambiguityReason: null,
    reviewStatus: "approved",
  });
  await patchItem(layla, episode.id, bloodTest.id, {
    title: "Fasting blood test at hospital laboratory",
    approvedText: "Take Mariam to the hospital laboratory on the morning of 27 September for a fasting blood test (nothing to eat after midnight).",
    dueAt: iso(2 * 24 * HOUR_MS),
    ambiguityReason: null,
    reviewStatus: "approved",
  });
  await patchItem(layla, episode.id, dressings.id, {
    title: "Change wound dressings every 2 days",
    approvedText: "Keep the wound dressings dry and change them every 2 days, or sooner if they become wet.",
    dueAt: iso(2 * 24 * HOUR_MS),
    ambiguityReason: null,
    reviewStatus: "approved",
  });
  await patchItem(layla, episode.id, lifting.id, { reviewStatus: "removed" });
  await patchItem(layla, episode.id, paracetamol.id, { reviewStatus: "removed" });
  await patchItem(layla, episode.id, ibuprofen.id, { reviewStatus: "removed" });

  await patchItem(layla, episode.id, feverCard.id, {
    title: "Fever, worsening pain, or yellowing — contact the ward",
    reviewStatus: "approved",
    ambiguityReason: null,
  });
  await patchItem(layla, episode.id, chestCard.id, {
    title: "Severe chest pain or breathing difficulty — call 998",
    reviewStatus: "approved",
    ambiguityReason: null,
  });
  await patchItem(layla, episode.id, woundCard.id, {
    title: "Wound red, swollen, or leaking — contact the ward",
    approvedText:
      "If the wound becomes red, swollen, or leaks fluid, call the surgical ward on 02-555-0142 (fictional) at any time.",
    ambiguityReason: null,
    reviewStatus: "approved",
  });

  for (const leftover of drafts) {
    const handled = [pharmacy, clinic, bloodTest, dressings, paracetamol, ibuprofen, lifting, feverCard, chestCard, woundCard];
    if (handled.some((h) => h.id === leftover.id) || leftover.reviewStatus === "rejected") continue;
    await patchItem(layla, episode.id, leftover.id, { reviewStatus: "removed" });
  }

  await publishEpisode(layla, episode.id);

  await assignTask(layla, episode.id, pharmacy.id, { ownerId: omar.id, backupId: sara.id });
  await assignTask(layla, episode.id, clinic.id, { ownerId: sara.id, backupId: omar.id });
  await transitionTask(sara, episode.id, clinic.id, { event: "accept" });
  await transitionTask(sara, episode.id, dressings.id, { event: "claim" });

  return {
    episodeId: episode.id,
    itemIds: {
      pharmacy: pharmacy.id,
      clinic: clinic.id,
      bloodTest: bloodTest.id,
      dressings: dressings.id,
      feverCard: feverCard.id,
      chestCard: chestCard.id,
      woundCard: woundCard.id,
    },
  };
}
