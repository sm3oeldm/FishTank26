# Caregiver Handoff — MVP Product Requirements Document

**Version:** 1.0 · **Context:** Hub71 × Devin AI health-tech hackathon · **Status:** Build-ready proposal

**One-line pitch:** Turn reviewed hospital discharge instructions into a shared, accountable care plan for the patient and their family.

## 1. The problem

A patient leaves hospital with instructions distributed across a discharge note: collect medicines, arrange an appointment, complete a test, and recognize symptoms that require contacting the care team. At home, several people may help. Each assumes someone else is handling a task. A reminder sent only to the patient does not tell the family who owns the next step or whether it happened.

**Opportunity:** Give the discharge team a quick way to publish a verified action plan, and give the patient and invited caregivers one place to assign, acknowledge, and track the practical work after discharge.

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

**MVP includes:** One discharge episode per patient, a text-based PDF/pasted text input, human review, action ownership, due dates, an approved warning-sign card, caregiver invitations, in-app notifications, and English/Arabic interface labels.

**MVP excludes:** Scanned-image OCR, voice, WhatsApp/SMS sending, electronic health record integration, appointments booked automatically, medication dosing or interaction advice, automatic emergency triage, clinical outcome claims, and real patient records in the hackathon demo.

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
| R6 | P0 | Invite and revoke caregivers; restrict their access to the approved plan | An uninvited/revoked account cannot open the episode, even by guessing its URL |
| R7 | P0 | Record completion and “needs help” updates in an activity history | Completion records actor, timestamp, and optional note; a completed action can be reopened by the reviewer with an audit entry |
| R8 | P0 | Remind owners about due actions and notify a backup about overdue ones | Simulating passage of time creates one in-app notification per trigger; repeated scheduler runs do not duplicate it |
| R9 | P0 | Show English/Arabic interface text and preserve original document quotes | Switching language changes app labels, not approved clinical wording; any translated clinical wording requires review before publication |
| R10 | P0 | Provide a demo dataset and “advance demo clock” control available only in demo mode | Judge can show assignment → completion → overdue escalation without waiting for real time |
| R11 | P1 | Export a printable approved care checklist | Export contains owners, deadlines, source references, and a generated timestamp |
| R12 | P1 | Attach a reviewed translation of instructions | A caregiver can compare translation with original; untranslated/unchecked text is labeled and hidden from publication |

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

`kind` is `action` or `warning_sign`. No generated item may contain a medication dose or a contact instruction that is not present in the source. Dates inferred from relative wording are **proposals** until the reviewer confirms them. If extraction fails, preserve the upload, display an error, and let the reviewer add items manually. If the LLM is unavailable during the demo, load a clearly labeled pre-extracted fixture rather than inventing live results.

**Validation before review:** Check that `source_quote` occurs verbatim in the extracted page text; verify page number and JSON shape; reject empty source references. A reviewer can add a manual item only by attaching a quote or labeling it as reviewer-authored. Store source and edited version separately.

**Warning signs:** Display only reviewer-approved text and its original contact instruction. Do not use model confidence to tell a patient that a symptom is safe, urgent, or nonurgent. If the source provides no contact route, flag it for reviewer completion instead of creating one.

## 8. Data and permissions

### Minimal data model

| Entity | Key fields |
| --- | --- |
| User | `id`, `display_name`, `role`, `locale` |
| Episode | `id`, `patient_name`, `discharged_at`, `time_zone`, `consent_status`, `status`, `reviewer_id` |
| Document | `id`, `episode_id`, `storage_key`, `extracted_text`, `uploaded_at` |
| PlanItem | `id`, `episode_id`, `kind`, `title`, `approved_text`, `source_quote`, `source_page`, `review_status`, `due_at`, `status`, `owner_id`, `backup_id` |
| CareCircleGrant | `episode_id`, `user_id`, `role`, `invited_at`, `accepted_at`, `revoked_at` |
| ActivityEvent | `id`, `episode_id`, `item_id`, `actor_id`, `event_type`, `note`, `created_at` |
| Notification | `id`, `recipient_id`, `item_id`, `trigger`, `created_at`, `read_at`, `dedupe_key` |

**Access rules:** Only the reviewer and patient/authorized representative see the raw document. Invited caregivers see only approved shared-plan items and associated approved source quotes. The patient/representative can revoke a grant; all episode reads and writes enforce membership on the server. Every edit, assignment, consent change, and completion is timestamped. Demo accounts use synthetic data exclusively.

