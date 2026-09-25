# Caregiver Handoff (FishTank26)

Turns a hospital discharge sheet into a shared, source-linked care plan that a family can actually
carry out: every task and warning-sign card quotes the exact sentence it came from, a human reviewer
approves everything before caregivers see it, and each task has an owner, a deadline and a backup.

Built for the Hub71 x Devin AI health-tech hackathon. Product requirements live in
[`Caregiver_Handoff_MVP_PRD.md`](./Caregiver_Handoff_MVP_PRD.md). **Demo data is entirely fictional.**

## Stack

Next.js 15 (App Router, React 19, TypeScript) · Prisma + SQLite · Tailwind CSS · Vitest.
Optional LLM extraction via Google Gemini (`GEMINI_API_KEY`) or OpenAI (`OPENAI_API_KEY`); without a key the
app uses a deterministic fixture extractor so the whole demo runs offline. Every LLM candidate still passes
the verbatim-quote validator before a reviewer sees it.

## Run it

```bash
cp .env.example .env      # DEMO_MODE=true, SQLite at prisma/dev.db
npm install               # also runs `prisma generate`
npm run setup             # push schema + seed the fictional "Mariam" episode
npm run dev               # http://localhost:3000
```

Use the identity switcher (top right) to move between **Nurse Layla** (reviewer), **Mariam** (patient),
**Sara / Omar** (caregivers) and **Khalid** (not invited — he gets a 404 for the episode URL).

Suggested 3-minute demo: reviewer opens *Document review* → shows source quotes and the removed/rejected
drafts → *Care circle* → *Shared plan* as Omar → accept the pharmacy task → back as Layla, press **+3 h**
on the demo clock (task becomes overdue) → **+24 h** (backup Sara is escalated) → *Notifications*.

## Verify

```bash
npm run lint && npm run typecheck && npm test && npm run build
./scripts/smoke.sh        # end-to-end API checks against a running dev server
```

Tests cover: fixture-PDF import, scanned/unsupported PDF rejection, verbatim source-quote validation
(including invented doses), consent-gated publication, approval guards, guessed-URL / revoked access,
the task state machine + audit log, and idempotent reminder → overdue → backup escalation.

## Layout

```
prisma/schema.prisma          data model (Episode, Document, PlanItem, CareCircleGrant, ActivityEvent, Notification, DemoClock)
src/lib/extraction/           ingest (text / PDF via unpdf), Gemini / OpenAI / fixture extractors, verbatim validator
src/lib/services/             episodes, review/publish, circle, tasks (state machine), notifications, plan (role-scoped read model)
src/lib/access.ts             server-side care-circle enforcement (non-members get 404)
src/app/api/                  JSON API used by the UI and scripts/smoke.sh
src/components/episode/       reviewer workspace, shared plan board, care circle, activity, document viewer
src/lib/demo/                 fictional discharge document + seed
fixtures/                     generated digital-text PDF of the fixture (scripts/make-fixture-pdf.ts)
```

## Safety boundaries

- The app never invents doses, contacts or dates: a draft whose quote isn't in the document is shown as
  *rejected*, never hidden or published.
- Warning-sign cards are informational; there is no automatic triage.
- Caregivers only ever receive approved, published items — never the raw document or pending drafts.
- Publication requires recorded consent from the patient / authorised representative.
