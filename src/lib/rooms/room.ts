/**
 * Rum = en livesession. Auktoritativ spellogik för båda lägena.
 *
 * Körs i webbläsaren i demoläge (LocalTransport, med simulerade
 * klasskamrater) och på servern i lokalt backend-läge (src/server).
 * All tid skickas in som `now` (ms) så att logiken är testbar.
 */

import {
  ENERGY,
  applyAnswer,
  botAnswer,
  isLegEnd,
  jokerRemoves,
  legOfQuestion,
  legSizes,
  mulberry32,
  newPlayer,
  positionHint,
  ranked,
  shuffle,
  gaussian,
  type BotProfile,
  type PlayerState,
  type Rng,
} from "@/lib/game/engine";
import {
  READ_LOCK,
  FEEDBACK_CORRECT,
  FEEDBACK_WRONG,
  bestSpots,
  botSpend,
  createDefense,
  finalScore,
  onCorrect,
  step as stepDefense,
  type DefenseState,
} from "@/lib/game/defense";
import { CELL, createCity, seedFromCode, type City } from "@/lib/game/chase";
import { checkName } from "@/lib/moderation";
import { makeClassmates, randomNickname } from "@/data/people";
import type { SessionResult } from "@/lib/results";
import type {
  ActResult,
  BoardRow,
  FinalStats,
  FjallReport,
  HostAction,
  HostView,
  LegInfo,
  Peek,
  Phase,
  PlayerAction,
  PlayerView,
  PublicQuestion,
  RoomQuiz,
  RoomSettings,
} from "./types";
import { selfPaced } from "./types";

export const AUTO = { lobby: 7000, reveal: 4800, revealWrong: 6500, leg: 9000 };
export const summitHeight = (n: number) => n * 115;

interface RoomPlayer extends PlayerState {
  token: string;
  connected: boolean;
  removed: Record<number, number[]>;
  legStartScore: number;
  legStartRank: number;
  legInfo: LegInfo | null;
  // Fjällförsvar
  deck: number[];
  current: { index: number; servedAt: number } | null;
  report: FjallReport;
  fjallAnswers: { q: number; option: number; correct: boolean }[];
  // Bottar
  plan?: { option: number | null; time: number; joker: boolean } | null;
  defense?: DefenseState;
  nextAnswerAt?: number;
  /** Biljakt-bot: kör mellan korsningar */
  walk?: { i: number; j: number; pi: number; pj: number; k: number };
}

function token(rng: Rng): string {
  let s = "";
  for (let i = 0; i < 24; i++) s += "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(rng() * 36)];
  return s;
}

export interface RoomOptions {
  /** Fyll med simulerade klasskamrater */
  bots?: number;
  /** Rummet styr sig självt (elev som spelar demo utan lärare) */
  autoHost?: boolean;
  seed?: number;
}

export class Room {
  readonly code: string;
  readonly hostKey: string;
  readonly quiz: RoomQuiz;
  readonly settings: RoomSettings;
  readonly autoHost: boolean;
  readonly createdAt: number;
  version = 0;
  phase: Phase = "lobby";
  paused = false;
  qIndex = 0;
  qStartedAt = 0;
  deadline: number | null = null;
  phaseAt = 0;
  endsAt: number | null = null;
  pausedAt = 0;
  players: RoomPlayer[] = [];
  dist: number[][];
  unanswered: number[];
  private rng: Rng;
  private botsTarget: number;
  private botPool: ReturnType<typeof makeClassmates>;
  private lastBotJoin = 0;
  private lastSim = 0;
  private spots = bestSpots();
  private chaseCity: City | null = null;
  private listeners = new Set<() => void>();

  constructor(code: string, quiz: RoomQuiz, settings: RoomSettings, now: number, opts: RoomOptions = {}) {
    this.code = code;
    this.quiz = quiz;
    this.settings = settings;
    this.autoHost = !!opts.autoHost;
    this.createdAt = now;
    this.phaseAt = now;
    this.rng = mulberry32(opts.seed ?? Number(code) ?? 1);
    this.hostKey = token(this.rng);
    this.dist = quiz.questions.map((q) => Array(q.options.length).fill(0));
    this.unanswered = quiz.questions.map(() => 0);
    this.botsTarget = opts.bots ?? 0;
    this.botPool = this.botsTarget ? makeClassmates(Number(code) + 7, this.botsTarget) : [];
    this.lastBotJoin = now;
  }

