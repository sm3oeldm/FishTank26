# Carely: 3-minute pitch

**Setup:** double-click `START-CARELY.bat` in this folder (http://localhost:5176) and press **F11** for full screen. Click **↻** (top right) to reset, then **←** to go back to the intro screen. **Internet is needed** for the AI parts.

**Controls:**
- **N** runs the next demo step; the top bar always shows what's next.
- **← →** move between the Intro, Demo and Impact screens.
- Every button can also be clicked by hand, and the timeline at the bottom can be dragged.

Speakers: **A** = story, **B** = demo (presses N), **C** = why now, business, close.

---

## 1. Hook [0:00–0:25] (A), Intro screen
> "Mama comes home from hospital after a heart stent.
> Her daughter wants to help. Her son wants to help. Her helper at home wants to help.
> Within an hour the family group chat has 43 messages: 'Did anyone get Mama's medicine?' 'I thought *you* did.'"

## 2. Problem [0:25–0:45] (A)
> "The discharge letter says *what* to do. It never says *who* is doing it.
> Research shows that bringing family caregivers into discharge planning cuts readmissions by about 25% at 90 days, but only if someone actually owns each step.
> And 2026 is the UAE's Year of Family."

→ **Meet Carely**, or press N.

## 3. Demo [0:45–2:20] (B presses N; A narrates)
| Press N | What the audience sees | What you say |
|---|---|---|
| 1 · Attach discharge document | File browser opens; pick **sample-documents → Mariam_Discharge_Letter.pdf**; the real letter appears | "The nurse uploads Mama's actual discharge letter." |
| 2 · Extract with AI | The letter is scanned; **Gemini AI** turns it into a plan; every task is linked to its sentence | "AI reads the letter and turns it into tasks. Each one is linked to the exact sentence, and we check it word for word, so the AI can't add anything the hospital didn't write." |
| 3 · Nurse confirms deadline | "Within seven days" → confirmed date | "Unclear dates are never guessed. The nurse confirms." |
| 4 · Mariam gives consent | Consent box ticks; the helper gets a limited view | "Mama decides who sees her plan." |
| 5 · Publish | Family screen: **Who's helping · Mama's plan · phone** | "Now the family has one shared plan." |
| 6 · Aisha takes the clinic booking | Aisha's card and phone update | "Aisha taps 'I'll do it'. Now everyone knows it's hers." |
| 7 · Maricel takes walks & meals | Phone switches to Maricel (limited view) | "The home helper only sees the tasks shared with her." |
| 8 · Aisha books the appointment | Moves to **Done** | — |
| *(optional)* | Click **3 · Care graph** in the top bar | "Here's the same plan as a graph: who owns what." |
| 9 · Time → today 18:00 | Popup: **notification sent to Aisha's phone**; the medicines task is late | "But nobody took the pharmacy pickup. Everyone assumed someone else did." |
| 10 · Time → next day | Popup: **notification sent to Omar's phone**; Omar's card lights up | "A day later, Carely asks the backup, Omar, to step in." |
| 11 · Omar takes it | — | "One tap: 'I'll do it'." |
| 12 · Omar picks up medicines | Done | — |
| 13 · Mama says thank you | Mama's big-text phone; hearts | "And Mama, who just wanted to rest, says thank you." |

**Chatbot moment (20s):** click **Ask about Mama's letter** and choose:
- *"Can Mama lift the laundry basket?"* → "No", quoting the letter.
- *"How much aspirin should she take?"* → **it refuses to guess**: "the letter doesn't say, call the care team".
> "The family can ask anything. Carely answers only from the letter, and shows you where it says so."

## 4. Why it's safe [2:20–2:35] (C), → Impact screen
> "AI drafts, a nurse approves. Every task is checked word for word against the letter. No dosing advice, ever. The patient controls who sees what."

## 5. Business [2:35–2:50] (C)
> "Hospitals want fewer avoidable readmissions, insurers pay for them, and home-care providers need a shared plan with the family."
> **[!] If you used Devin today, say for what, and only if it's true.**

## 6. Close [2:50–3:00] (A)
> "The discharge letter tells you what to do. **Carely makes sure someone does it.**"

---

## Judge Q&A
1. **"Is the AI real?"** Yes. Google Gemini reads the uploaded letter and drafts the plan, and the chatbot is Gemini answering from the letter only. If the AI is unavailable, the app falls back to built-in rules and says so on screen.
2. **"What if the AI makes something up?"** Every task must quote the letter word for word, and that's checked in code, not trusted to the model. The chatbot only shows quotes that really are in the letter.
3. **"Does it give medical advice?"** No. It coordinates who does what. Ask it for a dose and it refuses and points you to the care team. For urgent symptoms it says call 998.
4. **"Privacy?"** The patient chooses who sees the plan, and the helper gets a limited view. The AI key stays on the server. In production, data would be hosted in the UAE.
5. **"Isn't this just a to-do app?"** No. The tasks come from the hospital's own letter, are approved by a nurse, have an owner and a backup, and escalate automatically when missed.
6. **"What's real and what's mocked?"**
   - **Real:** uploading the PDF, reading the text, the AI extraction, the word-for-word check, the chatbot, the task states, the escalation and the audit trail.
   - **Mocked:** there are no logins, and the phones are on-screen previews (no real SMS or WhatsApp yet).
