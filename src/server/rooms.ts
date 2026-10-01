import { Room } from "@/lib/rooms/room";
import type { RoomQuiz, RoomSettings } from "@/lib/rooms/types";
import { checkText } from "@/lib/moderation";
import { db, save } from "./db";

/**
 * Rum i serverns minne. Överlever hot reload i dev via globalThis.
 * En process räcker för ett slutet test; för produktion behövs delad
 * state (t.ex. Redis eller en realtidstjänst).
 */

type G = typeof globalThis & { __kluraRooms?: Map<string, { room: Room; ownerId: string }>; __kluraRoomGc?: ReturnType<typeof setInterval> };
const g = globalThis as G;
export const rooms = (g.__kluraRooms ??= new Map());

if (!g.__kluraRoomGc) {
  g.__kluraRoomGc = setInterval(async () => {
    const now = Date.now();
    for (const [code, r] of rooms) {
      r.room.tick(now);
      if (r.room.phase === "ended" && !(r.room as Room & { __saved?: boolean }).__saved) {
        (r.room as Room & { __saved?: boolean }).__saved = true;
        const data = await db();
        data.results.unshift({ ...r.room.result(now), ownerId: r.ownerId });
        data.results = data.results.slice(0, 500);
        save();
      }
      if (now - r.room.createdAt > 4 * 3600_000) rooms.delete(code);
    }
  }, 500);
}

export function newCode(): string {
  let c = "";
  do c = String(100000 + Math.floor(Math.random() * 900000));
  while (rooms.has(c));
  return c;
}

const clamp = (n: unknown, min: number, max: number, def: number) => (typeof n === "number" && Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/** Validerar och tvättar ett quiz som kommer från klienten. */
export function sanitizeQuiz(raw: unknown): RoomQuiz | string {
  const q = raw as Partial<RoomQuiz> | null;
  if (!q || !Array.isArray(q.questions)) return "Quizet saknar frågor.";
  if (q.questions.length < 1 || q.questions.length > 100) return "Quizet måste ha 1–100 frågor.";
  const title = str(q.title, 120) || "Quiz";
  if (!checkText(title).ok) return "Titeln innehåller ord som inte är tillåtna.";
  const questions = q.questions.map((x, i) => {
    const options = (Array.isArray(x?.options) ? x.options : []).slice(0, 6).map((o) => str(o, 160));
    return {
      id: str(x?.id, 40) || `q${i}`,
      text: str(x?.text, 400),
      options,
      correct: clamp(x?.correct, 0, Math.max(0, options.length - 1), 0),
      time: clamp(x?.time, 5, 120, 20),
      explanation: str(x?.explanation, 400) || undefined,
      // Bara komprimerade bilder från byggaren (data-URL, max ~350 kB)
      image: typeof x?.image === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(x.image) && x.image.length < 480_000 ? x.image : undefined,
      concept: str(x?.concept, 60) || undefined,
    };
  });
  if (questions.some((x) => !x.text || x.options.length < 2 || x.options.some((o) => !o))) return "Alla frågor behöver text och minst två ifyllda alternativ.";
  const subjects = ["historia", "matematik", "engelska", "biologi", "geografi", "kemi", "fysik", "svenska", "samhalle", "musik"];
  return { id: str(q.id, 80) || "quiz", title, subject: (subjects.includes(q.subject as string) ? q.subject : "historia") as RoomQuiz["subject"], questions };
}

export function sanitizeSettings(raw: unknown): RoomSettings {
  const s = (raw ?? {}) as Partial<RoomSettings>;
  return {
    mode: s.mode === "fjall" ? "fjall" : "topptur",
    energy: s.energy === "lugn" || s.energy === "fullfart" ? s.energy : "standard",
    longerTime: !!s.longerTime,
    randomNames: !!s.randomNames,
    minutes: [5, 8, 12].includes(s.minutes as number) ? (s.minutes as number) : 8,
    className: str(s.className, 40) || undefined,
  };
}
