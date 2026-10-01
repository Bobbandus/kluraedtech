"use client";

import Link from "next/link";
import { useState } from "react";
import { StudentNav } from "@/components/nav";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icons";
import { GnistaIcon } from "@/components/brand";
import { SKINS, RARITY, skinById } from "@/data/skins";
import { nicknameProblem } from "@/data/people";
import { useHydrated, useStore, levelFromXp } from "@/lib/store";

export default function Profile() {
  const hydrated = useHydrated();
  const st = useStore((x) => x.student);
  const prefs = useStore((x) => x.prefs);
  const setPrefs = useStore((x) => x.setPrefs);
  const setNickname = useStore((x) => x.setNickname);
  const equip = useStore((x) => x.equip);
  const claim = useStore((x) => x.claimQuest);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (!hydrated) return <StudentNav />;
  const lvl = levelFromXp(st.xp);
  const acc = st.totalAnswered ? Math.round((st.totalCorrect / st.totalAnswered) * 100) : 0;
  const skin = skinById(st.skinId);

  return (
    <>
      <StudentNav />
      <main id="innehall" className="page" style={{ paddingBottom: 120, maxWidth: 980 }}>
        <section className="card" style={{ padding: 24, borderRadius: 28, display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ width: 132, height: 132, borderRadius: 36, background: RARITY[skin.rarity].tint, display: "grid", placeItems: "center", flex: "none" }}>
            <Avatar skin={st.skinId} size={108} className={skin.rarity === "alfa" || skin.rarity === "legendarisk" ? "avatar-hero" : "anim-bob"} />
          </div>
          <div className="grow" style={{ minWidth: 220 }}>
            {editing ? (
              <form
                className="row gap-8"
                onSubmit={(e) => {
                  e.preventDefault();
                  const p = nicknameProblem(draft);
                  if (p) return setErr(p);
                  setNickname(draft.trim());
                  setEditing(false);
                }}
              >
                <input className="input" value={draft} onChange={(e) => { setDraft(e.target.value); setErr(null); }} maxLength={16} autoFocus aria-label="Smeknamn" aria-invalid={!!err} />
                <button className="btn btn-primary">Spara</button>
              </form>
            ) : (
              <div className="row gap-8">
                <h1 style={{ fontSize: "2rem" }}>{st.nickname || "Namnlös klättrare"}</h1>
                <button className="btn btn-ghost btn-icon" onClick={() => { setDraft(st.nickname); setEditing(true); }} aria-label="Byt smeknamn">
                  <Icon name="edit" size={18} />
                </button>
              </div>
            )}
            {err && <p style={{ color: "var(--lingon-dark)", fontWeight: 600, marginTop: 6 }}>{err}</p>}
            <p className="muted" style={{ marginTop: 4 }}>
              {skin.name} · {RARITY[skin.rarity].label}
            </p>
            <div style={{ marginTop: 14, maxWidth: 420 }}>
              <div className="row between" style={{ fontSize: "0.9rem" }}>
                <strong>Nivå {lvl.level}</strong>
                <span className="muted">
                  {lvl.into} / {lvl.need} XP
                </span>
              </div>
              <div className="bar" style={{ marginTop: 6 }}>
                <span style={{ width: `${(lvl.into / lvl.need) * 100}%`, background: "var(--fjall)" }} />
              </div>
            </div>
          </div>
          <div className="row gap-8" style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.4rem" }}>
            <GnistaIcon size={26} /> {st.gnistor.toLocaleString("sv-SE")}
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginTop: 14 }}>
          {[
            { icon: "play" as const, v: st.matches, l: "matcher" },
            { icon: "check" as const, v: `${acc} %`, l: "träffsäkerhet" },
            { icon: "sun" as const, v: st.bestStreak, l: "längsta rad" },
            { icon: "flag" as const, v: st.summits, l: "toppar nådda" },
          ].map((x) => (
            <div key={x.l} className="card card-pad">
              <Icon name={x.icon} size={20} style={{ color: "var(--ink-3)" }} />
              <div className="num" style={{ fontSize: "1.8rem", marginTop: 6 }}>
                {x.v}
              </div>
              <div className="muted" style={{ fontSize: "0.88rem", fontWeight: 600 }}>
                {x.l}
              </div>
            </div>
          ))}
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14, marginTop: 14 }}>
          <section className="card card-pad">
            <h2 style={{ fontSize: "1.2rem" }}>Veckans uppdrag</h2>
            <div className="stack gap-12" style={{ marginTop: 14 }}>
              {st.quests.map((q) => {
                const done = q.progress >= q.goal;
                return (
                  <div key={q.id} className="row gap-12" style={{ padding: 12, borderRadius: 16, background: "var(--paper)" }}>
                    <div className="grow">
                      <div style={{ fontWeight: 650 }}>{q.title}</div>
                      <div className="bar" style={{ marginTop: 8, height: 10 }}>
                        <span style={{ width: `${(q.progress / q.goal) * 100}%`, background: "var(--hjortron)" }} />
                      </div>
                      <div className="muted" style={{ fontSize: "0.82rem", marginTop: 4 }}>
                        {q.progress}/{q.goal}
                      </div>
                    </div>
                    {q.claimed ? (
                      <span className="chip chip-ok">
                        <Icon name="check" size={14} stroke={3} /> Klar
                      </span>
                    ) : (
                      <button className={`btn btn-sm ${done ? "btn-accent" : ""}`} disabled={!done} onClick={() => claim(q.id)}>
                        <GnistaIcon size={16} /> {q.reward}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card card-pad">
            <div className="row between">
              <h2 style={{ fontSize: "1.2rem" }}>Min samling</h2>
              <span className="muted" style={{ fontSize: "0.9rem" }}>
                {st.owned.length} av {SKINS.length}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))", gap: 8, marginTop: 14 }}>
              {SKINS.map((sk) => {
                const owned = st.owned.includes(sk.id);
                return (
                  <button
                    key={sk.id}
                    onClick={() => owned && equip(sk.id)}
                    disabled={!owned}
                    aria-pressed={st.skinId === sk.id}
                    aria-label={owned ? `Använd ${sk.name}` : `${sk.name} – inte upplåst`}
                    style={{
                      aspectRatio: "1",
                      borderRadius: 16,
                      border: `2px solid ${st.skinId === sk.id ? "var(--brand)" : "var(--line)"}`,
                      background: owned ? RARITY[sk.rarity].tint : "var(--paper)",
                      display: "grid",
                      placeItems: "center",
                      cursor: owned ? "pointer" : "default",
                    }}
                  >
                    <Avatar skin={sk.id} size={44} style={owned ? undefined : { filter: "grayscale(1) brightness(1.15)", opacity: 0.35 }} />
                  </button>
                );
              })}
            </div>
            <Link href="/butik" className="btn btn-block" style={{ marginTop: 14 }}>
              <GnistaIcon size={18} /> Hitta fler i butiken
            </Link>
          </section>
        </div>

        <section className="card card-pad" style={{ marginTop: 14 }}>
          <h2 style={{ fontSize: "1.2rem" }}>Inställningar</h2>
          <label className="row gap-12 between" style={{ marginTop: 12, cursor: "pointer" }}>
            <span>
              <strong style={{ display: "block" }}>Minska rörelser</strong>
              <span className="muted" style={{ fontSize: "0.9rem" }}>
                Färre animationer i spel och menyer.
              </span>
            </span>
            <input type="checkbox" checked={prefs.reducedMotion} onChange={(e) => setPrefs({ reducedMotion: e.target.checked })} style={{ width: 24, height: 24, accentColor: "var(--brand)" }} />
          </label>
          <p className="muted" style={{ marginTop: 16, fontSize: "0.88rem" }}>
            Din profil sparas på den här enheten. Med ett skolkonto följer den med dig mellan datorer.
          </p>
        </section>
      </main>
    </>
  );
}
