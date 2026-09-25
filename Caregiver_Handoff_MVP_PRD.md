# Caregiver Handoff — MVP Product Requirements Document

**Version:** 1.2 · **Context:** Hub71 × Devin AI health-tech hackathon · **Status:** Build-ready proposal (revised: policy/evidence framing, positioning, scope tiers, Devin slicing plan, demo engineering rules, extraction eval; added R13 exercise video generation as P2 stretch with §7.1 safety rules)

**One-line pitch:** The verification layer between a hospital's discharge document and what the family actually does — every task traced to its source sentence, every handoff owned and logged.

## 1. The problem

A patient leaves hospital with instructions distributed across a discharge note: collect medicines, arrange an appointment, complete a test, and recognize symptoms that require contacting the care team. At home, several people may help. Each assumes someone else is handling a task. A reminder sent only to the patient does not tell the family who owns the next step or whether it happened.

**Opportunity:** Give the discharge team a quick way to publish a verified action plan, and give the patient and invited caregivers one place to assign, acknowledge, and track the practical work after discharge.

**Why now (evidence and policy):**

- Systematic reviews of discharge planning find that involving family caregivers in the discharge process is associated with roughly **25% lower readmission rates at 90 days** (and about 24% at 180 days). The intervention this product digitizes is already proven to work.
- Timely outpatient follow-up after discharge is associated with about **21% fewer 30-day all-cause readmissions** (CDC meta-analysis, 2024), and roughly **16% of readmissions are medication-related, of which about 40% are preventable** — exactly the pickup-and-follow-up tasks this plan tracks.
- Studies of discharge comprehension find errors in understanding and following instructions are common, especially with complex plans and lower health literacy; caregiver knowledge gaps around warning signs are documented after discharge.
- **Abu Dhabi's first DoH Patient Experience Standard (effective April 2026) mandates that patients and families receive written guidance on managing care at home, medication use, device handling, and emergency contacts**, alongside discharge-process and follow-up requirements. This product is a concrete way for providers to meet that standard.

**Positioning:** This is not a family to-do app. Competing caregiver apps (Caring Village, CareZone, and similar) rely on families manually typing tasks. Here, every task is extracted from the actual discharge document, shown with its exact source sentence, approved by a human reviewer, and published into an owned, escalating, audited workflow — a chain of custody from the discharge document to the family's action.

**Product boundary:** This is a coordination and communication tool. It does not diagnose, interpret symptoms, change prescriptions, recommend doses, or replace the discharge team. A completed task is a caregiver's report of an action, not proof of clinical adherence.

## 2. Users and jobs

| User | Job to be done | MVP permissions |
| --- | --- | --- |
| Discharge reviewer (nurse/coordinator) | Check the extracted actions against the original instructions, edit them, and publish the plan | View uploaded document, review/edit candidates, publish, view progress |
| Patient or authorized representative | Decide who can see the plan and understand what must happen next | Approve sharing, invite/revoke caregivers, view plan and activity |
| Primary caregiver | Take ownership of an action and report progress | See the approved plan, claim/accept tasks, mark an action done, add a short note |
| Backup caregiver | Notice a stalled action and help unblock it | Same approved-plan access; receive an overdue handoff notification |

**Initial wedge:** A discharge team with patients who explicitly want family help. Do not assume every patient has a smartphone, an available family member, or wants their full health record shared.

## 3. Goal, outcome, and scope

**MVP goal:** A reviewer can turn one text-based discharge document into a verified plan, invite two caregivers, and demonstrate that an initially unclaimed or overdue action is assigned and resolved.

**Success for the hackathon demo**

1. A reviewer uploads the provided fictional discharge PDF or pastes its text.
2. Suggested actions appear with the exact source sentence and page reference; unclear items are clearly flagged.
3. The reviewer edits/approves actions and publishes the plan only after consent is recorded.
4. A caregiver accepts a follow-up task, marks it done with a booking date, and the activity feed records who did what.
5. A different unclaimed/overdue task triggers a visible backup-caregiver notification without being presented as a medical emergency.

**MVP includes (hard core):** One discharge episode per patient, a text-based PDF/pasted text input, human review, action ownership, due dates, an approved warning-sign card, caregiver invitations, and in-app notifications. English/Arabic interface labels (R9) are included only if the scope tiers in §5 allow — if cut, Arabic is not mentioned in the pitch.

