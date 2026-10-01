import { AFFIX, ALLOW, SUBSTRING, WORD } from "./words.ts";

/**
 * Namnfilter som delas av klient och server.
 * Fångar leetspeak (n1gg4), homoglyfer (кuk), separatorer (f.i.t.t.a),
 * upprepade bokstäver (fiiitta) och mellanslag (n i g g a).
 */

const LEET: Record<string, string> = {
  "0": "o", "1": "i", "!": "i", "|": "i", "3": "e", "4": "a", "@": "a", "5": "s", "$": "s",
  "7": "t", "+": "t", "8": "b", "9": "g", "6": "g", "€": "e", "£": "l", "¡": "i",
};

const HOMO: Record<string, string> = {
  "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "у": "y", "х": "x", "к": "k", "м": "m", "т": "t",
  "н": "h", "в": "b", "і": "i", "ј": "j", "ѕ": "s", "ԁ": "d", "ɡ": "g", "ո": "n", "α": "a", "ο": "o",
  "ν": "v", "ι": "i", "κ": "k", "ρ": "p", "τ": "t", "υ": "u", "χ": "x", "ß": "ss",
};

function base(input: string, leet: boolean): string {
  let s = input.toLowerCase().normalize("NFKC").replace(/[​-‏⁠﻿­]/g, "");
  let out = "";
  for (const ch of s) out += HOMO[ch] ?? (leet && LEET[ch] ? LEET[ch] : ch);
  // Behåll åäö men ta bort övriga diakritiska tecken (é → e, ü → u)
  out = out.replace(/å/g, "\u0001").replace(/ä/g, "\u0002").replace(/ö/g, "\u0003");
  out = out.normalize("NFD").replace(/[̀-ͯ]/g, "");
  s = out.replace(/\u0001/g, "å").replace(/\u0002/g, "ä").replace(/\u0003/g, "ö");
  return s;
}

const collapse = (s: string) => s.replace(/(.)\1+/g, "$1");
const squash = (s: string) => s.replace(/[^a-zåäö0-9]/g, "");

/** Allt ihopskrivet, leetspeak avkodat, upprepningar kollapsade. */
export function normalize(input: string): string {
  return collapse(squash(base(input, true)));
}

const norm = (w: string) => collapse(squash(base(w, false)));

const SUB: string[] = [];
const WORDS: string[] = [];
for (const w of SUBSTRING) {
  const n = normalize(w);
  if (n.length >= 4) SUB.push(n);
  else WORDS.push(squash(base(w, false)));
}
for (const w of WORD) WORDS.push(squash(base(w, false)));
const AFF = AFFIX.map(norm);
const ALW = ALLOW.map(normalize).sort((a, b) => b.length - a.length);

function tokens(input: string): string[] {
  const out = new Set<string>();
  for (const v of [base(input, true), base(input, false)]) {
    for (const t of v.split(/[^a-zåäö0-9]+/)) if (t) out.add(t);
  }
  return [...out];
}

function maskAllowed(s: string): string {
  let m = s;
  for (const a of ALW) if (a.length >= 3 && m.includes(a)) m = m.split(a).join("·");
  return m;
}

function wordHit(token: string): boolean {
  const c = collapse(token);
  if (ALW.includes(normalize(token))) return false;
  return WORDS.some((w) => token === w || (c === collapse(w) && token.length >= w.length));
}

export function isInappropriate(text: string): boolean {
  if (!text.trim()) return false;
  // Asterisker ersätter ofta en vokal: f*ck, sh*t, n*gga
  if (/[*#]/.test(text)) {
    for (const v of ["a", "e", "i", "o", "u"]) if (check(text.replace(/[*#]/g, v))) return true;
  }
  return check(text);
}

function check(text: string): boolean {
  const raw = text.toLowerCase();
  if (/(^|\D)(14)?88(\D|$)/.test(raw) || /k{3}/.test(raw)) return true;

  const n = normalize(text);
  const masked = maskAllowed(n);
  if (SUB.some((w) => masked.includes(w))) return true;

  // Hela ord, och samma sak med alla mellanslag borttagna ("n i g")
  const toks = tokens(text);
  if (toks.some(wordHit)) return true;
  const joined = squash(base(text, true));
  if (joined !== toks.join("") && wordHit(joined)) return true;

  // Ihopskrivna prefix/suffix ("kukmannen", "storkuk")
  const parts = masked.split("·");
  for (const p of parts) {
    for (const a of AFF) {
      if (p.length > a.length && (p.startsWith(a) || p.endsWith(a))) return true;
    }
  }
  return false;
}

export interface Check {
  ok: boolean;
  reason?: string;
}

export function checkName(name: string): Check {
  const n = name.trim();
  if (n.length < 2) return { ok: false, reason: "Namnet behöver minst två tecken." };
  if (n.length > 16) return { ok: false, reason: "Max 16 tecken." };
  if (!/[a-zåäöéüA-ZÅÄÖÉÜ]/.test(n)) return { ok: false, reason: "Namnet behöver innehålla bokstäver." };
  if (isInappropriate(n)) return { ok: false, reason: "Välj ett annat namn – det här går inte att använda." };
  return { ok: true };
}

export function checkText(text: string): Check {
  return isInappropriate(text) ? { ok: false, reason: "Texten innehåller ord som inte är tillåtna." } : { ok: true };
}
