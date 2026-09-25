import { beforeEach, describe, expect, it } from "vitest";
import { seed, expectStatus, prisma, type Demo } from "./helpers";
import { requireEpisodeAccess } from "@/lib/access";
import { getEpisodeView } from "@/lib/services/plan";
import { getDocumentForViewer, addManualItem, patchItem, pasteText, runExtraction } from "@/lib/services/review";
import { createEpisode, publishBlockers, publishEpisode, recordConsent } from "@/lib/services/episodes";
import { inviteToCircle, acceptInvitation, revokeFromCircle } from "@/lib/services/circle";
import { assignTask, transitionTask } from "@/lib/services/tasks";
import { runScheduler, listNotifications } from "@/lib/services/notifications";
import { advanceClock } from "@/lib/clock";

let d: Demo;
beforeEach(async () => {
  d = await seed();
});

describe("access control (R6)", () => {
  it("uninvited user guessing the episode URL gets not-found, not the plan", async () => {
    await expectStatus(requireEpisodeAccess(d.episodeId, d.khalid), 404);
    await expectStatus(getEpisodeView(d.khalid, d.episodeId), 404);
  });

  it("caregivers cannot read the raw document; reviewer and patient can", async () => {
    await expectStatus(getDocumentForViewer(d.omar, d.episodeId), 403);
    expect(await getDocumentForViewer(d.layla, d.episodeId)).not.toBeNull();
    expect(await getDocumentForViewer(d.mariam, d.episodeId)).not.toBeNull();
  });

  it("caregivers see only approved items and no reviewer-only fields", async () => {
    const view = await getEpisodeView(d.omar, d.episodeId);
    expect(view.items.length).toBeGreaterThan(0);
    expect(view.items.every((i) => i.reviewStatus === "approved")).toBe(true);
    expect(view.items.every((i) => i.rejectionReason === null)).toBe(true);
    const reviewerView = await getEpisodeView(d.layla, d.episodeId);
    expect(reviewerView.items.length).toBeGreaterThan(view.items.length);
  });

  it("revocation removes access and returns the person's open tasks to unclaimed", async () => {
    const before = await prisma.planItem.findUnique({ where: { id: d.itemIds.clinic } });
    expect(before?.ownerId).toBe(d.sara.id);
    await revokeFromCircle(d.layla, d.episodeId, d.sara.id);
    await expectStatus(getEpisodeView(d.sara, d.episodeId), 404);
    const after = await prisma.planItem.findUnique({ where: { id: d.itemIds.clinic } });
    expect(after?.status).toBe("unclaimed");
    expect(after?.ownerId).toBeNull();
    const pharmacy = await prisma.planItem.findUnique({ where: { id: d.itemIds.pharmacy } });
    expect(pharmacy?.backupId).toBeNull();
  });
});

describe("review + consent-gated publication (R1-R4)", () => {
  it("blocks publication until consent is granted and no drafts are pending", async () => {
    const ep = await createEpisode(d.layla, {
      patientName: "Test Patient",
      dischargedAt: new Date().toISOString(),
      timeZone: "Asia/Dubai",
    });
    await pasteText(
      d.layla,
      ep.id,
      "Book a surgical clinic review appointment within 7 days of discharge. If you develop a fever above 38.5 C, contact the surgical ward on 02-555-0142 at any time.",
    );
    const run = await runExtraction(d.layla, ep.id);
    expect(run.source).toBe("fixture");
    expect(run.accepted).toBeGreaterThan(0);

    let blockers = await publishBlockers(ep.id);
    expect(blockers.map((b) => b.code)).toEqual(expect.arrayContaining(["consent", "pending"]));
    await expectStatus(publishEpisode(d.layla, ep.id), 409);

    const items = await prisma.planItem.findMany({ where: { episodeId: ep.id } });
    for (const item of items) {
      if (item.ambiguityReason) {
        await expectStatus(patchItem(d.layla, ep.id, item.id, { reviewStatus: "approved", dueAt: new Date().toISOString() }), 422);
      }
      await patchItem(d.layla, ep.id, item.id, {
        reviewStatus: "approved",
        ambiguityReason: null,
        dueAt: item.kind === "action" ? new Date(Date.now() + 86_400_000).toISOString() : undefined,
      });
    }
    blockers = await publishBlockers(ep.id);
    expect(blockers.map((b) => b.code)).toEqual(["consent"]);

    await inviteToCircle(d.layla, ep.id, { userId: d.mariam.id, role: "patient" });
    await acceptInvitation(d.mariam, ep.id);
    await recordConsent(d.mariam, ep.id, "granted");
    const published = await publishEpisode(d.layla, ep.id);
    expect(published.status).toBe("published");
  });

  it("an action cannot be approved without a deadline; a rejected item cannot be approved", async () => {
    const ep = await createEpisode(d.layla, {
      patientName: "P",
      dischargedAt: new Date().toISOString(),
      timeZone: "Asia/Dubai",
    });
    await pasteText(d.layla, ep.id, "Collect the medications from the pharmacy before it closes at 6 pm. Rest at home.");
    const item = await addManualItem(d.layla, ep.id, {
      kind: "action",
      title: "Pharmacy",
      text: "Collect the medications",
      sourceQuote: "Collect the medications from the pharmacy before it closes at 6 pm.",
      reviewerAuthored: false,
    });
    expect(item.reviewStatus).toBe("pending");
    await expectStatus(patchItem(d.layla, ep.id, item.id, { reviewStatus: "approved" }), 422);

    const bad = await addManualItem(d.layla, ep.id, {
      kind: "action",
      title: "Invented",
      text: "Take 500 mg",
      sourceQuote: "Not in the document.",
      reviewerAuthored: false,
    });
    expect(bad.reviewStatus).toBe("rejected");
    expect(bad.rejectionReason).toMatch(/not found/i);
    await expectStatus(patchItem(d.layla, ep.id, bad.id, { reviewStatus: "approved" }), 409);

    const authored = await addManualItem(d.layla, ep.id, {
      kind: "warning_sign",
      title: "Reviewer note",
      text: "Call the ward if unsure.",
      sourceQuote: "",
      reviewerAuthored: true,
    });
    expect(authored.sourceType).toBe("reviewer_authored");
    expect(authored.reviewStatus).toBe("pending");
  });

  it("caregivers cannot see drafts before publication", async () => {
    const ep = await createEpisode(d.layla, {
      patientName: "P",
      dischargedAt: new Date().toISOString(),
      timeZone: "Asia/Dubai",
    });
    await inviteToCircle(d.layla, ep.id, { userId: d.omar.id, role: "caregiver" });
    await acceptInvitation(d.omar, ep.id);
    await pasteText(d.layla, ep.id, "Book a clinic review appointment within 7 days of discharge. Rest.");
    await runExtraction(d.layla, ep.id);
    const view = await getEpisodeView(d.omar, ep.id);
    expect(view.items).toHaveLength(0);
  });
});