**MVP excludes:** Scanned-image OCR, voice, WhatsApp/SMS sending, electronic health record integration, appointments booked automatically, medication dosing or interaction advice, automatic emergency triage, clinical outcome claims, and real patient records in the hackathon demo.

**Stretch (P2, only if hard core is green):** R13 — AI-generated exercise demonstration video for physiotherapy tasks, subject to the strict rules in §7.1. This is the first feature that touches clinical content beyond the source document; if there is any doubt at build time, cut it. When cut, it is not mentioned in the pitch.

## 4. Core journey

1. **Start an episode:** Reviewer creates a fictional patient's discharge episode and records a discharge date. Patient or authorized representative explicitly approves sharing an action plan with named caregivers. For the demo, use pre-seeded accounts to represent this step.
2. **Upload and extract:** Reviewer uploads a digital-text PDF or pastes text. The system proposes actionable items, separate informational warning signs, and cites exact sentences from the document.
3. **Review:** Reviewer can change the title, instructions, category, due date, and whether an item is publishable. The original quote stays visible. Ambiguous dates, names, or instructions are left unresolved until a reviewer fills them in; no suggestion is automatically published.
4. **Publish and assign:** Patient/representative invites caregivers. Reviewer publishes the approved plan. Caregivers can claim tasks, or the patient/representative can assign them; assigned caregivers accept ownership.
5. **Do the work:** Caregiver marks a task done, optionally recording a practical outcome (for example, appointment date) and a note. Any member of the care circle sees the updated state.
6. **Close the loop:** Due/overdue actions generate in-app reminders. After a configurable grace period, a designated backup is notified. A caregiver can mark a task “needs help” with a reason; a person then resolves it.

### Example demo story

Fictional patient **Mariam** is discharged on 25 September. Her approved plan contains:

- “Collect prescribed medicines from the pharmacy today.” → an action due on discharge day.
- “Arrange a clinic review within seven days of discharge.” → an action with a reviewer-confirmed deadline.
- “If bleeding does not stop, contact the hospital using the number on this sheet.” → a **reviewed warning-sign card**, not a task or automatic triage rule.

Mariam invites her daughter and son. Her daughter accepts the clinic booking task and records an appointment. The pharmacy pickup remains unclaimed. The demo clock advances, causing an overdue notice to the backup caregiver, who claims it. Every displayed instruction links back to its approved source sentence.

## 5. Functional requirements and acceptance criteria

| ID | Priority | Requirement | Acceptance test |
| --- | --- | --- | --- |
| R1 | P0 | Create an episode with discharge date, patient display name, and consent status | An episode without recorded sharing consent cannot publish an invited-caregiver plan |
| R2 | P0 | Accept a digital-text PDF (up to 10 MB) or pasted text; reject unsupported/empty input | Uploading the fixture PDF yields text; scanned PDFs show a clear “paste text instead” message |
| R3 | P0 | Generate draft actions and warning-sign cards with an exact source quote and page number when available | Every generated item shows a quote found in the uploaded text; unsupported suggestions are rejected or marked for review |
| R4 | P0 | Require reviewer approval before publishing | Drafts cannot be seen by caregivers; the reviewer can edit/delete/add items and must resolve flagged ambiguity before publishing |
| R5 | P0 | Give each action one owner, optional backup, deadline, and status | Assigning an action changes it from unclaimed to awaiting acceptance; only an eligible caregiver can accept it |
| R6 | P1 | Invite and revoke caregivers; restrict their access to the approved plan | An uninvited/revoked account cannot open the episode, even by guessing its URL |
| R7 | P0 | Record completion and “needs help” updates in an activity history | Completion records actor, timestamp, and optional note; a completed action can be reopened by the reviewer with an audit entry |
| R8 | P0 | Remind owners about due actions and notify a backup about overdue ones | Simulating passage of time creates one in-app notification per trigger; repeated scheduler runs do not duplicate it |
| R9 | P1 | Show English/Arabic interface text and preserve original document quotes | Switching language changes app labels, not approved clinical wording; any translated clinical wording requires review before publication |
| R10 | P0 | Provide a demo dataset and “advance demo clock” control available only in demo mode | Judge can show assignment → completion → overdue escalation without waiting for real time |
| R11 | P1 | Export a printable approved care checklist | Export contains owners, deadlines, source references, and a generated timestamp |
| R12 | P1 | Attach a reviewed translation of instructions | A caregiver can compare translation with original; untranslated/unchecked text is labeled and hidden from publication |
| R13 | P2 | Generate an AI exercise demonstration video for a reviewer-approved physiotherapy task, visible to the patient and caregivers | A video can only be requested for a task whose `kind` is `exercise` and whose text is reviewer-approved; the published video carries an "AI-generated — reviewed by care team" label; a failed or timed-out generation falls back to a labeled fixture clip without blocking the demo; no patient identifiers appear in the generation prompt |