  /* ---------- Prenumeration ---------- */

  onChange(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private bump() {
    this.version++;
    for (const l of this.listeners) l();
  }

  /* ---------- Hjälp ---------- */

  get n() {
    return this.quiz.questions.length;
  }

  private limitFor(index: number) {
    const q = this.quiz.questions[index];
    return q.time * ENERGY[this.settings.energy].timeFactor * (this.settings.longerTime ? 1.5 : 1);
  }

  private byToken(t: string) {
    return this.players.find((p) => p.token === t);
  }

  private makePlayer(name: string, skinId: string, extra: Partial<RoomPlayer> = {}): RoomPlayer {
    const base = newPlayer(`p${this.players.length + 1}-${token(this.rng).slice(0, 6)}`, name, skinId);
    const deck = shuffle(this.rng, this.quiz.questions.map((_, i) => i));
    return {
      ...base,
      token: token(this.rng),
      connected: true,
      removed: {},
      legStartScore: 0,
      legStartRank: 1,
      legInfo: null,
      deck,
      current: null,
      report: { wave: 0, hp: 20, score: 0, downed: false },
      fjallAnswers: [],
      ...extra,
    };
  }

  fjallScore(p: RoomPlayer) {
    const hp = p.report.hp;
    return p.report.score + p.correct * 25 + hp * 5;
  }

  /** Biljakt: stjärnor (aldrig fler än antal rätta svar). Rätt svar avgör vid lika. */
  private starsOf(p: RoomPlayer) {
    return Math.min(p.report.stars ?? 0, p.correct);
  }

  private scoreOf(p: RoomPlayer) {
    const m = this.settings.mode;
    return m === "fjall" ? this.fjallScore(p) : m === "jakt" ? this.starsOf(p) : p.score;
  }

  private get selfPaced() {
    return selfPaced(this.settings.mode);
  }

  private board(): BoardRow[] {
    const jakt = this.settings.mode === "jakt";
    return ranked(this.players.map((p) => ({ id: p.id, name: p.name, skinId: p.skinId, score: this.scoreOf(p), correct: p.correct, wave: p.report.wave, stars: jakt ? this.starsOf(p) : undefined })));
  }

  /* ---------- Anslutning ---------- */

  peek(): Peek {
    return { code: this.code, quizTitle: this.quiz.title, mode: this.settings.mode, randomNames: this.settings.randomNames, phase: this.phase };
  }

  join(name: string, skinId: string): { token: string; playerId: string } | { error: string } {
    if (this.phase === "ended") return { error: "Matchen är redan slut." };
    if (this.players.length >= 60) return { error: "Spelet är fullt." };
    let finalName = name.trim();
    if (this.settings.randomNames) {
      do finalName = randomNickname(this.rng);
      while (this.players.some((p) => p.name === finalName));
    } else {
      const c = checkName(finalName);
      if (!c.ok) return { error: c.reason ?? "Välj ett annat namn." };
      if (this.players.some((p) => p.name.toLowerCase() === finalName.toLowerCase())) return { error: "Någon i spelet heter redan så. Välj ett annat namn." };
    }
    const p = this.makePlayer(finalName, skinId.slice(0, 20) || "kisel");
    this.players.push(p);
    this.bump();
    return { token: p.token, playerId: p.id };
  }

  /* ---------- Lärarens handlingar ---------- */

  host(action: HostAction, now: number): { ok: boolean; error?: string } {
    switch (action.type) {
      case "start":
        if (this.phase !== "lobby") return { ok: false, error: "Redan startad" };
        if (!this.players.length) return { ok: false, error: "Ingen har gått med än" };
        this.start(now);
        break;
      case "next":
        this.advance(now);
        break;
      case "pause":
        if (!this.paused) {
          this.paused = true;
          this.pausedAt = now;
        }
        break;
      case "resume":
        if (this.paused) {
          const d = now - this.pausedAt;
          this.paused = false;
          if (this.deadline) this.deadline += d;
          if (this.endsAt) this.endsAt += d;
          this.qStartedAt += d;
          this.phaseAt += d;
        }
        break;
      case "end":
        this.end(now);
        break;
      case "kick":
        this.players = this.players.filter((p) => p.id !== action.playerId);
        break;
    }
    this.bump();
    return { ok: true };
  }

  private start(now: number) {
    this.phaseAt = now;
    if (this.selfPaced) {
      this.phase = "playing";
      this.endsAt = now + this.settings.minutes * 60_000;
      this.lastSim = now;
      for (const p of this.players) if (p.isBot) this.settings.mode === "jakt" ? this.initBotChase(p, now) : this.initBotDefense(p, now);
    } else {
      this.startQuestion(0, now);
    }
  }

  private end(now: number) {
    if (this.phase === "question") this.reveal(now);
    this.phase = "ended";
    this.phaseAt = now;
    this.deadline = null;
  }

  private advance(now: number) {
    if (this.phase === "lobby") {
      if (this.players.length) this.start(now);
    } else if (this.phase === "question") {
      this.reveal(now);
    } else if (this.phase === "reveal") {
      if (isLegEnd(this.n, this.qIndex)) this.endLeg(now);
      else this.startQuestion(this.qIndex + 1, now);
    } else if (this.phase === "leg") {
      if (this.qIndex >= this.n - 1) this.end(now);
      else this.startQuestion(this.qIndex + 1, now);
    } else if (this.phase === "playing") {
      this.end(now);
    }
  }

  /* ---------- Topptur ---------- */

  private startQuestion(i: number, now: number) {
    const firstOfLeg = i === 0 || legOfQuestion(this.n, i - 1) !== legOfQuestion(this.n, i);
    if (firstOfLeg) {
      const order = ranked(this.players);
      for (const p of this.players) {
        p.legStartScore = p.score;
        p.legStartRank = order.indexOf(p) + 1;
        p.legInfo = null;
      }
    }
    this.qIndex = i;
    this.phase = "question";
    this.qStartedAt = now;
    this.phaseAt = now;
    this.deadline = now + this.limitFor(i) * 1000;
    const q = this.quiz.questions[i];
    for (const p of this.players) {
      if (!p.isBot || !p.profile) {
        p.plan = null;
        continue;
      }
      let removed: number[] | undefined;
      let joker = false;
      if (!p.jokerUsed && q.options.length > 2 && this.rng() < 0.08 + (i / this.n) * 0.2) {
        removed = jokerRemoves(this.rng, q.options.length, q.correct);
        p.removed[i] = removed;
        p.jokerUsed = true;
        joker = true;
      }
      const a = botAnswer(this.rng, p.profile, { options: q.options.length, correct: q.correct, time: q.time }, { timeLimit: this.limitFor(i), removed });
      p.plan = { option: a.option, time: a.time, joker };
    }
  }

  private record(p: RoomPlayer, option: number | null, time: number, now: number) {
    const q = this.quiz.questions[this.qIndex];
    const leg = legOfQuestion(this.n, this.qIndex);
    const sizes = legSizes(this.n);
    if (option !== null) this.dist[this.qIndex][option]++;
    else this.unanswered[this.qIndex]++;
    applyAnswer(p, this.qIndex, option, {
      correct: option === q.correct,
      time,
      timeLimit: this.limitFor(this.qIndex),
      energy: this.settings.energy,
      finalLeg: sizes.length > 1 && leg === sizes.length - 1,
      legIndex: leg,
      joker: !!p.removed[this.qIndex],
    });
    void now;
  }

  private hasAnswered(p: RoomPlayer) {
    return p.answers.some((a) => a.q === this.qIndex);
  }

  private reveal(now: number) {
    for (const p of this.players) if (!this.hasAnswered(p)) this.record(p, null, this.limitFor(this.qIndex), now);
    this.phase = "reveal";
    this.phaseAt = now;
    this.deadline = null;
  }

  private endLeg(now: number) {
    const legIndex = legOfQuestion(this.n, this.qIndex);
    const order = ranked(this.players);
    const cfg = ENERGY[this.settings.energy];
    const board = cfg.legBoard === "topp5" ? order.slice(0, 5).map((p) => ({ id: p.id, name: p.name, skinId: p.skinId, score: p.score, correct: p.correct })) : null;
    order.forEach((p, i) => {
      const rank = i + 1;
      const above = order[i - 1];
      p.legInfo = {
        legIndex,
        correct: p.legCorrect[legIndex] ?? 0,
        size: legSizes(this.n)[legIndex],
        gained: p.score - p.legStartScore,
        hint: positionHint(rank, order.length, p.legStartRank, above ? above.score - p.score + 1 : null, cfg.studentRank),
        board,
      };
    });
    this.phase = "leg";
    this.phaseAt = now;
  }

  /* ---------- Elevens handlingar ---------- */

  act(tok: string, action: PlayerAction, now: number): ActResult {
    const p = this.byToken(tok);
    if (!p) return { ok: false, error: "Du är inte med i det här spelet." };
    p.connected = true;
    switch (action.type) {
      case "answer": {
        if (this.phase !== "question" || action.q !== this.qIndex || this.paused) return { ok: false, error: "Frågan är stängd." };
        if (this.hasAnswered(p)) return { ok: false, error: "Du har redan svarat." };
        const q = this.quiz.questions[this.qIndex];
        if (!Number.isInteger(action.option) || action.option < 0 || action.option >= q.options.length) return { ok: false, error: "Ogiltigt svar." };
        if (p.removed[this.qIndex]?.includes(action.option)) return { ok: false, error: "Ogiltigt svar." };
        this.record(p, action.option, (now - this.qStartedAt) / 1000, now);
        this.bump();
        return { ok: true };
      }
      case "joker": {
        if (this.phase !== "question" || p.jokerUsed || this.hasAnswered(p)) return { ok: false, error: "Jokern går inte att använda nu." };
        const q = this.quiz.questions[this.qIndex];
        const removed = jokerRemoves(this.rng, q.options.length, q.correct);
        p.removed[this.qIndex] = removed;
        p.jokerUsed = true;
        this.bump();
        return { ok: true, removed };
      }
      case "next": {
        if (!this.autoHost) return { ok: false, error: "Läraren styr tempot." };
        if (this.phase === "reveal" || this.phase === "leg") this.advance(now);
        this.bump();
        return { ok: true };
      }
      case "fjall_next": {
        if (this.phase !== "playing") return { ok: false, error: "Matchen pågår inte." };
        if (!p.current) p.current = { index: this.drawCard(p), servedAt: now };
        const q = this.quiz.questions[p.current.index];
        return { ok: true, question: { index: p.current.index, id: q.id, text: q.text, options: q.options, time: q.time, image: q.image } };
      }
      case "fjall_answer": {
        if (this.phase !== "playing" || !p.current) return { ok: false, error: "Ingen fråga är öppen." };
        const q = this.quiz.questions[p.current.index];
        if (q.id !== action.qid) return { ok: false, error: "Fel fråga." };
        if (now - p.current.servedAt < READ_LOCK * 1000 - 250) return { ok: false, error: "Läs frågan först." };
        if (!Number.isInteger(action.option) || action.option < 0 || action.option >= q.options.length) return { ok: false, error: "Ogiltigt svar." };
        const correct = action.option === q.correct;
        this.fjallRecord(p, p.current.index, action.option, correct);
        p.current = null;
        this.bump();
        return { ok: true, answer: { correct, correctIndex: q.correct, explanation: q.explanation, streak: p.streak } };
      }
      case "fjall_report": {
        const s = action.state;
        if (!s || typeof s !== "object") return { ok: false, error: "Ogiltig rapport." };
        if (this.settings.mode === "jakt") {
          const clamp01 = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.5);
          p.report = {
            wave: 0,
            hp: 0,
            score: 0,
            downed: false,
            stars: Math.max(0, Math.min(p.correct, Math.floor(Number(s.stars) || 0))),
            busts: Math.max(0, Math.min(999, Math.floor(Number(s.busts) || 0))),
            x: clamp01(s.x),
            y: clamp01(s.y),
            a: typeof s.a === "number" && Number.isFinite(s.a) ? s.a : 0,
            busted: !!s.busted,
          };
          this.bump();
          return { ok: true };
        }
        p.report = {
          wave: Math.max(0, Math.min(999, Math.floor(s.wave))),
          hp: Math.max(0, Math.min(20, Math.floor(s.hp))),
          // Rimlighetsgräns: poäng kan inte växa orimligt fort
          score: Math.max(0, Math.min(Math.floor(s.score), (now - (this.phaseAt || now)) / 1000 * 40 + 500)),
          downed: !!s.downed,
        };
        this.bump();
        return { ok: true };
      }
      case "leave": {
        p.connected = false;
        this.bump();
        return { ok: true };
      }
    }
  }

