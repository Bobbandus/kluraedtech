"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CARDS,
  ENERGY,
  LEG_NAMES,
  activateCard,
  applyAnswer,
  botAnswer,
  botChooseCard,
  endLeg,
  isLegEnd,
  legOfQuestion,
  legSizes,
  mulberry32,
  newPlayer,
  offerCards,
  positionHint,
  rankOf,
  ranked,
  resolveKapa,
  ANDRUM_FACTOR,
  type AnswerRecord,
  type CardId,
  type PlayerState,
} from "@/lib/game/engine";
import { findLive, type LiveSession } from "@/lib/live";
import { makeClassmates, nicknameProblem, randomNickname } from "@/data/people";
import { skinById } from "@/data/skins";
import { useHydrated, useStore, type LastMatch } from "@/lib/store";
import { formatCode } from "@/lib/format";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icons";
import { LogoMark } from "@/components/brand";
import { CardIcon, CountUp, OPT_COLORS, OPT_KEYS } from "./parts";
import s from "./game.module.css";

type Phase = "namn" | "lobby" | "start" | "intro" | "fraga" | "svar" | "etapp" | "vagval" | "slut";

interface Plan {
  id: string;
  option: number | null;
  time: number;
}

interface Reveal {
  rec: AnswerRecord;
  classCorrect: number;
  kapaGain: number;
  kapaLoss: number;
  shieldSaved: boolean;
}

interface LegSummary {
  leg: number;
  correct: number;
  size: number;
  gained: number;
  rank: number;
  prevRank: number;
  gapUp: number | null;
  duel: { opponent: string; won: boolean | null; you: number; them: number } | null;
}

const YOU = "you";
const CLASS_SIZE = 23;

export default function StudentGame({ code }: { code: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const student = useStore((x) => x.student);
  const setNickname = useStore((x) => x.setNickname);
  const equip = useStore((x) => x.equip);
  const recordMatch = useStore((x) => x.recordMatch);

  const [session, setSession] = useState<LiveSession | null>(null);
  useEffect(() => setSession(findLive(code)), [code]);

  const [phase, setPhase] = useState<Phase>("namn");
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && !name) setName(student.nickname || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);
  useEffect(() => {
    if (session?.settings.randomNames) setName(randomNickname());
  }, [session]);

  if (!session || !hydrated) {
    return (
      <div className={s.shell}>
        <div className={s.center}>
          <div className={s.dots} aria-label="Laddar">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    );
  }

  if (phase === "namn") {
    const owned = student.owned;
    const join = (e: React.FormEvent) => {
      e.preventDefault();
      const problem = nicknameProblem(name);
      if (problem) {
        setNameError(problem);
        return;
      }
      setNickname(name.trim());
      setPhase("lobby");
    };
    return (
      <div className={s.shell}>
        <TopMini code={code} />
        <main id="innehall" className={s.center}>
          <form className={`${s.panel} stack gap-16`} onSubmit={join}>
            <div>
              <span className={s.codePill}>
                <Icon name="flag" size={16} /> {session.quiz.title}
              </span>
            </div>
            <div className={s.bigAvatar}>
              <Avatar skin={student.skinId} size={104} className="anim-bob" />
            </div>
            <h1 style={{ fontSize: "1.9rem" }}>Vad vill du heta?</h1>
            <div className="field" style={{ textAlign: "left" }}>
              <label className="label" htmlFor="nick">
                Smeknamn
              </label>
              <div className="row gap-8">
                <input
                  id="nick"
                  className="input"
                  style={{ fontSize: "1.15rem", fontWeight: 600, height: 54 }}
                  value={name}
                  maxLength={16}
                  autoComplete="off"
                  readOnly={session.settings.randomNames}
                  aria-invalid={!!nameError}
                  aria-describedby="nick-hint"
                  onChange={(e) => {
                    setName(e.target.value);
                    setNameError(null);
                  }}
                  placeholder="T.ex. Alva eller Snabb Kotte"
                />
                <button type="button" className="btn btn-icon" style={{ minHeight: 54, width: 54 }} onClick={() => { setName(randomNickname()); setNameError(null); }} aria-label="Slumpa ett namn">
                  <Icon name="shuffle" size={20} />
                </button>
              </div>
              <span id="nick-hint" className={nameError ? "" : "hint"} style={nameError ? { color: "var(--lingon-dark)", fontWeight: 600, fontSize: "0.88rem" } : undefined} role={nameError ? "alert" : undefined}>
                {nameError ?? (session.settings.randomNames ? "Din lärare har valt slumpade namn i det här spelet." : "Använd gärna ditt förnamn så att läraren känner igen dig.")}
              </span>
            </div>
            <div className="field" style={{ textAlign: "left" }}>
              <span className="label">Din figur</span>
              <div className={s.skinRow} role="group" aria-label="Välj figur">
                {owned.map((id) => (
                  <button type="button" key={id} className={s.skinBtn} aria-pressed={student.skinId === id} aria-label={skinById(id).name} onClick={() => equip(id)}>
                    <Avatar skin={id} size={46} />
                  </button>
                ))}
              </div>
              <span className="hint">
                Fler figurer finns i <Link href="/butik" style={{ textDecoration: "underline" }}>butiken</Link>.
              </span>
            </div>
            <button className="btn btn-primary btn-lg btn-block" type="submit">
              Gå med i spelet
            </button>
          </form>
        </main>
      </div>
    );
  }

  return (
    <Match
      session={session}
      name={name.trim()}
      skin={student.skinId}
      phase={phase}
      setPhase={setPhase}
      onFinish={(m, stats) => {
        recordMatch(m, stats);
        router.push("/spela/resultat");
      }}
    />
  );
}