**Scope tiers for the build window (protect the demo):**

- **Hard core (ship no matter what):** R1–R5, R7, R8, R10, and the server-side membership enforcement inside R6. These are the source-linked review + ownership + escalation story. If time runs out, everything else yields to these.
- **Deferrable (cut first):** R6 invite/revoke UX polish, R9 Arabic/RTL labels (unless the Arabic demo beat is committed to early), R11, R12.
- **Stretch (P2):** R13 exercise video generation — only after hard core and P1 are green, and only if every rule in §7.1 can be implemented. Cut without ceremony; never mention it in the pitch if cut.

### Task states

`unclaimed → awaiting_acceptance → active → done`

`unclaimed/awaiting_acceptance/active → needs_help → active`
An item becomes **overdue** when `now > due_at` and it is not done; overdue is a derived flag, not a terminal state. The reviewer can reopen `done → active`, with an audit entry. Declined ownership returns a task to `unclaimed`.

**Notification policy for MVP:** Reminder to owner 24 hours before deadline when feasible; overdue notice to owner at deadline; backup notification after a 24-hour grace period. When there is no backup, show the action in the reviewer's overdue queue. These are coordination reminders only. The exact contact instructions on the reviewed warning-sign card remain available at all times.

## 6. Screens

1. **Reviewer queue:** New drafts, plans awaiting consent/review, and overdue actions. “Start episode.”
2. **Document review:** PDF text preview alongside proposed items; source quote and page; edit fields; ambiguity badge; approve/publish controls.
3. **Consent and care circle:** Patient/representative approval, invited users, role, invitation/acceptance status, revoke control.
4. **Shared plan:** Cards grouped into Today, Upcoming, Needs help, and Done; owner/backup, due time, source link, reviewed warning-sign panel.
5. **Task detail:** Original approved wording, owner acceptance, complete/needs-help actions, optional note or appointment date, audit history.
6. **Notifications:** Due, overdue, and request-for-help events, each linking to its task; demo clock control visible to reviewer only in demo mode.

**Accessibility baseline:** Large tap targets, readable contrast, explicit text alongside color, keyboard focus, and RTL layout for Arabic interface text. Show times in the episode's time zone; default the demo to `Asia/Dubai`.

## 7. AI behavior and rules

Use AI to **draft structured data**, not to publish instructions or decide care.

**Input:** Extracted discharge text, document page boundaries, discharge date, and a request for action items and warning signs. Uploaded text is untrusted data: instructions embedded in it must not change application behavior.

**Output contract for each draft item:**

```json
{
  "kind": "action",
  "title": "Arrange clinic review",
  "plain_language_text": "Arrange a clinic review within seven days of discharge.",
  "source_quote": "Arrange a clinic review within seven days of discharge.",
  "source_page": 1,
  "due_at": null,
  "ambiguity_reason": "Reviewer must confirm the discharge date and deadline",
  "review_status": "pending"
}
```

`kind` is `action`, `warning_sign`, or (only if R13 ships) `exercise` — an action subtype that additionally qualifies for video generation under §7.1. No generated item may contain a medication dose or a contact instruction that is not present in the source. Dates inferred from relative wording are **proposals** until the reviewer confirms them. If extraction fails, preserve the upload, display an error, and let the reviewer add items manually. If the LLM is unavailable during the demo, load a clearly labeled pre-extracted fixture rather than inventing live results.

**Validation before review:** Check that `source_quote` occurs verbatim in the extracted page text; verify page number and JSON shape; reject empty source references. A reviewer can add a manual item only by attaching a quote or labeling it as reviewer-authored. Store source and edited version separately. **Surface rejections visibly:** a draft blocked by validation must appear in the reviewer UI as "rejected — source quote not found in document" (with the offending quote) rather than being silently dropped, so the reviewer and demo audience can see the safety mechanism fire.