  /* ---------- Fjällförsvar ---------- */

  private drawCard(p: RoomPlayer): number {
    if (!p.deck.length) p.deck = shuffle(this.rng, this.quiz.questions.map((_, i) => i));
    return p.deck.shift()!;
  }

  private fjallRecord(p: RoomPlayer, qi: number, option: number, correct: boolean) {
    this.dist[qi][option]++;
    p.answered++;
    if (correct) {
      p.correct++;
      p.streak++;
      p.bestStreak = Math.max(p.bestStreak, p.streak);
    } else {
      p.streak = 0;
      // Fel besvarade frågor kommer tillbaka snart (repetition)
      const at = Math.min(p.deck.length, 2 + Math.floor(this.rng() * 3));
      p.deck.splice(at, 0, qi);
    }
    p.fjallAnswers.push({ q: qi, option, correct });
  }

  /* ---------- Biljakt-bottar ---------- */

  private city(): City {
    if (!this.chaseCity) this.chaseCity = createCity(seedFromCode(this.code));
    return this.chaseCity;
  }

  private initBotChase(p: RoomPlayer, now: number) {
    const c = this.city();
    const i = Math.floor(this.rng() * c.roadsX.length);
    const j = Math.floor(this.rng() * c.roadsY.length);
    p.walk = { i, j, pi: i, pj: j, k: 1 };
    p.report = { wave: 0, hp: 0, score: 0, downed: false, stars: 0, busts: 0, x: 0.5, y: 0.5, a: 0, busted: false };
    p.nextAnswerAt = now + (12 + this.rng() * 10) * 1000;
  }

