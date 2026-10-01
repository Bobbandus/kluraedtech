"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Wordmark } from "@/components/brand";
import { MountainScene } from "@/components/scene";
import { useStore } from "@/lib/store";

export default function Login() {
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
    <div style={{ minHeight: "100dvh", display: "grid", gridTemplateColumns: "minmax(0,1fr)", placeItems: "center", padding: 16 }}>
      <main id="innehall" style={{ width: "min(440px, 100%)" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <Wordmark size={36} />
        </div>
        <div className="card" style={{ padding: 28, borderRadius: 28 }}>
          <div style={{ maxWidth: 260, margin: "-8px auto 12px" }}>
            <MountainScene climbers={[{ id: "a", skin: "raven", t: 0.55, highlight: true }]} />
          </div>
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
          <div className="row gap-12" style={{ margin: "20px 0", color: "var(--ink-4)", fontSize: "0.85rem" }}>
            <span style={{ flex: 1, height: 2, background: "var(--line)" }} />
            eller
            <span style={{ flex: 1, height: 2, background: "var(--line)" }} />
          </div>
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
        </div>
        <p className="muted" style={{ textAlign: "center", marginTop: 16, fontSize: "0.9rem" }}>
          Ska du spela? <Link href="/spela" style={{ textDecoration: "underline", fontWeight: 600 }}>Gå med i ett spel</Link>
        </p>
      </main>
    </div>
  );
}
