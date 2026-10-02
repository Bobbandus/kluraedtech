"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LEG_NAMES } from "@/lib/game/engine";
import { getTransport, loadPlayerToken, savePlayerToken } from "@/lib/backend";
import type { ActResult, FinalStats, GameMode, Peek, PlayerAction, PlayerView } from "@/lib/rooms/types";
import { summitHeight } from "@/lib/rooms/room";
import { nicknameProblem, randomNickname } from "@/data/people";
import { skinById } from "@/data/skins";
import { useHydrated, useStore, type LastMatch } from "@/lib/store";
import { formatCode } from "@/lib/format";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icons";
import { LogoMark } from "@/components/brand";
import { CountUp, OPT_COLORS, OPT_KEYS } from "./parts";
import ClimbScene from "./climb/ClimbScene";
import { QuestionImage } from "@/components/QuestionImage";
import ChaseGame from "./chase/ChaseGame";
import { MODE_INFO } from "@/lib/modes";
import { sfx } from "@/lib/sound";
import DefenseGame from "./defense/DefenseGame";
import s from "./game.module.css";

export default function StudentGame({ code }: { code: string }) {
  const hydrated = useHydrated();
  const student = useStore((x) => x.student);
  const setNickname = useStore((x) => x.setNickname);
  const equip = useStore((x) => x.equip);
  const transport = useMemo(() => getTransport(), []);

  const [peek, setPeek] = useState<Peek | null | undefined>(undefined);
  const [token, setToken] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    let alive = true;
    transport.peek(code).then((p) => alive && setPeek(p));
    const saved = loadPlayerToken(code);
    if (saved) setToken(saved);
    return () => {
      alive = false;
    };
  }, [code, transport]);

  useEffect(() => {
    if (hydrated && !name) setName(student.nickname || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);
  useEffect(() => {
    if (peek?.randomNames) setName(randomNickname());
  }, [peek]);

  if (!hydrated || peek === undefined) return <Loading />;

  if (peek === null) {
    return (
      <div className={s.shell}>
        <TopMini code={code} />
        <main id="innehall" className={s.center}>
          <div className={s.panel}>
            <Avatar skin="molnet" size={110} style={{ margin: "0 auto" }} />
            <h1 style={{ marginTop: 14, fontSize: "1.8rem" }}>Inget spel med koden {formatCode(code)}</h1>
            <p className="muted" style={{ marginTop: 6 }}>
              Kolla koden på tavlan och försök igen.
            </p>
            <Link href="/spela" className="btn btn-primary btn-lg" style={{ marginTop: 20 }}>
              Skriv en ny kod
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (token) {
    return (
      <Play
        code={code}
        token={token}
        onLost={() => {
          setToken(null);
          try {
            sessionStorage.removeItem(`klura-player-${code}`);
          } catch {}
        }}
      />
    );
  }

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!peek.randomNames) {
      const problem = nicknameProblem(name);
      if (problem) return setNameError(problem);
    }
    setJoining(true);
    const r = await transport.join(code, name.trim(), student.skinId);
    setJoining(false);
    if ("error" in r) return setNameError(r.error);
    if (!peek.randomNames) setNickname(name.trim());
    savePlayerToken(code, r.token);
    setToken(r.token);
  };

  return (
    <div className={s.shell}>
      <TopMini code={code} />
      <main id="innehall" className={s.center}>
        <form className={`${s.panel} stack gap-16`} onSubmit={join}>
          <div>
            <span className={s.codePill}>
              <Icon name={MODE_INFO[peek.mode].icon} size={16} /> {MODE_INFO[peek.mode].name} · {peek.quizTitle}
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
                readOnly={peek.randomNames}
                aria-invalid={!!nameError}
                aria-describedby="nick-hint"
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError(null);
                }}
                placeholder="T.ex. Alva eller Snabb Kotte"
              />
              {!peek.randomNames && (
                <button
                  type="button"
                  className="btn btn-icon"
                  style={{ minHeight: 54, width: 54 }}
                  onClick={() => {
                    setName(randomNickname());
                    setNameError(null);
                  }}
                  aria-label="Slumpa ett namn"
                >
                  <Icon name="shuffle" size={20} />
                </button>
              )}
            </div>
            <span
              id="nick-hint"
              className={nameError ? "" : "hint"}
              style={nameError ? { color: "var(--lingon-dark)", fontWeight: 600, fontSize: "0.88rem" } : undefined}
              role={nameError ? "alert" : undefined}
            >
              {nameError ?? (peek.randomNames ? "Din lärare har valt slumpade namn i det här spelet." : "Använd gärna ditt förnamn så att läraren känner igen dig.")}
            </span>
          </div>
          <div className="field" style={{ textAlign: "left" }}>
            <span className="label">Din figur</span>
            <div className={s.skinRow} role="group" aria-label="Välj figur">
              {student.owned.map((id) => (
                <button type="button" key={id} className={s.skinBtn} aria-pressed={student.skinId === id} aria-label={skinById(id).name} onClick={() => equip(id)}>
                  <Avatar skin={id} size={46} />
                </button>
              ))}
            </div>
          </div>
          <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={joining}>
            {joining ? "Går med …" : "Gå med i spelet"}
          </button>
        </form>
      </main>
    </div>
  );
}