  private stepBotChase(p: RoomPlayer, dt: number) {
    const c = this.city();
    const w = p.walk!;
    // Gå vidare längs vägnätet: från (pi,pj) mot (i,j)
    w.k += (dt * 280) / (CELL * 6);
    if (w.k >= 1) {
      const opts: [number, number][] = [];
      if (w.i > 0 && !c.removed.has(`h:${w.i - 1}:${w.j}`)) opts.push([w.i - 1, w.j]);
      if (w.i < c.roadsX.length - 1 && !c.removed.has(`h:${w.i}:${w.j}`)) opts.push([w.i + 1, w.j]);
      if (w.j > 0 && !c.removed.has(`v:${w.i}:${w.j - 1}`)) opts.push([w.i, w.j - 1]);
      if (w.j < c.roadsY.length - 1 && !c.removed.has(`v:${w.i}:${w.j}`)) opts.push([w.i, w.j + 1]);
      const fwd = opts.filter(([a, b]) => a !== w.pi || b !== w.pj);
      const [ni, nj] = (fwd.length ? fwd : opts)[Math.floor(this.rng() * (fwd.length || opts.length))] ?? [w.i, w.j];
      w.pi = w.i;
      w.pj = w.j;
      w.i = ni;
      w.j = nj;
      w.k = 0;
    }
    const ax = (c.roadsX[w.pi] + 1) * CELL;
    const ay = (c.roadsY[w.pj] + 1) * CELL;
    const bx = (c.roadsX[w.i] + 1) * CELL;
    const by = (c.roadsY[w.j] + 1) * CELL;
    const r = p.report;
    r.x = (ax + (bx - ax) * w.k) / c.w;
    r.y = (ay + (by - ay) * w.k) / c.h;
    if (bx !== ax || by !== ay) r.a = Math.atan2(by - ay, bx - ax);
    // Ibland åker boten fast (oftare med fler stjärnor)
    const stars = r.stars ?? 0;
    if (r.busted) {
      if (this.rng() < dt / 2.6) r.busted = false;
    } else if (this.rng() < dt * (0.004 + stars * 0.0035)) {
      r.busted = true;
      r.busts = (r.busts ?? 0) + 1;
      r.stars = Math.max(0, stars - 1);
    }
  }

