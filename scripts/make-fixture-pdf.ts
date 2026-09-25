import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { FIXTURE_PAGES } from "../src/lib/demo/fixture";

const OUT = resolve(process.cwd(), "fixtures/mariam-discharge-summary.pdf");

function wrap(text: string, max: number): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      if ((line + " " + word).trim().length > max) {
        lines.push(line.trim());
        line = word;
      } else {
        line = `${line} ${word}`;
      }
    }
    lines.push(line.trim());
  }
  return lines;
}

async function main() {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const pageText of FIXTURE_PAGES) {
    const page = pdf.addPage([595, 842]);
    let y = 800;
    for (const line of wrap(pageText, 95)) {
      page.drawText(line, { x: 40, y, size: 10, font });
      y -= 14;
    }
  }
  const bytes = await pdf.save();
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, bytes);
  console.log(`Wrote ${OUT} (${bytes.byteLength} bytes, ${FIXTURE_PAGES.length} pages)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
