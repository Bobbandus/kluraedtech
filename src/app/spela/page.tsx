"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StudentNav } from "@/components/nav";
import { Icon } from "@/components/icons";
import { Avatar } from "@/components/avatar";
import { formatCode } from "@/lib/format";
import { useHydrated, useStore, levelFromXp } from "@/lib/store";

export default function JoinPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const st = useStore((x) => x.student);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const lvl = levelFromXp(st.xp);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const d = code.replace(/\D/g, "");
    if (d.length !== 6) return setError("Spelkoden har sex siffror.");
    router.push(`/spela/${d}`);
  };

  return (
    <>
      <StudentNav />
      <main id="innehall" className="page page-narrow" style={{ paddingBottom: 120 }}>
        <section className="card" style={{ padding: "36px 24px", textAlign: "center", borderRadius: 28 }}>
          <div style={{ width: 112, height: 112, margin: "0 auto", borderRadius: 32, background: "var(--brand-tint)", display: "grid", placeItems: "center" }}>
            <Avatar skin={hydrated ? st.skinId : "mosse"} size={88} className="anim-bob" />
          </div>
          <h1 style={{ marginTop: 16 }}>Gå med i ett spel</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            Skriv koden som syns på tavlan.
          </p>
          <form onSubmit={submit} noValidate style={{ margin: "22px auto 0", maxWidth: 380 }} className="stack gap-12">
            <label className="sr-only" htmlFor="kod2">
              Spelkod
            </label>
            <input
              id="kod2"
              className="input"
              inputMode="numeric"
              autoComplete="off"
              placeholder="123 456"
              value={code}
              aria-invalid={!!error}
              onChange={(e) => {
                setCode(formatCode(e.target.value));
                setError(null);
              }}
              style={{ height: 66, textAlign: "center", fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "2rem", letterSpacing: "0.14em" }}
            />
            {error && (
              <p role="alert" style={{ color: "var(--lingon-dark)", fontWeight: 600 }}>
                {error}
              </p>
            )}
            <button className="btn btn-primary btn-lg btn-block">
              Gå med <Icon name="arrowRight" size={20} />
            </button>
          </form>
        </section>

        {hydrated && (
          <section style={{ marginTop: 20 }} className="stack gap-12">
            <div className="card card-pad row gap-16">
              <div className="grow">
                <div className="row between">
                  <strong>Nivå {lvl.level}</strong>
                  <span className="muted" style={{ fontSize: "0.88rem" }}>
                    {lvl.into} / {lvl.need} XP
                  </span>
                </div>
                <div className="bar" style={{ marginTop: 8 }}>
                  <span style={{ width: `${(lvl.into / lvl.need) * 100}%` }} />
                </div>
              </div>
            </div>
            <div className="card card-pad">
              <div className="row between">
                <h2 style={{ fontSize: "1.15rem" }}>Veckans uppdrag</h2>
                <Link href="/profil" className="muted" style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                  Visa alla
                </Link>
              </div>
              <div className="stack gap-12" style={{ marginTop: 12 }}>
                {st.quests.map((q) => (
                  <div key={q.id}>
                    <div className="row between" style={{ fontSize: "0.94rem" }}>
                      <span style={{ fontWeight: 600 }}>{q.title}</span>
                      <span className="muted">
                        {q.progress}/{q.goal}
                      </span>
                    </div>
                    <div className="bar" style={{ marginTop: 6, height: 10 }}>
                      <span style={{ width: `${(q.progress / q.goal) * 100}%`, background: q.claimed ? "var(--ink-4)" : "var(--hjortron)" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