**Warning signs:** Display only reviewer-approved text and its original contact instruction. Do not use model confidence to tell a patient that a symptom is safe, urgent, or nonurgent. If the source provides no contact route, flag it for reviewer completion instead of creating one.

### 7.1 Exercise video generation (R13 — stretch feature)

The same chain-of-custody principle governs video: **the AI proposes, the reviewer approves, the patient sees nothing unreviewed.**

**Hard rules (non-negotiable):**

1. **Eligibility gate:** Video generation is only available for a plan item with `kind = "exercise"` whose text has passed reviewer approval. It can never be requested for actions, warning signs, medications, or any item outside the source-linked workflow. *(Architecturally enforced — the button does not exist for other kinds.)*
2. **Prompt is built only from approved data:** reviewer-approved exercise text + source quote + discharge date context. **Never** patient name, contact details, record identifiers, or free-form user input. Log every prompt.
3. **Reviewer approves the video before the patient sees it.** The generated clip enters `pending_review` exactly like a draft text item; publication follows the same gate. The patient-facing card always carries the label **"AI-generated demonstration — reviewed by care team."**
4. **Content boundary:** The prompt may only illustrate the approved instruction (e.g., "knee bending exercise shown in the discharge sheet"). It may not add exercises, repetitions, durations, resistance, or progression advice not present in the approved text. Generated content that implies dosing or progression is rejected at review.
5. **Failure = fixture, never a spinner on stage:** If generation times out or errors, fall back to a labeled fixture clip (`"Demo fixture — generation unavailable"`). No blocking wait in front of judges; pre-generate the demo clip before going on stage and show live generation as the optional flourish, not the load-bearing step.
6. **Not medical advice, by design:** No anatomical claims, no pain/safety assurances, no "do this if it hurts" language in any generated caption or audio. The video is a visual rendering of an instruction the care team already approved.
7. **Demo data only:** Synthetic patients; no real rehab protocols for real conditions — the fixture scenario is a generic post-discharge mobility exercise.

**If any of these cannot be implemented in the build window, cut R13.** It is scored as a stretch, and a half-built version (rule 3 or 5 missing) is worse than none.

## 8. Data and permissions

### Minimal data model

| Entity | Key fields |
| --- | --- |
| User | `id`, `display_name`, `role`, `locale` |
| Episode | `id`, `patient_name`, `discharged_at`, `time_zone`, `consent_status`, `status`, `reviewer_id` |
| Document | `id`, `episode_id`, `storage_key`, `extracted_text`, `uploaded_at` |
| PlanItem | `id`, `episode_id`, `kind`, `title`, `approved_text`, `source_quote`, `source_page`, `review_status`, `due_at`, `status`, `owner_id`, `backup_id` |
| ExerciseClip (R13) | `id`, `item_id`, `kind = exercise` prerequisite, `generation_prompt` (approved data only), `video_key`, `review_status` (`pending_review` → approved/rejected), `source = generated \| fixture`, `created_at` |
| CareCircleGrant | `episode_id`, `user_id`, `role`, `invited_at`, `accepted_at`, `revoked_at` |
| ActivityEvent | `id`, `episode_id`, `item_id`, `actor_id`, `event_type`, `note`, `created_at` |
| Notification | `id`, `recipient_id`, `item_id`, `trigger`, `created_at`, `read_at`, `dedupe_key` |

**Access rules:** Only the reviewer and patient/authorized representative see the raw document. Invited caregivers see only approved shared-plan items and associated approved source quotes. The patient/representative can revoke a grant; all episode reads and writes enforce membership on the server. Every edit, assignment, consent change, and completion is timestamped. Demo accounts use synthetic data exclusively.

**Production gate:** Before any real patient pilot, confirm local legal/privacy requirements with a provider, establish verified patient or representative identity and consent, secure document storage and retention/deletion, audit access, and review third-party AI data handling. The hackathon version should not accept real patient health records.

## 9. Implementation proposal

**Suggested stack:** Next.js + TypeScript for responsive UI and server-side routes; SQLite with Prisma for the hackathon; server-side PDF text extraction; a server-side LLM adapter with schema validation for draft items. Keep the AI key on the server. A deterministic fixture should support the entire judge demo without an external service. If R13 ships: a server-side video-generation adapter behind the same discipline — provider key server-side, prompt built only from approved fields (§7.1 rule 2), timeout → fixture clip, and the demo clip pre-generated before the pitch.

