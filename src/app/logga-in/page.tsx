"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Wordmark } from "@/components/brand";
import { MountainScene } from "@/components/scene";
import { useStore } from "@/lib/store";
import { DEMO_MODE } from "@/lib/backend";
import { authApi } from "@/lib/backend/auth-client";

export default function Login() {
  return (
    <div style={{ minHeight: "100dvh", display: "grid", gridTemplateColumns: "minmax(0, 1fr)", placeItems: "center", padding: 16 }}>
      <main id="innehall" style={{ width: "min(440px, 100%)" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <Wordmark size={36} />
        </div>
        <div className="card" style={{ padding: 28, borderRadius: 28 }}>
          <div style={{ maxWidth: 260, margin: "-8px auto 12px" }}>
            <MountainScene climbers={[{ id: "a", skin: "raven", t: 0.55, highlight: true }]} />
          </div>
          {DEMO_MODE ? <DemoLogin /> : <RealLogin />}
        </div>
        <p className="muted" style={{ textAlign: "center", marginTop: 16, fontSize: "0.9rem" }}>
          Ska du spela?{" "}
          <Link href="/spela" style={{ textDecoration: "underline", fontWeight: 600 }}>
            Gå med i ett spel
          </Link>
        </p>
      </main>
    </div>
  );
}

function DemoLogin() {
  const router = useRouter();
  const login = useStore((x) => x.login);
  const [busy, setBusy] = useState<string | null>(null);
  const [email, setEmail] = useState("sara.lindqvist@kvarnbacka.se");
  const go = (via: string) => {
    setBusy(via);
    setTimeout(() => {
      login();
      router.push("/larare");
    }, 650);
  };
  return (
    <>
      <h1 style={{ fontSize: "1.7rem", textAlign: "center" }}>Logga in som lärare</h1>
      <p className="muted" style={{ textAlign: "center", marginTop: 6 }}>
        Elever behöver inget konto – de går med med en kod.
      </p>
      <div className="stack gap-8" style={{ marginTop: 22 }}>
        {[
          { id: "google", label: "Fortsätt med Google", color: "#4285f4" },
          { id: "ms", label: "Fortsätt med Microsoft", color: "#00a4ef" },
          { id: "skolfed", label: "Fortsätt med Skolfederation", color: "#12735a" },
        ].map((p) => (
          <button key={p.id} className="btn btn-lg btn-block" onClick={() => go(p.id)} disabled={!!busy}>
            <span style={{ width: 12, height: 12, borderRadius: 4, background: p.color }} aria-hidden="true" />
            {busy === p.id ? "Loggar in…" : p.label}
          </button>
        ))}
      </div>
      <Divider />
      <form
        className="stack gap-12"
        onSubmit={(e) => {
          e.preventDefault();
          go("mail");
        }}
      >
        <div className="field">
          <label className="label" htmlFor="mail">
            E-post
          </label>
          <input id="mail" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div className="field">
          <label className="label" htmlFor="pw">
            Lösenord
          </label>
          <input id="pw" className="input" type="password" defaultValue="hemligt-lösen" autoComplete="current-password" />
        </div>
        <button className="btn btn-primary btn-lg btn-block" disabled={!!busy}>
          {busy === "mail" ? "Loggar in…" : "Logga in"}
        </button>
      </form>
    </>
  );
}

function Divider() {
  return (
    <div className="row gap-12" style={{ margin: "20px 0", color: "var(--ink-4)", fontSize: "0.85rem" }}>
      <span style={{ flex: 1, height: 2, background: "var(--line)" }} />
      eller
      <span style={{ flex: 1, height: 2, background: "var(--line)" }} />
    </div>
  );
}

function RealLogin() {
  const router = useRouter();
  const login = useStore((x) => x.login);
  const setNickname = useStore((x) => x.setNickname);
  const [tab, setTab] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [role, setRole] = useState<"larare" | "elev">("larare");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = tab === "login" ? await authApi.login({ email, password }) : await authApi.register({ name, email, password, role, school });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    if (r.user.role === "larare") {
      login({ name: r.user.name, school: r.user.school });
      router.push("/larare");
    } else {
      setNickname(r.user.name.split(" ")[0].slice(0, 16));
      router.push("/spela");
    }
  };

  return (
    <>
      <div className="row gap-8 center" role="tablist" style={{ marginBottom: 16 }}>
        {(
          [
            ["login", "Logga in"],
            ["register", "Skapa konto"],
          ] as const
        ).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className="chip chip-btn" aria-pressed={tab === k} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>
      <form className="stack gap-12" onSubmit={submit}>
        {tab === "register" && (
          <>
            <div className="field">
              <span className="label">Jag är</span>
              <div className="row gap-8" role="radiogroup">
                {(
                  [
                    ["larare", "Lärare"],
                    ["elev", "Elev"],
                  ] as const
                ).map(([k, l]) => (
                  <button type="button" key={k} role="radio" aria-checked={role === k} className="chip chip-btn" aria-pressed={role === k} onClick={() => setRole(k)}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label className="label" htmlFor="r-name">
                Namn
              </label>
              <input id="r-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
            </div>
            {role === "larare" && (
              <div className="field">
                <label className="label" htmlFor="r-school">
                  Skola <span className="muted">(valfritt)</span>
                </label>
                <input id="r-school" className="input" value={school} onChange={(e) => setSchool(e.target.value)} autoComplete="organization" />
              </div>
            )}
          </>
        )}
        <div className="field">
          <label className="label" htmlFor="r-mail">
            E-post
          </label>
          <input id="r-mail" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        <div className="field">
          <label className="label" htmlFor="r-pw">
            Lösenord
          </label>
          <input id="r-pw" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={tab === "login" ? "current-password" : "new-password"} required minLength={tab === "register" ? 8 : undefined} />
          {tab === "register" && <span className="hint">Minst 8 tecken.</span>}
        </div>
        {error && (
          <p role="alert" style={{ color: "var(--lingon-dark)", fontWeight: 600 }}>
            {error}
          </p>
        )}
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
          {busy ? "Vänta …" : tab === "login" ? "Logga in" : "Skapa konto"}
        </button>
      </form>
    </>
  );
}