function Loading() {
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

function usePlayerRoom(code: string, token: string, onLost: () => void) {
  const transport = useMemo(() => getTransport(), []);
  const [view, setView] = useState<PlayerView | null>(null);
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    let got = false;
    const stop = transport.playerWatch(
      code,
      token,
      (v) => {
        got = true;
        setView(v);
        setOffset(v.serverNow - Date.now());
      },
      () => onLost(),
    );
    const t = setTimeout(() => !got && onLost(), 6000);
    return () => {
      stop();
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, token, transport]);
  const act = useCallback((a: PlayerAction): Promise<ActResult> => transport.act(code, token, a), [transport, code, token]);
  return { view, offset, act };
}

function Play({ code, token, onLost }: { code: string; token: string; onLost: () => void }) {
  const { view, offset, act } = usePlayerRoom(code, token, onLost);
  if (!view) return <Loading />;
  if (view.phase === "ended") return <Finish view={view} />;
  if (view.phase === "lobby") return <Lobby view={view} />;
  if (view.mode === "fjall") return <DefenseGame view={view} act={act} clockOffset={offset} />;
  if (view.mode === "jakt") return <ChaseGame view={view} act={act} clockOffset={offset} />;
  return <Topptur view={view} act={act} offset={offset} />;
}

/* ---------- Lobby ---------- */

function Lobby({ view }: { view: PlayerView }) {
  const [hop, setHop] = useState(false);
  return (
    <div className={s.shell}>
      <TopMini code={view.code} />
      <main id="innehall" className={s.center}>
        <button
          className={s.tapAvatar}
          onClick={() => {
            setHop(false);
            requestAnimationFrame(() => setHop(true));
          }}
          aria-label="Din figur – tryck för att hoppa"
        >
          <span className={s.bigAvatar} style={{ width: 150, height: 150 }}>
            <Avatar skin={view.you.skinId} size={118} className={hop ? s.hopping : "anim-bob"} />
          </span>
        </button>
        <h1 style={{ marginTop: 14, fontSize: "2rem" }}>Du är med, {view.you.name}!</h1>
        <p className="muted" style={{ marginTop: 6 }}>
          Väntar på att matchen startar{" "}
          <span className={s.dots} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </p>
        <div className="card card-pad" style={{ marginTop: 22, maxWidth: 460, textAlign: "left" }}>
          <div className="row gap-12">
            <span className="chip chip-brand">
              <Icon name={MODE_INFO[view.mode].icon} size={14} />
              {MODE_INFO[view.mode].name}
            </span>
            <strong>{view.quizTitle}</strong>
          </div>
          <p className="muted" style={{ marginTop: 10, fontSize: "0.94rem" }}>
            {view.mode === "jakt"
              ? `Kör undan polisen i ${view.settings.minutes} minuter. Rätt svar ger en stjärna – varje stjärna höjer din poängmultiplikator. Håll mellanslag för att bli spöke och byta bil, E för att kliva ur. Blir du fast tappar du en stjärna.`
              : view.mode === "fjall"
              ? `Försvara stugan mot trollen i ${view.settings.minutes} minuter. Svara rätt för att få virke, bygg torn med virket. Trollen väntar inte medan du svarar!`
              : `${view.total} frågor i ${view.legSizes.length === 3 ? "tre etapper" : "en etapp"}. Rätt svar tar dig 100 m upp, snabbhet ger bara lite extra. Du har en Joker som tar bort två fel svar.`}
          </p>
        </div>
        <p className="eyebrow" style={{ marginTop: 26 }}>
          {view.playerCount} i lobbyn
        </p>
        <div className={s.lobbyGrid}>
          {view.lobby.map((p) => (
            <span key={p.id} className={`${s.lobbyChip} ${p.id === view.you.id ? s.you : ""}`}>
              <Avatar skin={p.skinId} size={30} /> {p.name}
            </span>
          ))}
        </div>
      </main>
    </div>
  );
}