describe("task state machine + audit (R5, R7, R10)", () => {
  it("assign -> accept -> needs_help -> resume -> complete -> reviewer reopen, each logged", async () => {
    const id = d.itemIds.pharmacy;
    await expectStatus(transitionTask(d.sara, d.episodeId, id, { event: "accept" }), 403);
    await transitionTask(d.omar, d.episodeId, id, { event: "accept" });
    await expectStatus(transitionTask(d.omar, d.episodeId, id, { event: "accept" }), 409);
    await transitionTask(d.omar, d.episodeId, id, { event: "needs_help", note: "pharmacy closed" });
    const reviewerNotices = await listNotifications(d.layla);
    expect(reviewerNotices.some((n) => n.trigger === "needs_help" && n.itemId === id)).toBe(true);
    await transitionTask(d.omar, d.episodeId, id, { event: "resume" });
    await transitionTask(d.omar, d.episodeId, id, { event: "complete" });
    await expectStatus(transitionTask(d.omar, d.episodeId, id, { event: "reopen" }), 403);
    await transitionTask(d.layla, d.episodeId, id, { event: "reopen", note: "receipt missing" });

    const events = await prisma.activityEvent.findMany({ where: { itemId: id }, orderBy: { createdAt: "asc" } });
    const types = events.map((e) => e.eventType);
    expect(types).toEqual(
      expect.arrayContaining(["task_accept", "task_needs_help", "task_resume", "task_complete", "task_reopen"]),
    );
    const item = await prisma.planItem.findUnique({ where: { id } });
    expect(item?.status).toBe("active");
  });

  it("claiming requires membership; assignment requires an active member", async () => {
    await expectStatus(transitionTask(d.khalid, d.episodeId, d.itemIds.bloodTest, { event: "claim" }), 404);
    await expectStatus(
      assignTask(d.layla, d.episodeId, d.itemIds.bloodTest, { ownerId: d.khalid.id }),
      409,
    );
    await transitionTask(d.sara, d.episodeId, d.itemIds.bloodTest, { event: "claim" });
    const item = await prisma.planItem.findUnique({ where: { id: d.itemIds.bloodTest } });
    expect(item?.status).toBe("active");
    expect(item?.ownerId).toBe(d.sara.id);
  });
});

describe("reminders + demo clock (R8)", () => {
  it("due_soon -> overdue -> backup escalation, with idempotent scheduler runs", async () => {
    const first = await runScheduler();
    expect(first.created.due_soon).toBeGreaterThanOrEqual(1);
    const again = await runScheduler();
    expect(again.created).toEqual({ due_soon: 0, overdue: 0, backup_overdue: 0 });

    await advanceClock(180);
    const afterOverdue = await runScheduler();
    expect(afterOverdue.created.overdue).toBeGreaterThanOrEqual(1);
    expect(afterOverdue.created.backup_overdue).toBe(0);

    await advanceClock(24 * 60);
    const afterGrace = await runScheduler();
    expect(afterGrace.created.backup_overdue).toBeGreaterThanOrEqual(1);
    const saraNotices = await listNotifications(d.sara);
    expect(saraNotices.some((n) => n.trigger === "backup_overdue" && n.itemId === d.itemIds.pharmacy)).toBe(true);

    const total = await prisma.notification.count();
    await runScheduler();
    expect(await prisma.notification.count()).toBe(total);
  });
});
