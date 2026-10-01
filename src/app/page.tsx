"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Wordmark, GnistaIcon } from "@/components/brand";
import { Icon } from "@/components/icons";
import { MountainScene } from "@/components/scene";
import { useStore } from "@/lib/store";
import DefensePreview from "@/components/game/defense/DefensePreview";
import ClimbScene from "@/components/game/climb/ClimbScene";
import { formatCode } from "@/lib/format";
import s from "./home.module.css";

export default function Home() {
  const router = useRouter();
  const loggedIn = useStore((x) => x.teacher.loggedIn);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = code.replace(/\D/g, "");
    if (digits.length !== 6) {
      setError("Spelkoden har sex siffror. Du hittar den på tavlan.");
      return;
    }
    router.push(`/spela/${digits}`);
  };

  return (
    <>
      <header className={s.top}>
        <Wordmark size={34} />
        <div className={s.topLinks}>
          <Link href="/larare/upptack" className={`btn btn-ghost ${s.hideMobile}`}>
            Utforska quiz
          </Link>
          <Link href={loggedIn ? "/larare" : "/logga-in"} className="btn btn-sm">
            {loggedIn ? "Till lärarvyn" : "Lärare? Logga in"}
          </Link>
        </div>
      </header>

      <main id="innehall">
        <section className={s.hero}>
          <div className="anim-rise">
            <h1 className={s.title}>
              Quiz där <em>kunskap</em> vinner.
            </h1>
            <p className={s.lead}>Svara rätt, bygg ditt försvar eller klättra mot toppen – tillsammans med klassen.</p>

            <form className={s.join} onSubmit={submit} noValidate>
              <label htmlFor="kod" className="sr-only">
                Spelkod
              </label>
              <input
                id="kod"
                className={s.codeInput}
                inputMode="numeric"
                autoComplete="off"
                placeholder="Spelkod"
                value={code}
                aria-invalid={!!error}
                aria-describedby={error ? "kod-fel" : undefined}
                onChange={(e) => {
                  setCode(formatCode(e.target.value));
                  setError(null);
                }}
              />
              <button className={`btn btn-primary btn-lg ${s.joinBtn}`} type="submit">
                Gå med
                <Icon name="arrowRight" size={20} />
              </button>
            </form>
            {error && (
              <p id="kod-fel" className={s.err} role="alert">
                {error}
              </p>
            )}

            <div className={s.secondary}>
              <Link href="/profil">
                <Icon name="user" size={18} /> Min figur och samling
              </Link>
              <Link href="/butik">
                <GnistaIcon size={18} /> Butiken
              </Link>
            </div>
          </div>

          <div className={s.art}>
            <MountainScene
              climbers={[
                { id: "a", skin: "kassetten", t: 0.08 },
                { id: "b", skin: "flugis", t: 0.27 },
                { id: "c", skin: "mosse", t: 0.46, highlight: true },
                { id: "d", skin: "raven", t: 0.66 },
                { id: "e", skin: "isbiten", t: 0.84 },
              ]}
            />
            <div className={s.artCard} style={{ left: -14, top: "18%" }}>
              <span style={{ color: "var(--ok)" }}>
                <Icon name="check" size={18} stroke={3} />
              </span>
              Rätt! +118 m
            </div>
            <div className={s.artCard} style={{ right: -10, bottom: "16%", animationDelay: "-2s" }}>
              <span style={{ color: "var(--sol-dark)" }}>
                <Icon name="sun" size={18} />
              </span>
              5 rätt i rad
            </div>
          </div>
        </section>

        <section className={s.section} aria-labelledby="sa-funkar">
          <p className="eyebrow">Två spellägen</p>
          <h2 id="sa-funkar" style={{ marginTop: 6 }}>
            Svara rätt. Sen spelar du.
          </h2>
          <div className={s.modes}>
            <div className={`card ${s.mode}`}>
              <DefensePreview />
              <div className={s.modeBody}>
                <h3>Fjällförsvar</h3>
                <p className="muted">
                  Försvara din stuga mot trollen. Varje rätt svar ger virke som du bygger torn för – men trollen väntar inte medan du funderar.
                </p>
              </div>
            </div>
            <div className={`card ${s.mode}`}>
              <div style={{ borderRadius: 16, overflow: "hidden" }}>
                <ClimbScene skin="mosse" score={520} maxScore={1200} field={[{ skinId: "raven", score: 700 }, { skinId: "kassetten", score: 300 }, { skinId: "flugis", score: 610 }]} height={180} legs={["Skogen", "Kalfjället", "Toppen"]} />
              </div>
              <div className={s.modeBody}>
                <h3>Topptur</h3>
                <p className="muted">Hela klassen svarar på samma fråga på tavlan och klättrar mot toppen. Rätt svar tar dig 100 meter upp – fart ger bara lite extra.</p>
              </div>
            </div>
          </div>
        </section>

        <section className={s.section} style={{ paddingTop: 8 }}>
          <div className={s.teacher}>
            <div>
              <p className="eyebrow" style={{ color: "#8fd1b6" }}>
                För lärare
              </p>
              <h2 style={{ marginTop: 8 }}>Spänning i vågor, inte kaos hela lektionen.</h2>
              <p style={{ marginTop: 14, fontSize: "1.05rem" }}>
                Starta ett quiz på under en minut. Välj hur mycket energi rummet tål. Få reda på vad klassen faktiskt behöver repetera.
              </p>
              <div className="row gap-12 wrap" style={{ marginTop: 24 }}>
                <Link href={loggedIn ? "/larare" : "/logga-in"} className="btn btn-accent btn-lg">
                  Kom igång gratis
                </Link>
                <Link href="/larare/upptack" className="btn btn-lg" style={{ ["--btn-bg" as string]: "transparent", ["--btn-fg" as string]: "#fff", ["--btn-border" as string]: "rgba(255,255,255,.3)", ["--btn-edge" as string]: "rgba(0,0,0,.3)" }}>
                  Bläddra bland quiz
                </Link>
              </div>
            </div>
            <div className={s.points}>
              <div className={s.point}>
                <span className={s.pointIcon}>
                  <Icon name="volume" size={20} />
                </span>
                <div>
                  <strong>Lugn, Standard eller Full fart</strong>
                  <span>Du styr hur mycket topplista och interaktion klassen ser.</span>
                </div>
              </div>
              <div className={s.point}>
                <span className={s.pointIcon}>
                  <Icon name="chart" size={20} />
                </span>
                <div>
                  <strong>Resultat som visar vad som behöver repeteras</strong>
                  <span>Svåraste frågorna, vanligaste missuppfattningarna och begrepp som inte sitter.</span>
                </div>
              </div>
              <div className={s.point}>
                <span className={s.pointIcon}>
                  <Icon name="shield" size={20} />
                </span>
                <div>
                  <strong>Rättvist på riktigt</strong>
                  <span>Inga lootboxar, ingen pay-to-win. Den som kan mest vinner oftast.</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={s.footer}>
        <span>© 2026 Klura · Gjort i Sverige</span>
        <span className="row gap-16">
          <Link href="/larare/upptack">Upptäck quiz</Link>
          <Link href="/logga-in">För skolor</Link>
          <span>Integritet</span>
        </span>
      </footer>
    </>
  );
}