  private initBotDefense(p: RoomPlayer, now: number) {
    p.defense = createDefense(Math.floor(this.rng() * 1e6));
    p.nextAnswerAt = now + this.botReadTime(p) * 1000;
  }

  private botReadTime(p: RoomPlayer) {
    const base = 2.5 + (p.profile?.pace ?? 0.4) * 14;
    return Math.max(READ_LOCK + 0.5, base * Math.exp(gaussian(this.rng) * 0.3));
  }

  private simulateBots(now: number) {
    const until = Math.min(now, this.endsAt ?? now);
    const DT = 0.25;
    while (this.lastSim + DT * 1000 <= until) {
      this.lastSim += DT * 1000;
      for (const p of this.players) {
        if (p.isBot && p.walk) {
          this.stepBotChase(p, DT);
          if (p.nextAnswerAt !== undefined && this.lastSim >= p.nextAnswerAt && !p.report.busted) {
            const qi = this.drawCard(p);
            const q = this.quiz.questions[qi];
            const a = botAnswer(this.rng, p.profile!, { options: q.options.length, correct: q.correct, time: 30 }, { timeLimit: 999 });
            const option = a.option ?? 0;
            const correct = option === q.correct;
            this.fjallRecord(p, qi, option, correct);
            if (correct) p.report.stars = (p.report.stars ?? 0) + 1;
            // Mätaren fylls igen: snabbare för den som kör bra
            p.nextAnswerAt = this.lastSim + (this.botReadTime(p) + (correct ? 12 + this.rng() * 8 : 6 + this.rng() * 4)) * 1000;
          }
          continue;
        }
        if (!p.isBot || !p.defense) continue;
        stepDefense(p.defense, DT);
        if (p.nextAnswerAt !== undefined && this.lastSim >= p.nextAnswerAt) {
          const qi = this.drawCard(p);
          const q = this.quiz.questions[qi];
          const a = botAnswer(this.rng, p.profile!, { options: q.options.length, correct: q.correct, time: 30 }, { timeLimit: 999 });
          const option = a.option ?? 0;
          const correct = option === q.correct;
          this.fjallRecord(p, qi, option, correct);
          if (correct) onCorrect(p.defense, p.streak);
          botSpend(p.defense, this.rng, this.spots);
          p.nextAnswerAt = this.lastSim + (this.botReadTime(p) + (correct ? FEEDBACK_CORRECT : FEEDBACK_WRONG)) * 1000;
        }
        p.report = { wave: p.defense.wavesCleared, hp: p.defense.hp, score: p.defense.score, downed: p.defense.downed };
      }
    }
  }