**Production gate:** Before any real patient pilot, confirm local legal/privacy requirements with a provider, establish verified patient or representative identity and consent, secure document storage and retention/deletion, audit access, and review third-party AI data handling. The hackathon version should not accept real patient health records.

## 9. Implementation proposal

**Suggested stack:** Next.js + TypeScript for responsive UI and server-side routes; SQLite with Prisma for the hackathon; server-side PDF text extraction; a server-side LLM adapter with schema validation for draft items. Keep the AI key on the server. A deterministic fixture should support the entire judge demo without an external service.

**Main API actions:** `POST /episodes`, `POST /episodes/:id/document`, `POST /episodes/:id/extract`, `PATCH /episodes/:id/items/:itemId`, `POST /episodes/:id/publish`, `POST /episodes/:id/grants`, `DELETE /episodes/:id/grants/:userId`, `POST /items/:id/accept`, `POST /items/:id/complete`, `POST /items/:id/needs-help`, `GET /episodes/:id/activity`, and `GET /notifications`. Treat these as proposed interfaces; enforce authorization and validate inputs on every handler.

**Build sequence**

1. Seed fictional users, an episode, sample text PDF, and task states. Build shared plan and activity views.
2. Add assignment, acceptance, completion, needs-help, server-side permission checks, and consent/invitations.
3. Add reviewer upload, extraction adapter, source matching, review, and publish flow.
4. Add notifications, demo clock, RTL/localized UI, and polished scenario script.

If time is tight, preserve **source-linked human review + ownership + escalation**. Cut exports, voice, external messaging, live clinic integration, and animated dashboards first.

### Verification checklist

- Import fixture PDF; confirm exact quotes and review-required dates.
- Attempt publishing with unresolved ambiguity or without consent; it must fail.
- Invite one caregiver; verify an uninvited/revoked user cannot fetch the plan or mutate a task.
- Assign, accept, complete, and reopen a task; check each actor and timestamp.
- Advance demo clock twice; verify a single backup notice and no duplicate events.
- Switch Arabic/English; verify layout and original source wording.
- Disconnect AI service; verify manual review/fixture fallback without a fabricated extraction.

## 10. Demo script (approximately 3 minutes)

1. **Problem (20 seconds):** “The discharge sheet tells Mariam what to do, but not who in the family is doing it.”
2. **Reviewer (50 seconds):** Upload a fictional note. Show three proposed items and one exact source quote. Fix an uncertain deadline, approve, record sharing consent, publish.
3. **Care circle (50 seconds):** Daughter accepts the appointment task, records the booked date. Son sees the pharmacy task unclaimed.
4. **Closed loop (40 seconds):** Advance demo clock. Show the backup notified about the overdue pharmacy action; backup claims it. Show the audit trail.
5. **Close (20 seconds):** “We help the discharge team and family know which practical follow-ups are still open, while clinical instructions remain human approved.”

Bring a short backup video or seeded state in case PDF parsing or the AI provider is unavailable. Never use a real patient's document on stage.

## 11. Measures, differentiation, and next pilot

**Pilot metrics (targets to validate, not proven outcomes):** share of published actions with an accepted owner, time from discharge to action assignment, follow-up booking reported before its due date, overdue actions acknowledged by a backup, and time spent by the reviewer preparing a plan. Track task completion as **self-reported** unless independently verified.

**Why this is different from a reminder app:** The care team reviews source-linked instructions, the patient controls who sees the plan, multiple caregivers explicitly accept responsibility, and stalled actions have a human backup and visible history.

**First partner:** A discharge coordinator or home-care provider willing to test a small, consented workflow and validate which actions are practical to track. A real pilot depends on provider approval and privacy review; there is no implied hospital integration in the MVP.

## 12. Working assumptions and open decisions

**Assumptions for the build:** Hospital-assisted onboarding; fictional patients for hackathon; one discharge episode; reviewer confirmation required; notifications are in-app; digital-text English PDFs and pasted text; English/Arabic interface labels with source wording preserved; local demo data.

**Decide with your team before coding:** Which discharge scenario will the judges see? Will the patient or a verified representative grant sharing consent? Who is the reviewer in your story? Which team member owns UI, extraction, and demo preparation? The first three answers determine the sample document, permissions, and presentation.