**Main API actions:** `POST /episodes`, `POST /episodes/:id/document`, `POST /episodes/:id/extract`, `PATCH /episodes/:id/items/:itemId`, `POST /episodes/:id/publish`, `POST /episodes/:id/grants`, `DELETE /episodes/:id/grants/:userId`, `POST /items/:id/accept`, `POST /items/:id/complete`, `POST /items/:id/needs-help`, `GET /episodes/:id/activity`, and `GET /notifications`. Treat these as proposed interfaces; enforce authorization and validate inputs on every handler.

**Build sequence**

0. **Slice for Devin first (see §9.1):** Decompose this PRD into R1–R12 slices, each with its acceptance test as the success/failure mechanism, and execute them as independent Devin sessions — parallel where independent, human-reviewed before merging to `main`. This decomposition is itself a judged deliverable ("Devin Use Case") and must be visible in the pitch (screenshot/CI evidence).
1. Seed fictional users, an episode, sample text PDF, and task states. Build shared plan and activity views.
2. Add assignment, acceptance, completion, needs-help, server-side permission checks, and consent/invitations.
3. Add reviewer upload, extraction adapter, source matching, review, and publish flow.
4. Add notifications, demo clock, RTL/localized UI, and polished scenario script.

If time is tight, preserve **source-linked human review + ownership + escalation**. Cut exports, voice, external messaging, live clinic integration, and animated dashboards first.

### 9.1 Devin slicing plan (evidence for the "Devin Use Case" criterion)

Devin's own best practices call for projects that break into **isolated, objectively-verifiable, <90-minute subtasks** ("wide & shallow") with a clear success/failure check. This PRD was written to match: every requirement row carries an acceptance test, so each row is an independent session with its own verification.

| Slice | Requirements | Verification (per Devin docs: tests/CI must exist per slice) |
| --- | --- | --- |
| S1 | R1, R8 | Consent-gate test; notification dedupe test |
| S2 | R2 | Fixture PDF import + rejection paths |
| S3 | R3, validation rules (§7) | Quote-verbatim match tests; JSON schema tests; rejection of non-source content |
| S4 | R4, review UI | Drafts invisible pre-approval; ambiguity blocking test |
| S5 | R5, R7 | State machine tests; audit entry tests |
| S6 | R6 (server-side enforcement) | Authorization tests incl. guessed-URL access |
| S7 | R10, demo script | Demo clock idempotency test |
| S8 | R9, R11, R12 (if time) | RTL/label diff test; export content check |
| S9 | R13 (stretch — only after S1–S7 green) | Eligibility gate test (no generate button for non-exercise kinds); prompt-contains-no-PII assertion; fixture fallback on simulated timeout; label present on player; reviewer approval required before patient visibility |

Rules for the build: one slice per Devin session, backward-compatible changes only, each slice independently mergeable after human review, CI green required before merge. Record session screenshots and the CI pipeline for the pitch — judges cannot award points for structure they cannot see.

### Verification checklist

- Import fixture PDF; confirm exact quotes and review-required dates.
- Attempt publishing with unresolved ambiguity or without consent; it must fail.
- Invite one caregiver; verify an uninvited/revoked user cannot fetch the plan or mutate a task.
- Assign, accept, complete, and reopen a task; check each actor and timestamp.
- Advance demo clock twice; verify a single backup notice and no duplicate events.
- Switch Arabic/English; verify layout and original source wording.
- Disconnect AI service; verify manual review/fixture fallback without a fabricated extraction.
- If R13 shipped: attempt video generation on a non-exercise item (must be impossible); simulate generation timeout (fixture clip plays, labeled); confirm patient view is blocked until reviewer approves the clip; confirm the generation prompt log contains no patient identifiers.

## 10. Demo script (approximately 3 minutes)

**Demo engineering rules (do these before polishing the script):**

- **No login flows on stage.** Five identities (reviewer, patient, daughter, son, backup) must never mean five logins in front of judges — role-switching reads as slow and is the top cause of failed live demos. Use pre-seeded sessions with **one-click role switching**, or a **split-screen showing reviewer view + caregiver view simultaneously**. The judge should only ever watch *state change*, never *authentication*.
- Every scripted beat must be reachable from **pre-seeded state** so any step can be jumped to if a prior step stalls.

**Script:**