  /* ---------- Tid ---------- */

  tick(now: number): void {
    let changed = false;
    // Simulerade klasskamrater droppar in
    if (this.phase === "lobby" && this.botPool.length && now - this.lastBotJoin > 380) {
      const b = this.botPool.shift()!;
      this.players.push(this.makePlayer(b.name, b.skinId, { isBot: true, profile: b.profile as BotProfile }));
      this.lastBotJoin = now;
      changed = true;
    }
    if (this.paused) {
      if (changed) this.bump();
      return;
    }
    if (this.phase === "lobby" && this.autoHost && now - this.createdAt > AUTO.lobby && this.players.length) {
      this.start(now);
      changed = true;
    }
    if (this.phase === "question") {
      const elapsed = (now - this.qStartedAt) / 1000;
      // Om alla riktiga spelare har svarat går tiden fortare för bottarna
      const humansDone = this.players.filter((p) => !p.isBot).every((p) => this.hasAnswered(p));
      const effective = humansDone && this.autoHost ? elapsed * 3 : elapsed;
      for (const p of this.players) {
        if (p.isBot && p.plan && !this.hasAnswered(p) && p.plan.option !== null && p.plan.time <= effective) {
          this.record(p, p.plan.option, p.plan.time, now);
          changed = true;
        }
      }
      const allDone = this.players.every((p) => this.hasAnswered(p));
      if (allDone || (this.deadline !== null && now >= this.deadline) || (humansDone && this.autoHost && effective >= this.limitFor(this.qIndex))) {
        this.reveal(now);
        changed = true;
      }
    } else if (this.autoHost && this.phase === "reveal") {
      const human = this.players.find((p) => !p.isBot);
      const wrong = human && !human.answers.find((a) => a.q === this.qIndex)?.correct;
      if (now - this.phaseAt > (wrong ? AUTO.revealWrong : AUTO.reveal)) {
        this.advance(now);
        changed = true;
      }
    } else if (this.autoHost && this.phase === "leg" && now - this.phaseAt > AUTO.leg) {
      this.advance(now);
      changed = true;
    } else if (this.phase === "playing") {
      const before = this.players.reduce((a, p) => a + p.answered, 0);
      this.simulateBots(now);
      if (this.players.reduce((a, p) => a + p.answered, 0) !== before) changed = true;
      if (this.endsAt !== null && now >= this.endsAt) {
        this.end(now);
        changed = true;
      }
    }
    if (changed) this.bump();
  }

