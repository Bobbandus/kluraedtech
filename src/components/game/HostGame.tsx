"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
  ranked,
  resolveKapa,
  type PlayerState,
} from "@/lib/game/engine";
import { findLive, type LiveSession } from "@/lib/live";
import { CLASSES, makeClassmates } from "@/data/people";
import { buildResult } from "@/lib/results";
import { useStore } from "@/lib/store";
import { formatCode } from "@/lib/format";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icons";
import { LogoMark } from "@/components/brand";
import { MountainScene } from "@/components/scene";
import { OPT_COLORS, OPT_KEYS } from "./parts";
import s from "./host.module.css";

type Phase = "lobby" | "fraga" | "svar" | "etapp" | "vagval" | "slut";

interface Plan {
  id: string;
  option: number | null;
  time: number;
}

export default function HostGame({ code, classId }: { code: string; classId: string }) {
  const [session, setSession] = useState<LiveSession | null>(null);
  useEffect(() => setSession(findLive(code)), [code]);
  if (!session) return <div className={s.shell} />;
  return <Host session={session} classId={classId} />;
}

function Host({ session, classId }: { session: LiveSession; classId: string }) {
  const router = useRouter();
  const addSession = useStore((x) => x.addSession);
  const quiz = session.quiz;
  const energy = session.settings.energy;
  const cfg = ENERGY[energy];
  const n = quiz.questions.length;
  const sizes = useMemo(() => legSizes(n), [n]);
  const cls = CLASSES.find((c) => c.id === classId) ?? CLASSES[1];
  const rng = useRef(mulberry32(Number(session.code)));
  const players = useRef<PlayerState[]>([]);
  if (!players.current.length) {
    players.current = makeClassmates(Number(session.code) + 7, cls.students).map((m) => newPlayer(m.id, m.name, m.skinId, { profile: m.profile }));
  }
  const total = players.current.length;
  const dist = useRef<number[][]>(quiz.questions.map((q) => Array(q.options.length).fill(0)));
  const unanswered = useRef<number[]>(quiz.questions.map(() => 0));

  const [phase, setPhase] = useState<Phase>("lobby");
  const [joined, setJoined] = useState(0);
  const [qi, setQi] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [cardsChosen, setCardsChosen] = useState(0);
  const [host, setHost] = useState("");
  const plans = useRef<Plan[]>([]);
  const legStartRanks = useRef<Map<string, number>>(new Map());
  const savedId = useRef<string | null>(null);

  useEffect(() => setHost(window.location.host), []);

  const q = quiz.questions[qi];
  const limit = q.time * cfg.timeFactor * (session.settings.longerTime ? 1.5 : 1);
  const leg = legOfQuestion(n, qi);

  /* Lobby: eleverna droppar in */
  useEffect(() => {
    if (phase !== "lobby") return;
    const iv = setInterval(() => setJoined((j) => Math.min(total, j + (Math.random() < 0.7 ? 1 : 2))), 520);
    return () => clearInterval(iv);
  }, [phase, total]);

  const startQuestion = useCallback(
    (index: number) => {
      const question = quiz.questions[index];
      const lim = question.time * cfg.timeFactor * (session.settings.longerTime ? 1.5 : 1);
      const legIdx = legOfQuestion(n, index);
      const first = index === 0 || legOfQuestion(n, index - 1) !== legIdx;
      if (first) legStartRanks.current = new Map(ranked(players.current).map((p, i) => [p.id, i + 1]));
      plans.current = players.current.map((p) => {
        let removed: number | null = null;
        if (p.card?.id === "fokus" && p.card.uses > 0 && first) {
          const wrong = question.options.map((_, i) => i).filter((i) => i !== question.correct);
          removed = wrong[Math.floor(rng.current() * wrong.length)];
          p.card.uses = 0;
        }
        const a = botAnswer(rng.current, p.profile!, { options: question.options.length, correct: question.correct, time: question.time }, { timeLimit: lim, removedOption: removed });
        return { id: p.id, ...a };
      });
      setQi(index);
      setElapsed(0);
      setPaused(false);
      setPhase("fraga");
    },
    [quiz, cfg.timeFactor, n, session.settings.longerTime],
  );

  const reveal = useCallback(() => {
    const legIdx = legOfQuestion(n, qi);
    for (const plan of plans.current) {
      const p = players.current.find((x) => x.id === plan.id)!;
      applyAnswer(p, qi, plan.option, {
        correct: plan.option === q.correct,
        time: plan.time,
        timeLimit: limit,
        energy,
        finalLeg: sizes.length > 1 && legIdx === sizes.length - 1,
        legIndex: legIdx,
      });
      if (plan.option === null) unanswered.current[qi]++;
      else dist.current[qi][plan.option]++;
    }
    resolveKapa(players.current, qi);
    setPhase("svar");
  }, [n, qi, q, limit, energy, sizes]);

  /* Klocka */
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  useEffect(() => {
    if (phase !== "fraga") return;
    let last = performance.now();
    let virt = 0;
    const iv = setInterval(() => {
      const now = performance.now();
      if (!pausedRef.current) virt += (now - last) / 1000;
      last = now;
      setElapsed(virt);
      const done = plans.current.every((p) => (p.option === null ? virt >= limit : p.time <= virt));
      if (virt >= limit || done) {
        clearInterval(iv);
        setTimeout(reveal, 400);
      }
    }, 100);
    return () => clearInterval(iv);
  }, [phase, qi, limit, reveal]);

  /* Vägval: eleverna väljer kort */
  useEffect(() => {
    if (phase !== "vagval") return;
    setCardsChosen(0);
    const iv = setInterval(() => setCardsChosen((c) => Math.min(total, c + 2 + Math.floor(Math.random() * 3))), 300);
    return () => clearInterval(iv);
  }, [phase, total]);

  const next = useCallback(() => {
    if (phase === "lobby") {
      if (joined > 0) {
        players.current = players.current.slice(0, Math.max(joined, 1));
        dist.current = quiz.questions.map((qq) => Array(qq.options.length).fill(0));
        startQuestion(0);
      }
      return;
    }
    if (phase === "fraga") {
      reveal();
      return;
    }
    if (phase === "svar") {
      if (isLegEnd(n, qi)) {
        endLeg(players.current, legOfQuestion(n, qi));
        setPhase(legOfQuestion(n, qi) === sizes.length - 1 ? "slut" : "etapp");
      } else startQuestion(qi + 1);
      return;
    }
    if (phase === "etapp") {
      if (session.settings.cards) setPhase("vagval");
      else startQuestion(qi + 1);
      return;
    }
    if (phase === "vagval") {
      const legIdx = legOfQuestion(n, qi) + 1;
      const choices = players.current.map((p) => ({ p, c: botChooseCard(rng.current, p.profile, offerCards(rng.current, energy)) }));
      for (const { p, c } of choices) activateCard(players.current, p, c, legIdx);
      startQuestion(qi + 1);
    }
  }, [phase, joined, n, qi, sizes, session.settings.cards, startQuestion, reveal, energy, quiz.questions]);

  // Spara resultatet när matchen är slut
  useEffect(() => {
    if (phase !== "slut" || savedId.current) return;
    const id = `r-${session.code}`;
    savedId.current = id;
    addSession(buildResult(id, quiz, cls.name, new Date().toISOString(), energy, players.current, dist.current, unanswered.current));
  }, [phase, addSession, quiz, cls.name, energy, session.code]);

  // Tangentbord: mellanslag/pil = nästa, P = paus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "BUTTON" && (e.key === " " || e.key === "Enter")) return;
      if (e.key === " " || e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        if (phase !== "slut") next();
      }
      if ((e.key === "p" || e.key === "P") && phase === "fraga") setPaused((x) => !x);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, phase]);

  const order = ranked(players.current);
  const answered = phase === "fraga" ? plans.current.filter((p) => p.option !== null && p.time <= elapsed).length : total;

  const topBar = (
    <header className={s.top}>
      <LogoMark size={36} />
      <span className={s.joinPill}>
        {host ? `${host}/spela` : "Gå med"} <strong>{formatCode(session.code)}</strong>
      </span>
      {phase !== "lobby" && phase !== "slut" && (
        <span className={s.joinPill} style={{ background: "transparent" }}>
          {sizes.length > 1 ? `Etapp ${leg + 1} · ${LEG_NAMES[leg]}` : "Topptur"} · Fråga {qi + 1} av {n}
        </span>
      )}
      <div className={s.ctrl}>
        {phase === "fraga" && (
          <button className={`btn btn-sm ${s.cbtn}`} onClick={() => setPaused((x) => !x)} aria-pressed={paused}>
            <Icon name={paused ? "play" : "pause"} size={16} /> {paused ? "Fortsätt" : "Pausa"}
          </button>
        )}
        <span className={`chip`} style={{ background: "rgba(255,255,255,.1)", color: "#fff", height: 38 }}>
          {cfg.label}
        </span>
        <Link href="/larare" className={`btn btn-sm btn-icon ${s.cbtn}`} aria-label="Avsluta och gå till översikten">
          <Icon name="x" size={18} />
        </Link>
      </div>
    </header>
  );

  /* ---------- Lobby ---------- */
  if (phase === "lobby") {
    const shown = players.current.slice(0, joined);
    return (
      <div className={s.shell}>
        {topBar}
        <main id="innehall" className={s.main}>
          <div className={s.lobbyGrid}>
            <div>
              <p className={s.url}>Gå till {host || "klura"}/spela och skriv</p>
              <div className={s.bigCode} aria-label={`Spelkod ${session.code}`}>
                {formatCode(session.code)}
              </div>
              <div className="row gap-12 wrap" style={{ marginTop: 22 }}>
                <span className={s.joinPill}>
                  <Icon name="users" size={18} /> {joined} av {total} i {cls.name}
                </span>
                <span className={s.joinPill}>{quiz.title}</span>
              </div>
              <button className="btn btn-accent btn-lg" style={{ marginTop: 28, minWidth: 220 }} onClick={next} disabled={joined === 0}>
                <Icon name="play" size={20} /> Starta matchen
              </button>
              <p style={{ marginTop: 10, color: "#8fd1b6", fontSize: "0.9rem" }}>Tips: mellanslag går till nästa steg under hela matchen.</p>
            </div>
            <div className={s.players} aria-live="polite">
              {shown.length === 0 ? (
                <p style={{ color: "#8fd1b6", fontSize: "1.2rem" }}>Väntar på att eleverna går med …</p>
              ) : (
                shown.map((p) => (
                  <span key={p.id} className={s.pchip}>
                    <Avatar skin={p.skinId} size={38} /> {p.name}
                  </span>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ---------- Fråga / svar ---------- */
  if (phase === "fraga" || phase === "svar") {
    const revealed = phase === "svar";
    const d = dist.current[qi];
    const correctN = d[q.correct];
    return (
      <div className={s.shell}>
        {topBar}
        <main id="innehall" className={s.main}>
          <div className={s.qCard} key={q.id}>
            <h1 className={s.qText}>{q.text}</h1>
          </div>
          <div className={s.opts}>
            {q.options.map((o, i) => {
              const share = total ? d[i] / total : 0;
              return (
                <div key={i} className={`${s.opt} ${revealed && i === q.correct ? s.right : ""} ${revealed && i !== q.correct ? s.dim : ""}`}>
                  {revealed && <span className={s.fill} style={{ width: `${share * 100}%` }} />}
                  <span className={s.key} style={{ background: OPT_COLORS[i] }}>
                    {OPT_KEYS[i]}
                  </span>
                  <span className={s.optText}>{o}</span>
                  {revealed && (
                    <span className={s.count}>
                      {i === q.correct && <Icon name="check" size={22} stroke={3.2} style={{ display: "inline", color: "var(--ok-dark)", marginRight: 6, verticalAlign: "-3px" }} />}
                      {d[i]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {revealed ? (
            <div className={s.bottom}>
              <div className={`${s.explain} grow`}>
                <strong>{Math.round((correctN / total) * 100)} % svarade rätt.</strong> {q.explanation ?? ""}
              </div>
              <button className="btn btn-accent btn-lg" onClick={next} autoFocus>
                {isLegEnd(n, qi) ? (legOfQuestion(n, qi) === sizes.length - 1 ? "Till målet" : "Etappen klar") : "Nästa fråga"} <Icon name="arrowRight" size={20} />
              </button>
            </div>
          ) : (
            <div className={s.bottom}>
              <div className={s.timer} aria-hidden="true">
                <span style={{ transform: `scaleX(${Math.max(0, 1 - elapsed / limit)})` }} />
              </div>
              <span className={s.answered} aria-live="polite">
                {answered}/{total} har svarat
              </span>
              <button className={`btn ${s.cbtn}`} onClick={next}>
                Visa svaret
              </button>
            </div>
          )}
          {paused && (
            <div className={s.explain} style={{ textAlign: "center" }} role="status">
              Pausat – prata fritt. Tryck P eller Fortsätt när ni är redo.
            </div>
          )}
        </main>
      </div>
    );
  }

  /* ---------- Etapp ---------- */
  if (phase === "etapp" || phase === "vagval") {
    const legIdx = legOfQuestion(n, qi);
    const start = sizes.slice(0, legIdx).reduce((a, b) => a + b, 0);
    const legQs = Array.from({ length: sizes[legIdx] }, (_, k) => start + k);
    const legAcc = legQs.reduce((a, i) => a + dist.current[i][quiz.questions[i].correct], 0) / (legQs.length * total);
    const hardest = legQs.slice().sort((a, b) => dist.current[a][quiz.questions[a].correct] - dist.current[b][quiz.questions[b].correct])[0];
    const climber = order
      .map((p) => ({ p, gain: (legStartRanks.current.get(p.id) ?? 0) - (order.indexOf(p) + 1) }))
      .sort((a, b) => b.gain - a.gain)[0];
    const totalHeight = players.current.reduce((a, p) => a + p.score, 0);
    const maxScore = Math.max(1, ...players.current.map((p) => p.score));
    return (
      <div className={s.shell}>
        {topBar}
        <main id="innehall" className={s.main}>
          <div className="row between wrap gap-12">
            <div>
              <p style={{ color: "#8fd1b6", fontWeight: 700 }}>Etapp {legIdx + 1} klar</p>
              <h1 style={{ color: "#fff", fontSize: "clamp(2rem,4vw,3rem)" }}>{LEG_NAMES[legIdx]} avklarad</h1>
            </div>
            {phase === "etapp" ? (
              <button className="btn btn-accent btn-lg" onClick={next} autoFocus>
                {session.settings.cards ? "Dags för vägval" : `Starta ${LEG_NAMES[legIdx + 1]}`} <Icon name="arrowRight" size={20} />
              </button>
            ) : (
              <button className="btn btn-accent btn-lg" onClick={next} autoFocus>
                Starta {LEG_NAMES[legIdx + 1]} <Icon name="arrowRight" size={20} />
              </button>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18 }}>
            <div className={s.panel}>
              {phase === "vagval" ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <p className="eyebrow">Vägval</p>
                  <h2 style={{ fontSize: "2rem", marginTop: 6 }}>Eleverna väljer spelkort</h2>
                  <div className="num" style={{ fontSize: "4rem", color: "var(--brand)", marginTop: 10 }}>
                    {cardsChosen}/{total}
                  </div>
                  <p className="muted">Sköld, medvind, fokus{cfg.cards.includes("duell") ? ", duell" : ""}{cfg.cards.includes("kapa") ? ", kapa" : ""} …</p>
                </div>
              ) : cfg.legBoard === "topp5" ? (
                <>
                  <h2 style={{ fontSize: "1.4rem", marginBottom: 14 }}>Topp 5</h2>
                  <div className={s.board}>
                    {order.slice(0, 5).map((p, i) => (
                      <div key={p.id} className={s.brow} style={{ animationDelay: `${i * 0.07}s` }}>
                        <span className="num" style={{ width: 28, color: "var(--ink-3)" }}>
                          {i + 1}
                        </span>
                        <Avatar skin={p.skinId} size={40} />
                        <span className="grow">{p.name}</span>
                        <span className="num">{p.score.toLocaleString("sv-SE")} m</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <h2 style={{ fontSize: "1.4rem" }}>Klassen tillsammans</h2>
                  <p className="muted" style={{ marginTop: 2 }}>
                    Ingen topplista i lugnt läge.
                  </p>
                  <div className="num" style={{ fontSize: "3rem", color: "var(--brand)", marginTop: 8 }}>
                    {totalHeight.toLocaleString("sv-SE")} m
                  </div>
                  <MountainScene climbers={players.current.slice(0, 18).map((p) => ({ id: p.id, skin: p.skinId, t: (p.score / maxScore) * 0.85 + 0.05 }))} />
                </>
              )}
            </div>
            <div className="stack gap-16">
              <div className={s.panel}>
                <p className="eyebrow">Klassen på etappen</p>
                <div className="num" style={{ fontSize: "3.2rem" }}>{Math.round(legAcc * 100)} % rätt</div>
              </div>
              <div className={s.panel}>
                <p className="eyebrow">Svåraste frågan</p>
                <div style={{ fontWeight: 750, fontSize: "1.25rem", marginTop: 4 }}>{quiz.questions[hardest].text}</div>
                <p className="muted" style={{ marginTop: 4 }}>
                  {Math.round((dist.current[hardest][quiz.questions[hardest].correct] / total) * 100)} % rätt · Rätt svar: {quiz.questions[hardest].options[quiz.questions[hardest].correct]}
                </p>
              </div>
              {climber && climber.gain > 1 && cfg.legBoard !== "klassen" && (
                <div className={s.panel} style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <Avatar skin={climber.p.skinId} size={52} />
                  <div>
                    <p className="eyebrow">Etappens klättrare</p>
                    <div style={{ fontWeight: 750, fontSize: "1.2rem" }}>
                      {climber.p.name} gick upp {climber.gain} platser
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ---------- Slut ---------- */
  const podium = order.slice(0, Math.min(3, cfg.podium));
  const acc = players.current.reduce((a, p) => a + p.correct, 0) / (total * n);
  const streakKing = players.current.slice().sort((a, b) => b.bestStreak - a.bestStreak)[0];
  const heights = [140, 190, 110];
  const placeOrder = [1, 0, 2].filter((i) => i < podium.length);
  return (
    <div className={s.shell}>
      {topBar}
      <main id="innehall" className={s.main} style={{ alignItems: "center", textAlign: "center" }}>
        <p style={{ color: "#8fd1b6", fontWeight: 700 }}>{quiz.title}</p>
        <h1 style={{ color: "#fff", fontSize: "clamp(2.2rem,5vw,3.6rem)" }}>Toppen nådd!</h1>
        <div className={s.podium} style={{ width: "100%" }}>
          {placeOrder.map((i) => {
            const p = podium[i];
            return (
              <div key={p.id} className={s.step} style={{ animationDelay: `${[0.5, 1.1, 0][i]}s` }}>
                <Avatar skin={p.skinId} size={i === 0 ? 96 : 72} style={{ margin: "0 auto" }} className={i === 0 ? "anim-bob" : undefined} />
                <div style={{ fontWeight: 800, fontSize: "1.3rem", marginTop: 6 }}>{p.name}</div>
                <div style={{ color: "#c9e6d9" }}>{p.score.toLocaleString("sv-SE")} m</div>
                <div className={s.block} style={{ height: heights[i], background: i === 0 ? "var(--sol)" : undefined, color: i === 0 ? "var(--ink)" : undefined }}>
                  {i + 1}
                </div>
              </div>
            );
          })}
        </div>
        <div className="row gap-12 wrap center" style={{ marginTop: 8 }}>
          <span className={s.joinPill}>Klassen: {Math.round(acc * 100)} % rätt</span>
          {streakKing && <span className={s.joinPill}>Längsta rad: {streakKing.name} ({streakKing.bestStreak})</span>}
        </div>
        <div className="row gap-12 wrap center" style={{ marginTop: 16 }}>
          <button className="btn btn-accent btn-lg" onClick={() => router.push(`/larare/resultat/r-${session.code}`)}>
            <Icon name="chart" size={20} /> Se vad klassen behöver repetera
          </button>
          <Link href="/larare" className={`btn btn-lg ${s.cbtn}`}>
            Till översikten
          </Link>
        </div>
      </main>
    </div>
  );
}
