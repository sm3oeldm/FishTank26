# Carely: Caregiver Handoff

**Fish Tank by Devin & Hub71 · Healthtech · Abu Dhabi, 25 Sep 2026**

The verification layer between a hospital discharge sheet and what the family actually does. Every task is traced to its source sentence, approved by a nurse, owned by a person, and escalated when it slips.

## What the demo shows
1. **AI drafts, nurse approves.** A discharge sheet becomes a care plan; each item is linked to its exact sentence.
2. **Grounded by construction.** A draft whose quote isn't in the document is **blocked** (`src/logic.js → validateDraft`), and instructions hidden inside the document are **ignored**.
3. **Consent + care circle.** The patient chooses who sees the plan; the home helper gets a limited view.
4. **Three live phones.** The daughter's (English), the son's (Arabic, RTL), and Mama's big-text Arabic view or the helper's (Tagalog).
5. **Escalation.** The demo clock makes an unclaimed task overdue, then alerts the backup 24h later. Notifications are derived from state, so the same state always gives the same alerts, with no duplicates.
6. **Audit trail.** Who did what, and when.

## Run
```bash
npm install
npm run dev     # http://localhost:5174
```
Press **N** to advance the scripted story; **← →** switch between the intro, demo and impact screens; ↻ resets.

All data is synthetic. No real patient records.
