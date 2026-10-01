/**
 * Tolkar inklistrade frågor till quizformat.
 *
 * Format 1 – block (en tom rad mellan frågorna):
 *   Vad är huvudstaden i Norge?
 *   *Oslo
 *   Bergen
 *   Trondheim
 *
 * Format 2 – rader från ett kalkylark (tab eller semikolon):
 *   Fråga<TAB>Rätt svar<TAB>Fel svar<TAB>Fel svar
 *
 * Rader som börjar med "Förklaring:" blir förklaringen till frågan.
 * Numrering ("1.", "2)") och punkter ("- ", "• ") tas bort.
 */

export interface ParsedQuestion {
  text: string;
  options: string[];
  correct: number;
  explanation?: string;
}

export interface ParseResult {
  questions: ParsedQuestion[];
  errors: { block: number; text: string; reason: string }[];
}

const strip = (s: string) =>
  s
    .replace(/^\s*(\d+[.)]|[a-fA-F][.)]|[-•–*]?\s*\[[ xX]\]|[-•–])\s+/, "")
    .trim();

function parseTabular(lines: string[]): ParseResult {
  const res: ParseResult = { questions: [], errors: [] };
  lines.forEach((line, i) => {
    const cells = line.split(/\t|;/).map((c) => c.trim()).filter(Boolean);
    if (!cells.length) return;
    // Hoppa över rubrikrad
    if (i === 0 && /^fråga$/i.test(cells[0])) return;
    const [text, right, ...wrong] = cells;
    if (!right || !wrong.length) {
      res.errors.push({ block: i + 1, text: line.slice(0, 60), reason: "Behöver en fråga, ett rätt svar och minst ett fel svar." });
      return;
    }
    res.questions.push({ text, options: [right, ...wrong].slice(0, 6), correct: 0 });
  });
  return res;
}

export function parseQuestions(input: string): ParseResult {
  const lines = input.replace(/\r\n?/g, "\n").split("\n");
  const nonEmpty = lines.filter((l) => l.trim());
  // Kalkylarksformat: de flesta raderna har minst två tabbar/semikolon
  const tabular = nonEmpty.filter((l) => (l.match(/\t|;/g) ?? []).length >= 2).length;
  if (nonEmpty.length && tabular / nonEmpty.length > 0.6) return parseTabular(nonEmpty);

  const res: ParseResult = { questions: [], errors: [] };
  const blocks = input
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((b) => b.split("\n").map((l) => l.trim()).filter(Boolean))
    .filter((b) => b.length);

  blocks.forEach((block, bi) => {
    const [first, ...rest] = block;
    const text = strip(first);
    let explanation: string | undefined;
    const options: string[] = [];
    let correct = -1;
    for (const raw of rest) {
      const m = raw.match(/^(förklaring|forklaring|explanation)\s*:\s*(.+)$/i);
      if (m) {
        explanation = m[2].trim();
        continue;
      }
      // Ta bort punkt/numrering först så att "- *1939" och "b) *Oslo" fungerar
      const line = raw.replace(/^\s*(\d+[.)]|[a-fA-F][.)]|[-•–])\s+/, "");
      const marked = /^\s*(\*|\+|✓|✔|\(x\)|\[x\])\s*/i.test(line) || /\s*(\*|✓|✔)\s*$/.test(line);
      const clean = strip(line.replace(/^\s*(\*|\+|✓|✔|\(x\)|\[x\])\s*/i, "").replace(/\s*(\*|✓|✔)\s*$/, ""));
      if (!clean) continue;
      if (marked && correct < 0) correct = options.length;
      options.push(clean);
    }
    const reasons: string[] = [];
    if (!text) reasons.push("Frågan saknar text.");
    if (options.length < 2) reasons.push("Minst två svarsalternativ behövs.");
    if (options.length > 6) reasons.push("Max sex alternativ.");
    if (correct < 0 && options.length >= 2) reasons.push("Markera rätt svar med * framför.");
    if (reasons.length) {
      res.errors.push({ block: bi + 1, text: first.slice(0, 60), reason: reasons.join(" ") });
      return;
    }
    res.questions.push({ text, options, correct, explanation });
  });
  return res;
}