function TopMini({ code }: { code: string }) {
  return (
    <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px" }}>
      <Link href="/" aria-label="Lämna och gå till startsidan">
        <LogoMark size={34} />
      </Link>
      <span className={s.codePill}>
        Spelkod <strong style={{ fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{formatCode(code)}</strong>
      </span>
    </header>
  );
}

/* ====================================================================== */

function Match({
  session,
  name,
  skin,
  phase,
  setPhase,
  onFinish,
}: {
  session: LiveSession;
  name: string;
  skin: string;
  phase: Phase;
  setPhase: (p: Phase) => void;
  onFinish: (m: LastMatch, stats: { correct: number; answered: number; bestStreak: number }) => void;
}) {
  const quiz = session.quiz;
  const energy = session.settings.energy;
  const cfg = ENERGY[energy];
  const n = quiz.questions.length;
  const sizes = useMemo(() => legSizes(n), [n]);
  const seed = useMemo(() => Number(session.code) + Date.now() % 1000, [session.code]);
  const rng = useRef(mulberry32(seed));

  const mates = useMemo(() => makeClassmates(Number(session.code), CLASS_SIZE, [name]), [session.code, name]);
  const players = useRef<PlayerState[]>([]);
  if (players.current.length === 0) {
    players.current = [newPlayer(YOU, name, skin, { isYou: true }), ...mates.map((m) => newPlayer(m.id, m.name, m.skinId, { profile: m.profile }))];
  }
  const you = () => players.current[0];

  const [, force] = useState(0);
  const rerender = () => force((x) => x + 1);

  /* ---------- Lobby ---------- */
  const [joined, setJoined] = useState(6);
  const [hop, setHop] = useState(false);
  const [count, setCount] = useState(3);
  useEffect(() => {
    if (phase !== "lobby") return;
    const iv = setInterval(() => setJoined((j) => Math.min(CLASS_SIZE, j + 1 + Math.floor(Math.random() * 3))), 420);
    const t = setTimeout(() => setPhase("start"), 7200);
    return () => {
      clearInterval(iv);
      clearTimeout(t);
    };
  }, [phase, setPhase]);
  useEffect(() => {
    if (phase !== "start") return;
    setCount(3);
    const iv = setInterval(() => setCount((c) => c - 1), 800);
    const t = setTimeout(() => setPhase("intro"), 2400);
    return () => {
      clearInterval(iv);
      clearTimeout(t);
    };
  }, [phase, setPhase]);

  /* ---------- Frågor ---------- */
  const [qi, setQi] = useState(0);
  const leg = legOfQuestion(n, qi);
  const q = quiz.questions[qi];
  const finalLeg = sizes.length > 1 && leg === sizes.length - 1;
  const baseLimit = q.time * cfg.timeFactor * (session.settings.longerTime ? 1.5 : 1);

  const plans = useRef<Plan[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [answer, setAnswer] = useState<{ option: number; time: number } | null>(null);
  const [removed, setRemoved] = useState<number | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const legStartRank = useRef<number>(1);
  const legStartScore = useRef<number>(0);
  const [legSummary, setLegSummary] = useState<LegSummary | null>(null);
  const [streakBump, setStreakBump] = useState(0);

  const yourAndrum = you().card?.id === "andrum" && (you().card?.uses ?? 0) > 0;
  const yourLimit = yourAndrum ? baseLimit * ANDRUM_FACTOR : baseLimit;
  const roundLimit = Math.max(baseLimit, yourLimit);

  // Intro för etapp
  useEffect(() => {
    if (phase !== "intro") return;
    legStartRank.current = rankOf(players.current, YOU);
    legStartScore.current = you().score;
    const t = setTimeout(() => startQuestion(), 1700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const startQuestion = useCallback(() => {
    const question = quiz.questions[qi];
    const limit = question.time * cfg.timeFactor * (session.settings.longerTime ? 1.5 : 1);
    const legIdx = legOfQuestion(n, qi);
    const firstOfLeg = qi === 0 || legOfQuestion(n, qi - 1) !== legIdx;
    plans.current = players.current.slice(1).map((p) => {
      let removedOpt: number | null = null;
      if (p.card?.id === "fokus" && p.card.uses > 0 && firstOfLeg) {
        const wrong = question.options.map((_, i) => i).filter((i) => i !== question.correct);
        removedOpt = wrong[Math.floor(rng.current() * wrong.length)];
        p.card.uses = 0;
      }
      const a = botAnswer(rng.current, p.profile!, { options: question.options.length, correct: question.correct, time: question.time }, { timeLimit: limit, removedOption: removedOpt });
      return { id: p.id, option: a.option, time: a.time };
    });
    setAnswer(null);
    setRemoved(null);
    setReveal(null);
    setElapsed(0);
    setPhase("fraga");
  }, [qi, quiz, cfg.timeFactor, n, session.settings.longerTime, setPhase]);

  // Klocka
  const answeredRef = useRef(false);
  answeredRef.current = answer !== null;
  useEffect(() => {
    if (phase !== "fraga") return;
    let virt = 0;
    let last = performance.now();
    const iv = setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      virt += dt * (answeredRef.current ? 4 : 1);
      setElapsed(virt);
      const botsDone = plans.current.every((p) => p.option === null ? virt >= baseLimit : p.time <= virt);
      if (virt >= roundLimit || (answeredRef.current && botsDone)) {
        clearInterval(iv);
        doReveal();
      }
    }, 100);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, qi]);

  const doReveal = () => {
    const ps = players.current;
    const question = quiz.questions[qi];
    const before = you().score;
    const hadShield = you().card?.id === "skold" && (you().card?.uses ?? 0) > 0 && you().streak > 0;
    const myAns = answerRef.current;
    const legIdx = legOfQuestion(n, qi);
    const input = { timeLimit: baseLimit, energy, finalLeg: sizes.length > 1 && legIdx === sizes.length - 1, legIndex: legIdx };
    const rec = applyAnswer(you(), qi, myAns?.option ?? null, { ...input, correct: myAns?.option === question.correct, time: myAns?.time ?? yourLimit });
    for (const plan of plans.current) {
      const p = ps.find((x) => x.id === plan.id)!;
      applyAnswer(p, qi, plan.option, { ...input, correct: plan.option === question.correct, time: plan.time });
    }
    const afterAnswers = you().score;
    resolveKapa(ps, qi);
    const kapaDelta = you().score - afterAnswers;
    const classCorrect = ps.filter((p) => p.answers[p.answers.length - 1]?.correct).length;
    const shieldSaved = hadShield && !rec.correct && you().streak > 0;
    setReveal({ rec, classCorrect, kapaGain: Math.max(0, kapaDelta), kapaLoss: Math.max(0, -kapaDelta), shieldSaved });
    if (rec.correct && you().streak >= 2) setStreakBump((b) => b + 1);
    void before;
    setPhase("svar");
  };
  const answerRef = useRef(answer);
  answerRef.current = answer;

  const choose = (i: number) => {
    if (answer || phase !== "fraga" || i === removed) return;
    setAnswer({ option: i, time: Math.round(elapsed * 10) / 10 });
  };

  // Tangentbord: 1–4 eller A–D
  useEffect(() => {
    if (phase !== "fraga") return;
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toUpperCase();
      const idx = ["1", "2", "3", "4", "5", "6"].indexOf(k) >= 0 ? Number(k) - 1 : OPT_KEYS.indexOf(k);
      if (idx >= 0 && idx < q.options.length) choose(idx);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const next = useCallback(() => {
    if (isLegEnd(n, qi)) {
      const ps = players.current;
      const legIdx = legOfQuestion(n, qi);
      const me = you();
      const card = me.card;
      let duel: LegSummary["duel"] = null;
      // Duell kan även komma från någon annan som valt dig
      const opponentId = card?.id === "duell" ? card.targetId : ps.find((p) => p.card?.id === "duell" && p.card.targetId === YOU)?.id;
      if (opponentId) {
        const o = ps.find((p) => p.id === opponentId)!;
        const a = me.legCorrect[legIdx] ?? 0;
        const b = o.legCorrect[legIdx] ?? 0;
        duel = { opponent: o.name, won: a === b ? null : a > b, you: a, them: b };
      }
      endLeg(ps, legIdx);
      const rank = rankOf(ps, YOU);
      const order = ranked(ps);
      const above = order[rank - 2];
      setLegSummary({
        leg: legIdx,
        correct: me.legCorrect[legIdx] ?? 0,
        size: sizes[legIdx],
        gained: me.score - legStartScore.current,
        rank,
        prevRank: legStartRank.current,
        gapUp: above ? above.score - me.score + 1 : null,
        duel,
      });
      setPhase("etapp");
    } else {
      setQi((x) => x + 1);
    }
  }, [n, qi, sizes, setPhase]);

  // Starta nästa fråga när qi ändras (inom etapp)
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (phase === "svar") startQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qi]);

  // Auto-fortsätt efter feedback
  useEffect(() => {
    if (phase !== "svar" || !reveal) return;
    const dur = reveal.rec.correct ? 3600 : 6500;
    const t = setTimeout(next, dur);
    return () => clearTimeout(t);
  }, [phase, reveal, next]);

  /* ---------- Vägval ---------- */
  const [offer, setOffer] = useState<CardId[]>([]);
  const [pickedCard, setPickedCard] = useState<CardId | null>(null);
  const toVagval = () => {
    setOffer(offerCards(rng.current, energy));
    setPickedCard(null);
    setPhase("vagval");
  };
  const confirmCard = (id: CardId | null) => {
    const ps = players.current;
    const legIdx = legOfQuestion(n, qi) + 1;
    // Alla väljer samtidigt, utifrån ställningen före etappen
    const choices = ps.map((p) => ({ p, c: p.id === YOU ? id : botChooseCard(rng.current, p.profile, offerCards(rng.current, energy)) }));
    for (const { p, c } of choices) if (c) activateCard(ps, p, c, legIdx);
    setQi((x) => x + 1);
    setPhase("intro");
  };

  const finish = () => {
    const ps = players.current;
    const me = you();
    const order = ranked(ps);
    const rank = order.findIndex((p) => p.id === YOU) + 1;
    const acc = me.correct / n;
    const st = useStore.getState().student;
    const personalBest = acc > st.bestAccuracy && n >= 6;
    const summit = me.score >= summitHeight(n);
    const earned: { label: string; amount: number }[] = [
      { label: "Deltagande", amount: 15 },
      { label: `${me.correct} rätt svar`, amount: me.correct * 3 },
    ];
    if (me.bestStreak >= 5) earned.push({ label: `${me.bestStreak} rätt i rad`, amount: 10 });
    if (personalBest) earned.push({ label: "Nytt personbästa", amount: 15 });
    if (summit) earned.push({ label: "Nådde toppen", amount: 10 });
    if (rank <= 3) earned.push({ label: `Plats ${rank}`, amount: [20, 15, 10][rank - 1] });
    const missed = quiz.questions
      .map((question, i) => ({ question, rec: me.answers.find((a) => a.q === i) }))
      .filter((x) => !x.rec?.correct)
      .map((x) => ({
        text: x.question.text,
        answer: x.question.options[x.question.correct],
        yours: x.rec?.option != null ? x.question.options[x.rec.option] : null,
        explanation: x.question.explanation,
      }));
    onFinish(
      {
        code: session.code,
        quizTitle: quiz.title,
        rank,
        total: ps.length,
        correct: me.correct,
        questions: n,
        bestStreak: me.bestStreak,
        score: me.score,
        earned,
        xp: me.correct * 10 + 30,
        personalBest,
        reachedSummit: summit,
        energy,
        missed,
        at: new Date().toISOString(),
      },
      { correct: me.correct, answered: n, bestStreak: me.bestStreak },
    );
  };

  /* ---------- Render ---------- */

  if (phase === "lobby" || phase === "start") {
    const shown = players.current.slice(1, 1 + joined);
    return (
      <div className={s.shell}>
        <TopMini code={session.code} />
        <main id="innehall" className={s.center}>
          {phase === "start" ? (
            <div aria-live="assertive">
              <p className="eyebrow">Matchen börjar</p>
              <div key={count} className={s.count}>
                {Math.max(1, count)}
              </div>
            </div>
          ) : (
            <>
              <button className={s.tapAvatar} onClick={() => { setHop(false); requestAnimationFrame(() => setHop(true)); }} aria-label="Din figur – tryck för att hoppa">
                <span className={s.bigAvatar} style={{ width: 150, height: 150 }}>
                  <Avatar skin={skin} size={118} className={hop ? s.hopping : "anim-bob"} />
                </span>
              </button>
              <h1 style={{ marginTop: 14, fontSize: "2rem" }}>Du är med, {name}!</h1>
              <p className="muted" style={{ marginTop: 6 }}>
                Väntar på att läraren startar <span className={s.dots} aria-hidden="true"><span /><span /><span /></span>
              </p>
              <div className="card card-pad" style={{ marginTop: 22, maxWidth: 460, textAlign: "left" }}>
                <div className="row gap-12">
                  <span className="chip chip-brand">{cfg.label}</span>
                  <strong>{quiz.title}</strong>
                </div>
                <p className="muted" style={{ marginTop: 10, fontSize: "0.94rem" }}>
                  {n} frågor i {sizes.length === 3 ? "tre etapper" : "en etapp"}. Rätt svar ger 100 m, snabbhet bara lite extra – läs frågan ordentligt.
                </p>
              </div>
              <p className="eyebrow" style={{ marginTop: 26 }}>
                {1 + shown.length} i lobbyn
              </p>
              <div className={s.lobbyGrid}>
                <span className={`${s.lobbyChip} ${s.you}`}>
                  <Avatar skin={skin} size={30} /> {name}
                </span>
                {shown.map((p) => (
                  <span key={p.id} className={s.lobbyChip}>
                    <Avatar skin={p.skinId} size={30} /> {p.name}
                  </span>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div className={s.shell}>
        <main id="innehall" className={s.center}>
          <p className="eyebrow">
            Etapp {leg + 1} av {sizes.length}
          </p>
          <h1 className={s.introBig}>{sizes.length === 1 ? "Mot toppen" : LEG_NAMES[leg]}</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            {sizes[leg]} frågor{finalLeg ? " · Slutspurt: allt ger 25 % extra" : ""}
          </p>
          {you().card && (
            <div className={s.activeCard} style={{ marginTop: 20 }}>
              <CardIcon id={you().card!.id} size={28} />
              {CARDS[you().card!.id].name} är aktivt
            </div>
          )}
        </main>
      </div>
    );
  }

  if (phase === "etapp" && legSummary) {
    const last = legSummary.leg === sizes.length - 1;
    const order = ranked(players.current);
    const hint = positionHint(legSummary.rank, players.current.length, legSummary.prevRank, legSummary.gapUp, cfg.studentRank);
    return (
      <div className={s.shell}>
        <main id="innehall" className={s.center}>
          <div className={s.panel}>
            <div className={s.legHead}>
              <p className="eyebrow">{last ? "Matchen är klar" : `Etapp ${legSummary.leg + 1} klar`}</p>
              <h1 style={{ marginTop: 6 }}>{last ? (you().score >= summitHeight(n) ? "Du nådde toppen!" : "Bra klättrat!") : legSummary.correct === legSummary.size ? "Felfri etapp!" : `${legSummary.correct} av ${legSummary.size} rätt`}</h1>
            </div>
            <div className={s.legStats}>
              <div className={s.stat}>
                <div className={s.statVal}>
                  +<CountUp value={legSummary.gained} />
                </div>
                <div className={s.statLbl}>meter denna etapp</div>
              </div>
              <div className={s.stat}>
                <div className={s.statVal}>
                  <CountUp value={you().score} />
                </div>
                <div className={s.statLbl}>total höjd</div>
              </div>
              <div className={s.stat}>
                <div className={s.statVal}>{you().bestStreak}</div>
                <div className={s.statLbl}>längsta rad</div>
              </div>
            </div>
            {!last && (
              <div className={s.hint}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.3rem" }}>{hint.title}</div>
                <div style={{ marginTop: 2 }}>{hint.detail}</div>
              </div>
            )}
            {legSummary.duel && (
              <div className="card card-pad row gap-12" style={{ marginTop: 12, textAlign: "left" }}>
                <CardIcon id="duell" size={44} />
                <div>
                  <strong>Duell mot {legSummary.duel.opponent}</strong>
                  <div className="muted" style={{ fontSize: "0.92rem" }}>
                    {legSummary.duel.you}–{legSummary.duel.them} i rätta svar ·{" "}
                    {legSummary.duel.won === null ? "Lika – ni fick 40 m var" : legSummary.duel.won ? "Du vann +80 m" : `${legSummary.duel.opponent} tog bonusen den här gången`}
                  </div>
                </div>
              </div>
            )}
            {!last && cfg.legBoard === "topp5" && (
              <div className={s.board} aria-label="Topp 5">
                {order.slice(0, 5).map((p, i) => (
                  <div key={p.id} className={s.boardRow} style={{ animationDelay: `${i * 0.05}s`, ...(p.id === YOU ? { borderColor: "var(--brand)", background: "var(--brand-tint)" } : {}) }}>
                    <span className={s.boardRank}>{i + 1}</span>
                    <Avatar skin={p.skinId} size={30} />
                    <span className="grow" style={{ textAlign: "left" }}>
                      {p.name}
                    </span>
                    <span className="num">{p.score.toLocaleString("sv-SE")} m</span>
                  </div>
                ))}
              </div>
            )}
            <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 20 }} onClick={last ? finish : toVagval}>
              {last ? "Se resultat" : "Välj spelkort"}
              <Icon name="arrowRight" size={20} />
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (phase === "vagval") {
    return (
      <div className={s.shell}>
        <main id="innehall" className={s.center}>
          <div style={{ width: "min(720px, 100%)" }}>
            <p className="eyebrow">Vägval inför {LEG_NAMES[leg + 1] ?? "nästa etapp"}</p>
            <h1 style={{ marginTop: 6 }}>Välj ett spelkort</h1>
            <p className="muted" style={{ marginTop: 6 }}>
              Kortet gäller nästa etapp. Det kan aldrig ta bort höjd någon redan klättrat.
            </p>
            <div className={s.cards} role="group" aria-label="Spelkort">
              {offer.map((id) => (
                <button key={id} className={s.gcard} aria-pressed={pickedCard === id} onClick={() => setPickedCard(id)}>
                  <CardIcon id={id} className={s.gIcon} />
                  <div>
                    <div className={s.gName}>{CARDS[id].name}</div>
                    <div className={s.gShort}>{CARDS[id].short}</div>
                  </div>
                </button>
              ))}
            </div>
            <p className="muted" style={{ minHeight: 48, marginTop: 16, fontSize: "0.94rem" }} aria-live="polite">
              {pickedCard ? CARDS[pickedCard].description : "Tryck på ett kort för att läsa mer."}
            </p>
            <div className="row gap-12 center wrap">
              <button className="btn btn-ghost" onClick={() => confirmCard(null)}>
                Hoppa över
              </button>
              <button className="btn btn-primary btn-lg" disabled={!pickedCard} onClick={() => confirmCard(pickedCard)}>
                Välj {pickedCard ? CARDS[pickedCard].name : "kort"}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Fråga & svar
  const me = you();
  const revealed = phase === "svar";
  const fraction = Math.min(1, elapsed / yourLimit);
  const answeredCount = 1 * (answer ? 1 : 0) + plans.current.filter((p) => p.option !== null && p.time <= elapsed).length;
  const fokusAvailable = me.card?.id === "fokus" && me.card.uses > 0;

  return (
    <div className={s.shell}>
      <div className={s.hud}>
        <div className={s.hudRow}>
          <span className={s.legPill}>
            <Icon name="mountain" size={16} />
            <span className={s.hideXs}>{sizes.length > 1 ? LEG_NAMES[leg] : "Topptur"} ·</span> {qi + 1}/{n}
          </span>
          {me.streak >= 2 && (
            <span key={streakBump} className={`${s.streak} ${s.streakBump}`} aria-label={`${me.streak} rätt i rad`}>
              <Icon name="sun" size={16} /> {me.streak} i rad
            </span>
          )}
          <span className={s.height} aria-label={`Din höjd: ${me.score} meter`}>
            <CountUp value={me.score} /> <small>m</small>
          </span>
        </div>
        <div className={`${s.timer} ${fraction > 0.75 && !answer && !revealed ? s.timerLow : ""}`} aria-hidden="true">
          <span style={{ transform: `scaleX(${revealed ? 0 : 1 - fraction})` }} />
        </div>
      </div>

      <main id="innehall" className={s.stage}>
        <div className={s.qCard} key={q.id}>
          <h1 className={s.qText}>{q.text}</h1>
        </div>
        <div className={s.options} role="group" aria-label="Svarsalternativ">
          {q.options.map((opt, i) => {
            const isPicked = answer?.option === i;
            const isRight = revealed && i === q.correct;
            const isBad = revealed && isPicked && i !== q.correct;
            const cls = [s.opt, isRight ? s.isCorrect : "", isBad ? s.isWrong : "", !revealed && isPicked ? s.picked : "", revealed && !isRight && !isBad ? s.faded : "", removed === i ? s.removed : "", !revealed && answer && !isPicked ? s.faded : ""].join(" ");
            return (
              <button key={`${q.id}-${i}`} className={cls} disabled={!!answer || revealed || removed === i} onClick={() => choose(i)} aria-label={`${OPT_KEYS[i]}: ${opt}${isRight ? " – rätt svar" : ""}${isBad ? " – ditt svar, fel" : ""}`}>
                <span className={s.key} style={{ background: OPT_COLORS[i] }}>
                  {OPT_KEYS[i]}
                </span>
                <span>{opt}</span>
                {isRight && (
                  <span className={s.mark} style={{ color: "var(--ok-dark)" }}>
                    <Icon name="check" size={24} stroke={3} />
                  </span>
                )}
                {isBad && (
                  <span className={s.mark} style={{ color: "var(--lingon-dark)" }}>
                    <Icon name="x" size={24} stroke={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {!revealed && (
          <div className={s.below}>
            <div className="row gap-8">
              {me.card && (
                <span className={s.activeCard}>
                  <CardIcon id={me.card.id} size={26} />
                  {CARDS[me.card.id].name}
                  {(me.card.id === "medvind" || me.card.id === "andrum") && <span className="muted">· {me.card.uses} kvar</span>}
                </span>
              )}
              {fokusAvailable && !answer && (
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    const wrong = q.options.map((_, i) => i).filter((i) => i !== q.correct);
                    setRemoved(wrong[Math.floor(Math.random() * wrong.length)]);
                    me.card!.uses = 0;
                    rerender();
                  }}
                >
                  <Icon name="focus" size={16} /> Använd Fokus
                </button>
              )}
            </div>
            <span className={s.waitNote} aria-live="polite">
              {answer ? `Svar inskickat · ${answeredCount}/${players.current.length} har svarat` : yourAndrum ? "Andrum: du har extra tid" : `${answeredCount}/${players.current.length} har svarat`}
            </span>
          </div>
        )}
      </main>

      {revealed && reveal && <Feedback reveal={reveal} total={players.current.length} answer={q.options[q.correct]} explanation={q.explanation} timedOut={!answer} streak={me.streak} onNext={next} />}
    </div>
  );
}

export function summitHeight(n: number) {
  return n * 115;
}

function Feedback({ reveal, total, answer, explanation, timedOut, streak, onNext }: { reveal: Reveal; total: number; answer: string; explanation?: string; timedOut: boolean; streak: number; onNext: () => void }) {
  const { rec } = reveal;
  const b = rec.breakdown;
  const share = Math.round((reveal.classCorrect / total) * 100);
  const ok = rec.correct;
  const cls = ok ? s.fbOk : timedOut ? s.fbNeutral : s.fbBad;
  return (
    <div className={`${s.feedback} ${cls}`} role="status" aria-live="assertive">
      <div className={s.fbInner}>
        <span className={s.fbIcon} style={{ background: ok ? "var(--ok)" : timedOut ? "var(--ink-3)" : "var(--lingon)" }}>
          <Icon name={ok ? "check" : timedOut ? "clock" : "x"} size={28} stroke={3} />
        </span>
        <div className="grow" style={{ minWidth: 220 }}>
          <div className={s.fbTitle} style={{ color: ok ? "var(--ok-dark)" : timedOut ? "var(--ink)" : "var(--lingon-dark)" }}>
            {ok ? (
              <>
                Rätt! +<CountUp value={rec.points} duration={500} /> m
              </>
            ) : timedOut ? (
              "Tiden tog slut"
            ) : (
              "Inte den här gången"
            )}
          </div>
          {ok ? (
            <div className={s.fbChips}>
              <span className="chip chip-ok">Rätt +{b.base}</span>
              {b.speed > 0 && <span className="chip">Tempo +{b.speed}</span>}
              {b.streak > 0 && <span className="chip chip-warn">{streak} i rad +{b.streak}</span>}
              {b.card > 0 && <span className="chip chip-brand">Medvind +{b.card}</span>}
              {b.multiplier > 1 && <span className="chip chip-info">Slutspurt ×1,25</span>}
              {reveal.kapaGain > 0 && <span className="chip chip-err">Kapa +{reveal.kapaGain}</span>}
            </div>
          ) : (
            <>
              <div className={s.fbExpl}>
                Rätt svar: <strong>{answer}</strong>
              </div>
              {explanation && <div className={s.fbExpl}>{explanation}</div>}
              {reveal.shieldSaved && (
                <div className={s.fbChips}>
                  <span className="chip chip-info">Skölden räddade din rad</span>
                </div>
              )}
            </>
          )}
          {ok && explanation && <div className={s.fbExpl} style={{ fontSize: "0.92rem" }}>{explanation}</div>}
          <div className="muted" style={{ fontSize: "0.85rem", marginTop: 6 }}>
            {share} % av klassen svarade rätt
            {reveal.kapaLoss > 0 ? ` · en kapning tog ${reveal.kapaLoss} m av radbonusen` : ""}
          </div>
        </div>
        <button className={`btn ${ok ? "btn-primary" : "btn-dark"} btn-lg ${s.fbNext}`} style={{ ["--dur" as string]: ok ? "3.6s" : "6.5s" }} onClick={onNext}>
          Fortsätt
        </button>
      </div>
    </div>
  );
}
