import type { Energy } from "@/lib/game/engine";
import type { Subject } from "@/components/cover";

/**
 * Delade typer för rum (livesessioner). Samma form används av
 * LocalTransport (demo i webbläsaren) och av servern (src/server).
 */

export type GameMode = "topptur" | "fjall" | "jakt";

/** Lägen där varje elev svarar i egen takt (inte gemensamma frågor). */
export const selfPaced = (m: GameMode) => m !== "topptur";

export interface RoomSettings {
  mode: GameMode;
  energy: Energy;
  longerTime: boolean;
  randomNames: boolean;
  /** Matchlängd för lägen i egen takt (Fjällförsvar, Biljakt) */
  minutes: number;
  className?: string;
}

export interface RoomQuestion {
  id: string;
  text: string;
  options: string[];
  correct: number;
  time: number;
  explanation?: string;
  concept?: string;
  image?: string;
}

export interface RoomQuiz {
  id: string;
  title: string;
  subject: Subject;
  questions: RoomQuestion[];
}

/** En fråga utan facit – det enda eleven får se innan svaret. */
export interface PublicQuestion {
  index: number;
  id: string;
  text: string;
  options: string[];
  time: number;
  image?: string;
}

export type Phase = "lobby" | "question" | "reveal" | "leg" | "playing" | "ended";

export interface LobbyPlayer {
  id: string;
  name: string;
  skinId: string;
}

export interface BoardRow {
  id: string;
  name: string;
  skinId: string;
  score: number;
  correct: number;
  wave?: number;
  stars?: number;
}

export interface HostView {
  code: string;
  mode: GameMode;
  settings: RoomSettings;
  quizTitle: string;
  phase: Phase;
  serverNow: number;
  paused: boolean;
  players: (BoardRow & { answered: number; bestStreak: number; hp?: number; downed?: boolean; x?: number; y?: number; a?: number; busted?: boolean; busts?: number })[];
  // Topptur
  qIndex: number;
  total: number;
  legSizes: number[];
  question: RoomQuestion | null;
  deadline: number | null;
  answeredCount: number;
  distribution: number[] | null;
  // Fjällförsvar
  endsAt: number | null;
  classCorrect: number;
  classAnswered: number;
  hardest: { text: string; answer: string; accuracy: number } | null;
  /** Ifylld när matchen är slut */
  result: import("@/lib/results").SessionResult | null;
}

export interface MissedQuestion {
  text: string;
  answer: string;
  yours: string | null;
  explanation?: string;
}

export interface FinalStats {
  rank: number;
  total: number;
  correct: number;
  answered: number;
  bestStreak: number;
  score: number;
  wave?: number;
  stars?: number;
  busts?: number;
  missed: MissedQuestion[];
}

export interface RevealInfo {
  correctIndex: number;
  explanation?: string;
  yourOption: number | null;
  correct: boolean;
  points: number;
  breakdown: { base: number; speed: number; streak: number; multiplier: number };
  classCorrectPct: number;
}

export interface LegInfo {
  legIndex: number;
  correct: number;
  size: number;
  gained: number;
  hint: { title: string; detail: string };
  board: BoardRow[] | null;
}

export interface PlayerView {
  code: string;
  mode: GameMode;
  settings: Pick<RoomSettings, "energy" | "mode" | "minutes" | "randomNames">;
  quizTitle: string;
  phase: Phase;
  serverNow: number;
  paused: boolean;
  autoHost: boolean;
  you: { id: string; name: string; skinId: string; score: number; streak: number; correct: number; answered: number; jokerUsed: boolean };
  lobby: LobbyPlayer[];
  playerCount: number;
  // Topptur
  qIndex: number;
  total: number;
  legSizes: number[];
  question: PublicQuestion | null;
  deadline: number | null;
  answered: boolean;
  removed: number[];
  answeredCount: number;
  reveal: RevealInfo | null;
  leg: LegInfo | null;
  /** Anonyma figurer för klättervyn (andel av max-höjd) */
  field: { skinId: string; score: number }[];
  maxScore: number;
  // Fjällförsvar
  endsAt: number | null;
  final: FinalStats | null;
}

export type HostAction = { type: "start" } | { type: "next" } | { type: "pause" } | { type: "resume" } | { type: "end" } | { type: "kick"; playerId: string };

export interface FjallReport {
  wave: number;
  hp: number;
  score: number;
  downed: boolean;
  // Biljakt
  stars?: number;
  busts?: number;
  /** Position i staden, 0..1 */
  x?: number;
  y?: number;
  a?: number;
  busted?: boolean;
}

export type PlayerAction =
  | { type: "answer"; q: number; option: number }
  | { type: "joker" }
  | { type: "next" }
  | { type: "fjall_next" }
  | { type: "fjall_answer"; qid: string; option: number }
  | { type: "fjall_report"; state: FjallReport }
  | { type: "leave" };

export type ActResult =
  | { ok: true; removed?: number[]; question?: PublicQuestion; answer?: FjallAnswerResult }
  | { ok: false; error: string };

export interface FjallAnswerResult {
  correct: boolean;
  correctIndex: number;
  explanation?: string;
  streak: number;
}

export interface Peek {
  code: string;
  quizTitle: string;
  mode: GameMode;
  randomNames: boolean;
  phase: Phase;
}
