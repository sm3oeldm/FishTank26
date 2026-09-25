/**
 * Fictional discharge document for the hackathon demo. Patient, clinicians,
 * facilities, and phone numbers are invented; any resemblance is coincidental.
 */
export const FIXTURE_FILE_NAME = "mariam-discharge-summary.pdf";

export const FIXTURE_PAGES: string[] = [
  `AL NOOR COMMUNITY HOSPITAL (FICTIONAL) — DISCHARGE SUMMARY
Patient: Mariam A. (demo patient, synthetic record)
Ward: General Surgery, Bed 12
Admission: 21 September 2026    Discharge: 24 September 2026
Procedure: Laparoscopic cholecystectomy (gallbladder removal)
Discharging clinician: Dr. Hana Farouk (fictional)

DIAGNOSIS AND SUMMARY
Mariam was admitted with acute cholecystitis and underwent an uncomplicated laparoscopic cholecystectomy on 22 September 2026. Her recovery on the ward was routine. She is discharged home to the care of her family.

MEDICATIONS ON DISCHARGE
Collect the discharge medications from the hospital outpatient pharmacy before 6 pm today.
Take paracetamol 1 g every 6 hours as needed for pain, not more than 4 g in 24 hours.
Do not take ibuprofen until reviewed at the clinic.`,
  `FOLLOW-UP
Book a surgical clinic review within 7 days of discharge; the clinic will check the wound sites.
Return to the hospital laboratory on the morning of 27 September 2026 for a fasting blood test.
Keep the wound dressings dry and change them every 2 days or if they become wet.
Avoid lifting anything heavier than 5 kg for 2 weeks.

WHEN TO SEEK HELP
If you develop a fever above 38.5 °C, worsening abdominal pain, or yellowing of the eyes or skin, contact the surgical ward on 02-555-0142 (fictional) at any time.
If you have severe chest pain or difficulty breathing, call 998 for an ambulance.
Call the number on this sheet if the wound becomes red, swollen, or leaks fluid.

The information in this summary was reviewed with the patient and her daughter before discharge.`,
];

export const FIXTURE_TEXT = FIXTURE_PAGES.join("\n\n");