1. **Problem (15 seconds):** "The discharge sheet tells Mariam what to do, but not who in the family is doing it. Studies show involving family caregivers in discharge cuts 90-day readmissions by about 25% — but only if someone actually owns the next step."
2. **Reviewer (45 seconds):** Upload a fictional note. Show three proposed items, each with its **exact source quote and page**. Fix an uncertain deadline, approve, record sharing consent, publish.
3. **The AI cannot freewheel (15 seconds):** Deliberately trigger or display a rejected draft — an item whose quote does **not** appear verbatim in the source document — and show the validator blocking it. One line: *"The AI cannot add an instruction that isn't in the discharge document. Every published task traces to a source sentence."* (This beat is aimed squarely at the OpenAI judge: grounded extraction, visible safety mechanism.)
4. **Care circle (40 seconds):** Daughter accepts the appointment task, records the booked date. Son sees the pharmacy task unclaimed. *(One-click role switch or split-screen — no logins.)*
5. **Closed loop (35 seconds):** Advance demo clock. Show the backup notified about the overdue pharmacy action; backup claims it. Show the audit trail.
6. **Arabic/RTL beat (10 seconds, ONLY if R9 shipped):** Flip the interface to Arabic, show RTL layout with the original English source wording preserved. **If R9 was cut, do not mention Arabic in the pitch.**
6b. **Exercise video beat (15 seconds, ONLY if R13 shipped):** Open the physiotherapy task → reviewer view shows the generated clip pending approval → approve → patient view plays it with the "AI-generated demonstration — reviewed by care team" label. **Pre-generate this clip before going on stage; show it as recorded playback. Mention live generation only if you are confident in the provider that day. If R13 was cut, do not mention video in the pitch.**
7. **Close (20 seconds):** "Verified source-linked review, owned handoffs, escalation when something stalls — clinical instructions stay human approved. And this maps directly to Abu Dhabi's Patient Experience Standard, effective April 2026, which requires families to receive written home-care guidance."

**Failure drills:** Bring a short backup video of the same run plus seeded state for every scripted step in case PDF parsing or the AI provider is unavailable. Never use a real patient's document on stage.

## 11. Measures, differentiation, and next pilot

**Pilot metrics (targets to validate, not proven outcomes):** share of published actions with an accepted owner, time from discharge to action assignment, follow-up booking reported before its due date, overdue actions acknowledged by a backup, and time spent by the reviewer preparing a plan. Track task completion as **self-reported** unless independently verified.

**Why this is different from a reminder app:** The care team reviews source-linked instructions, the patient controls who sees the plan, multiple caregivers explicitly accept responsibility, and stalled actions have a human backup and visible history.

### Extraction eval (build this; show it in the pitch)

A small, honest evaluation set is the fastest credibility gain with a technical judge. Build **~10 synthetic discharge documents** covering the common shapes (medication pickup, follow-up scheduling, warning signs, ambiguous relative dates, multi-paragraph notes, one document with no actionable items) and report:

| Metric | Definition | Target |
| --- | --- | --- |
| Action recall | Share of true actionable items in the fixture that were extracted | ≥ 80% |
| Action precision | Share of extracted items that are genuine actions (no hallucinated items) | 100% — the validator guarantees it |
| Quote verbatim rate | Share of draft items whose `source_quote` matches the source exactly | 100% — enforced by validation, not model behavior |
| Ambiguity flag rate | Share of relative-date items correctly left for reviewer confirmation | ≥ 90% |

Report precision and verbatim rate as **architectural guarantees** (a bad item cannot pass validation), not model statistics — that distinction is the point. Table values are targets to measure, not proven results; show measured numbers on demo day even if they miss target. Effort: one Devin slice writing fixtures + a runner script against the existing validation tests.

**First partner:** A discharge coordinator or home-care provider willing to test a small, consented workflow and validate which actions are practical to track. A real pilot depends on provider approval and privacy review; there is no implied hospital integration in the MVP.

## 12. Working assumptions and open decisions

**Assumptions for the build:** Hospital-assisted onboarding; fictional patients for hackathon; one discharge episode; reviewer confirmation required; notifications are in-app; digital-text English PDFs and pasted text; English/Arabic interface labels with source wording preserved; local demo data.

**Decide with your team before coding:** Which discharge scenario will the judges see? Will the patient or a verified representative grant sharing consent? Who is the reviewer in your story? Which team member owns UI, extraction, and demo preparation? The first three answers determine the sample document, permissions, and presentation.