  /* ---------- Vyer ---------- */

  private hardest() {
    let best: { text: string; answer: string; accuracy: number } | null = null;
    this.quiz.questions.forEach((q, i) => {
      const total = this.dist[i].reduce((a, b) => a + b, 0);
      if (total < 3) return;
      const acc = this.dist[i][q.correct] / total;
      if (!best || acc < best.accuracy) best = { text: q.text, answer: q.options[q.correct], accuracy: acc };
    });
    return best;
  }

  hostView(now: number): HostView {
    const fj = this.selfPaced;
    const jakt = this.settings.mode === "jakt";
    return {
      code: this.code,
      mode: this.settings.mode,
      settings: this.settings,
      quizTitle: this.quiz.title,
      phase: this.phase,
      serverNow: now,
      paused: this.paused,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        skinId: p.skinId,
        score: this.scoreOf(p),
        correct: p.correct,
        answered: p.answered,
        bestStreak: p.bestStreak,
        wave: p.report.wave,
        hp: p.report.hp,
        downed: p.report.downed,
        ...(jakt ? { stars: this.starsOf(p), x: p.report.x, y: p.report.y, a: p.report.a, busted: p.report.busted, busts: p.report.busts } : {}),
      })),
      qIndex: this.qIndex,
      total: this.n,
      legSizes: legSizes(this.n),
      question: this.phase === "lobby" || fj ? null : this.quiz.questions[this.qIndex],
      deadline: this.deadline,
      answeredCount: this.phase === "question" ? this.players.filter((p) => this.hasAnswered(p)).length : this.players.length,
      distribution: this.phase === "reveal" || this.phase === "leg" ? this.dist[this.qIndex] : null,
      endsAt: this.endsAt,
      classCorrect: this.players.reduce((a, p) => a + p.correct, 0),
      classAnswered: this.players.reduce((a, p) => a + p.answered, 0),
      hardest: this.hardest(),
      result: this.phase === "ended" ? this.result(now) : null,
    };
  }

  playerView(tok: string, now: number): PlayerView | null {
    const p = this.byToken(tok);
    if (!p) return null;
    const q = this.quiz.questions[this.qIndex];
    const rec = p.answers.find((a) => a.q === this.qIndex);
    const showQ = this.phase === "question" || this.phase === "reveal";
    const others = this.players.filter((x) => x.id !== p.id);
    const maxScore = Math.max(summitHeight(this.n), ...this.players.map((x) => x.score));
    const total = this.players.length || 1;
    return {
      code: this.code,
      mode: this.settings.mode,
      settings: { energy: this.settings.energy, mode: this.settings.mode, minutes: this.settings.minutes, randomNames: this.settings.randomNames },
      quizTitle: this.quiz.title,
      phase: this.phase,
      serverNow: now,
      paused: this.paused,
      autoHost: this.autoHost,
      you: { id: p.id, name: p.name, skinId: p.skinId, score: this.scoreOf(p), streak: p.streak, correct: p.correct, answered: p.answered, jokerUsed: p.jokerUsed },
      lobby: this.players.slice(-40).map((x) => ({ id: x.id, name: x.name, skinId: x.skinId })),
      playerCount: this.players.length,
      qIndex: this.qIndex,
      total: this.n,
      legSizes: legSizes(this.n),
      question: showQ && this.settings.mode === "topptur" ? { index: this.qIndex, id: q.id, text: q.text, options: q.options, time: this.limitFor(this.qIndex), image: q.image } : null,
      deadline: this.deadline,
      answered: !!rec,
      removed: p.removed[this.qIndex] ?? [],
      answeredCount: this.players.filter((x) => this.hasAnswered(x)).length,
      reveal:
        this.phase === "reveal" && rec
          ? {
              correctIndex: q.correct,
              explanation: q.explanation,
              yourOption: rec.option,
              correct: rec.correct,
              points: rec.points,
              breakdown: rec.breakdown,
              classCorrectPct: Math.round((this.dist[this.qIndex][q.correct] / total) * 100),
            }
          : null,
      leg: this.phase === "leg" ? p.legInfo : null,
      field: others.map((x) => ({ skinId: x.skinId, score: x.score })),
      maxScore,
      endsAt: this.endsAt,
      final: this.phase === "ended" ? this.finalFor(p) : null,
    };
  }

  private finalFor(p: RoomPlayer): FinalStats {
    const order = this.board();
    const fj = this.selfPaced;
    const jakt = this.settings.mode === "jakt";
    const missed = fj
      ? Array.from(new Map(p.fjallAnswers.filter((a) => !a.correct).map((a) => [a.q, a])).values())
      : this.quiz.questions.map((_, i) => ({ q: i, rec: p.answers.find((a) => a.q === i) })).filter((x) => !x.rec?.correct).map((x) => ({ q: x.q, option: x.rec?.option ?? null }));
    return {
      rank: order.findIndex((r) => r.id === p.id) + 1,
      total: order.length,
      correct: p.correct,
      answered: fj ? p.answered : this.n,
      bestStreak: p.bestStreak,
      score: this.scoreOf(p),
      wave: this.settings.mode === "fjall" ? p.report.wave : undefined,
      stars: jakt ? this.starsOf(p) : undefined,
      busts: jakt ? (p.report.busts ?? 0) : undefined,
      missed: missed.slice(0, 8).map((m) => {
        const q = this.quiz.questions[m.q];
        return { text: q.text, answer: q.options[q.correct], yours: m.option !== null && m.option !== undefined ? q.options[m.option] : null, explanation: q.explanation };
      }),
    };
  }

  result(now: number): SessionResult {
    const fj = this.selfPaced;
    const order = this.board();
    return {
      id: `r-${this.code}`,
      quizId: this.quiz.id,
      quizTitle: this.quiz.title,
      subject: this.quiz.subject,
      className: this.settings.className ?? "Klassen",
      date: new Date(this.createdAt || now).toISOString(),
      energy: this.settings.energy,
      mode: this.settings.mode,
      players: order.map((row, i) => {
        const p = this.players.find((x) => x.id === row.id)!;
        return {
          id: p.id,
          name: p.name,
          skinId: p.skinId,
          score: row.score,
          correct: p.correct,
          answered: p.answered,
          bestStreak: p.bestStreak,
          rank: i + 1,
          answers: this.quiz.questions.map((_, qi) =>
            fj ? (p.fjallAnswers.filter((a) => a.q === qi).pop()?.option ?? null) : (p.answers.find((a) => a.q === qi)?.option ?? null),
          ),
        };
      }),
      questions: this.quiz.questions.map((q, qi) => ({
        text: q.text,
        options: q.options,
        correct: q.correct,
        concept: q.concept,
        explanation: q.explanation,
        distribution: this.dist[qi],
        unanswered: this.unanswered[qi],
      })),
    };
  }
}

export function publicQuestion(q: RoomQuiz["questions"][number], index: number): PublicQuestion {
  return { index, id: q.id, text: q.text, options: q.options, time: q.time, image: q.image };
}