/* ---------- Topptur ---------- */

function Topptur({ view, act, offset }: { view: PlayerView; act: (a: PlayerAction) => Promise<ActResult>; offset: number }) {
  const [picked, setPicked] = useState<{ q: number; option: number } | null>(null);
  const [removed, setRemoved] = useState<{ q: number; list: number[] } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [legBanner, setLegBanner] = useState<number | null>(null);
  const lastLeg = useRef(-1);
  const q = view.question;
  const legIndex = legOf(view.legSizes, view.qIndex);
  const finalLeg = view.legSizes.length > 1 && legIndex === view.legSizes.length - 1;

  useEffect(() => {
    if (view.phase !== "question") return;
    const iv = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(iv);
  }, [view.phase]);

  useEffect(() => {
    if (view.phase === "question" && legIndex !== lastLeg.current) {
      lastLeg.current = legIndex;
      setLegBanner(legIndex);
      const t = setTimeout(() => setLegBanner(null), 1800);
      return () => clearTimeout(t);
    }
  }, [view.phase, legIndex]);

  // Ljud när svaret visas
  const soundedQ = useRef(-1);
  useEffect(() => {
    if (view.phase === "reveal" && view.reveal && soundedQ.current !== view.qIndex) {
      soundedQ.current = view.qIndex;
      sfx(view.reveal.correct ? "correct" : "wrong");
    }
  }, [view.phase, view.reveal, view.qIndex]);

  const myPick = picked?.q === view.qIndex ? picked.option : null;
  const removedNow = view.removed.length ? view.removed : removed?.q === view.qIndex ? removed.list : [];
  const answered = view.answered || myPick !== null;

  const choose = useCallback(
    async (i: number) => {
      if (view.phase !== "question" || answered || removedNow.includes(i)) return;
      setPicked({ q: view.qIndex, option: i });
      const r = await act({ type: "answer", q: view.qIndex, option: i });
      if (!r.ok) setPicked(null);
    },
    [view.phase, view.qIndex, answered, removedNow, act],
  );

  useEffect(() => {
    if (view.phase !== "question" || !q) return;
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toUpperCase();
      const idx = ["1", "2", "3", "4", "5", "6"].indexOf(k) >= 0 ? Number(k) - 1 : OPT_KEYS.indexOf(k);
      if (idx >= 0 && idx < q.options.length) choose(idx);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view.phase, q, choose]);

  if (view.phase === "leg" && view.leg) return <LegScreen view={view} act={act} />;
  if (!q) return <Loading />;

  const revealed = view.phase === "reveal" && view.reveal;
  const remaining = view.deadline ? Math.max(0, view.deadline - (now + offset)) : 0;
  const fraction = revealed ? 1 : 1 - remaining / (q.time * 1000);
  const shownPick = revealed ? view.reveal!.yourOption : myPick;

  return (
    <div className={s.shell}>
      <div className={s.hud}>
        <div className={s.hudRow}>
          <span className={s.legPill}>
            <Icon name="mountain" size={16} />
            <span className={s.hideXs}>{view.legSizes.length > 1 ? LEG_NAMES[legIndex] : "Topptur"} ·</span> {view.qIndex + 1}/{view.total}
          </span>
          {view.you.streak >= 2 && (
            <span key={view.you.streak} className={`${s.streak} ${s.streakBump}`} aria-label={`${view.you.streak} rätt i rad`}>
              <Icon name="sun" size={16} /> {view.you.streak} i rad
            </span>
          )}
          <span className={s.height} aria-label={`Din höjd: ${view.you.score} meter`}>
            <CountUp value={revealed ? view.you.score : view.you.score} /> <small>m</small>
          </span>
        </div>
        <div className={s.climbWrap}>
          <ClimbScene
            skin={view.you.skinId}
            score={view.you.score}
            maxScore={view.maxScore}
            field={view.settings.energy === "lugn" ? [] : view.field}
            height={96}
            legs={view.legSizes.length > 1 ? [...LEG_NAMES] : []}
          />
        </div>
        <div className={`${s.timer} ${fraction > 0.75 && !answered && !revealed ? s.timerLow : ""}`} aria-hidden="true">
          <span style={{ transform: `scaleX(${Math.max(0, 1 - fraction)})` }} />
        </div>
      </div>

      <main id="innehall" className={s.stage}>
        {legBanner !== null && view.legSizes.length > 1 && (
          <div className={s.legToast} role="status">
            Etapp {legBanner + 1} · {LEG_NAMES[legBanner]}
            {finalLeg ? " · slutspurt ×1,25" : ""}
          </div>
        )}
        <div className={s.qCard} key={q.id}>
          <QuestionImage src={q.image} maxHeight="min(240px, 28vh)" />
          <h1 className={s.qText}>{q.text}</h1>
        </div>
        <div className={s.options} role="group" aria-label="Svarsalternativ">
          {q.options.map((opt, i) => {
            const isPicked = shownPick === i;
            const isRight = revealed && i === view.reveal!.correctIndex;
            const isBad = revealed && isPicked && !isRight;
            const isRemoved = removedNow.includes(i);
            const cls = [
              s.opt,
              isRight ? s.isCorrect : "",
              isBad ? s.isWrong : "",
              !revealed && isPicked ? s.picked : "",
              revealed && !isRight && !isBad ? s.faded : "",
              isRemoved ? s.removed : "",
              !revealed && answered && !isPicked ? s.faded : "",
            ].join(" ");
            return (
              <button key={`${q.id}-${i}`} className={cls} disabled={answered || !!revealed || isRemoved} onClick={() => choose(i)} aria-label={`${OPT_KEYS[i]}: ${opt}${isRight ? " – rätt svar" : ""}${isBad ? " – ditt svar, fel" : ""}`}>
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
            {!view.you.jokerUsed && !answered && q.options.length > 2 ? (
              <button
                className="btn btn-sm"
                onClick={async () => {
                  const r = await act({ type: "joker" });
                  if (r.ok && r.removed) setRemoved({ q: view.qIndex, list: r.removed });
                }}
              >
                <Icon name="sparkle" size={16} /> Använd Joker <span className="muted">(1 kvar)</span>
              </button>
            ) : (
              <span className={s.waitNote}>{view.you.jokerUsed ? "Jokern är använd" : ""}</span>
            )}
            <span className={s.waitNote} aria-live="polite">
              {answered ? `Svar inskickat · ${view.answeredCount}/${view.playerCount} har svarat` : `${view.answeredCount}/${view.playerCount} har svarat`}
            </span>
          </div>
        )}
      </main>

      {revealed && <Feedback view={view} act={act} answer={q.options[view.reveal!.correctIndex]} />}
    </div>
  );
}

function legOf(sizes: number[], q: number) {
  let acc = 0;
  for (let i = 0; i < sizes.length; i++) {
    acc += sizes[i];
    if (q < acc) return i;
  }
  return sizes.length - 1;
}

function Feedback({ view, act, answer }: { view: PlayerView; act: (a: PlayerAction) => Promise<ActResult>; answer: string }) {
  const r = view.reveal!;
  const b = r.breakdown;
  const ok = r.correct;
  const timedOut = r.yourOption === null;
  const cls = ok ? s.fbOk : timedOut ? s.fbNeutral : s.fbBad;
  return (
    <div className={`${s.feedback} ${cls}`} role="status" aria-live="assertive">
      <div className={s.fbInner}>
        <span className={s.fbIcon} style={{ background: ok ? "var(--ok)" : timedOut ? "var(--ink-3)" : "var(--lingon)" }}>
          <Icon name={ok ? "check" : timedOut ? "clock" : "x"} size={26} stroke={3} />
        </span>
        <div className="grow" style={{ minWidth: 200 }}>
          <div className={s.fbTitle} style={{ color: ok ? "var(--ok-dark)" : timedOut ? "var(--ink)" : "var(--lingon-dark)" }}>
            {ok ? (
              <>
                Rätt! +<CountUp value={r.points} duration={500} /> m
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
              {b.streak > 0 && <span className="chip chip-warn">Rad +{b.streak}</span>}
              {b.multiplier > 1 && <span className="chip chip-info">Slutspurt ×1,25</span>}
            </div>
          ) : (
            <div className={s.fbExpl}>
              Rätt svar: <strong>{answer}</strong>
            </div>
          )}
          {r.explanation && <div className={s.fbExpl} style={{ fontSize: ok ? "0.92rem" : undefined }}>{r.explanation}</div>}
          <div className="muted" style={{ fontSize: "0.85rem", marginTop: 6 }}>
            {r.classCorrectPct} % av klassen svarade rätt
          </div>
        </div>
        {view.autoHost ? (
          <button className={`btn ${ok ? "btn-primary" : "btn-dark"} btn-lg ${s.fbNext}`} style={{ ["--dur" as string]: ok ? "4.8s" : "6.5s" }} onClick={() => act({ type: "next" })}>
            Fortsätt
          </button>
        ) : (
          <span className={s.waitNote}>Läraren går vidare snart</span>
        )}
      </div>
    </div>
  );
}

function LegScreen({ view, act }: { view: PlayerView; act: (a: PlayerAction) => Promise<ActResult> }) {
  const leg = view.leg!;
  const last = leg.legIndex === view.legSizes.length - 1;
  const lugn = view.settings.energy === "lugn";
  return (
    <div className={s.shell}>
      <main id="innehall" className={s.center} style={{ justifyContent: "flex-start", paddingTop: 24 }}>
        <div className={s.panel} style={{ width: "min(640px, 100%)" }}>
          <div className={s.legHead}>
            <p className="eyebrow">{last ? "Sista etappen klar" : `Etapp ${leg.legIndex + 1} klar`}</p>
            <h1 style={{ marginTop: 6 }}>{last ? (view.you.score >= summitHeight(view.total) ? "Du nådde toppen!" : "Bra klättrat!") : leg.correct === leg.size ? "Felfri etapp!" : `${leg.correct} av ${leg.size} rätt`}</h1>
          </div>
          <div style={{ marginTop: 16 }}>
            <ClimbScene skin={view.you.skinId} score={view.you.score} maxScore={view.maxScore} field={lugn ? [] : view.field} height={210} legs={view.legSizes.length > 1 ? [...LEG_NAMES] : []} />
          </div>
          <div className={s.legStats}>
            <div className={s.stat}>
              <div className={s.statVal}>
                +<CountUp value={leg.gained} />
              </div>
              <div className={s.statLbl}>meter denna etapp</div>
            </div>
            <div className={s.stat}>
              <div className={s.statVal}>
                <CountUp value={view.you.score} />
              </div>
              <div className={s.statLbl}>total höjd</div>
            </div>
            <div className={s.stat}>
              <div className={s.statVal}>{view.you.correct}</div>
              <div className={s.statLbl}>rätt totalt</div>
            </div>
          </div>
          <div className={s.hint}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.3rem" }}>{leg.hint.title}</div>
            <div style={{ marginTop: 2 }}>{leg.hint.detail}</div>
          </div>
          {leg.board && (
            <div className={s.board} aria-label="Topp 5">
              {leg.board.map((p, i) => (
                <div key={p.id} className={s.boardRow} style={{ animationDelay: `${i * 0.05}s`, ...(p.id === view.you.id ? { borderColor: "var(--brand)", background: "var(--brand-tint)" } : {}) }}>
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
          {view.autoHost ? (
            <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 20 }} onClick={() => act({ type: "next" })}>
              {last ? "Se resultat" : `Vidare till ${LEG_NAMES[leg.legIndex + 1]}`} <Icon name="arrowRight" size={20} />
            </button>
          ) : (
            <p className="muted" style={{ marginTop: 20 }}>
              Läraren startar nästa etapp.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

/* ---------- Slut ---------- */

export function computeEarned(final: FinalStats, mode: GameMode, bestAccuracy: number) {
  const acc = final.answered ? final.correct / final.answered : 0;
  const personalBest = acc > bestAccuracy && final.answered >= 6;
  const earned: { label: string; amount: number }[] = [
    { label: "Deltagande", amount: 15 },
    { label: `${final.correct} rätt svar`, amount: Math.min(60, final.correct * 3) },
  ];
  if (final.bestStreak >= 5) earned.push({ label: `${final.bestStreak} rätt i rad`, amount: 10 });
  if (personalBest) earned.push({ label: "Nytt personbästa", amount: 15 });
  if (mode === "fjall" && (final.wave ?? 0) >= 5) earned.push({ label: `Klarade ${final.wave} vågor`, amount: Math.min(25, (final.wave ?? 0) * 2) });
  if (mode === "jakt" && (final.stars ?? 0) >= 3) earned.push({ label: `${final.stars} stjärnor`, amount: Math.min(25, (final.stars ?? 0) * 3) });
  if (final.rank <= 3) earned.push({ label: `Plats ${final.rank}`, amount: [20, 15, 10][final.rank - 1] });
  return { earned, personalBest };
}

function Finish({ view }: { view: PlayerView }) {
  const router = useRouter();
  const recordMatch = useStore((x) => x.recordMatch);
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !view.final) return;
    done.current = true;
    const f = view.final;
    const st = useStore.getState().student;
    const { earned, personalBest } = computeEarned(f, view.mode, st.bestAccuracy);
    const m: LastMatch = {
      code: view.code,
      quizTitle: view.quizTitle,
      mode: view.mode,
      rank: f.rank,
      total: f.total,
      correct: f.correct,
      questions: f.answered,
      bestStreak: f.bestStreak,
      score: f.score,
      wave: f.wave,
      stars: f.stars,
      busts: f.busts,
      earned,
      xp: f.correct * 10 + 30,
      personalBest,
      reachedSummit: view.mode === "topptur" ? f.score >= summitHeight(view.total) : false,
      energy: view.settings.energy,
      missed: f.missed,
      at: new Date().toISOString(),
    };
    recordMatch(m, { correct: f.correct, answered: f.answered, bestStreak: f.bestStreak });
    try {
      sessionStorage.removeItem(`klura-player-${view.code}`);
    } catch {}
    // Ingen cleanup: omdirigeringen ska ske även om effekten körs om (StrictMode)
    setTimeout(() => router.push("/spela/resultat"), view.mode !== "topptur" ? 2200 : 300);
  }, [view, recordMatch, router]);
  return (
    <div className={s.shell}>
      <main id="innehall" className={s.center}>
        <Avatar skin={view.you.skinId} size={110} className="anim-bob" style={{ margin: "0 auto" }} />
        <h1 className={s.introBig} style={{ marginTop: 10 }}>
          {view.mode !== "topptur" ? "Tiden är ute!" : "Matchen är slut"}
        </h1>
        {view.final?.wave !== undefined && <p className="muted">Du försvarade stugan i {view.final.wave} vågor.</p>}
        {view.final?.stars !== undefined && (
          <p className="muted">
            Du fick {view.final.score.toLocaleString("sv-SE")} poäng och slutade med ★ {view.final.stars}.
          </p>
        )}
      </main>
    </div>
  );
}
