"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEMO_MODE, saveHostKey, savePlayerToken } from "@/lib/backend";
import { localTransport, showcaseRoom, startShowcase } from "@/lib/backend/local-transport";
import { ALL_QUIZZES } from "@/data/quizzes";
import { randomNickname } from "@/data/people";
import { MODE_INFO } from "@/lib/modes";
import type { GameMode } from "@/lib/rooms/types";
import { useStore } from "@/lib/store";
import { Icon, type IconName } from "@/components/icons";
import { LogoMark } from "@/components/brand";
import ChasePreview from "@/components/game/chase/ChasePreview";
import DefensePreview from "@/components/game/defense/DefensePreview";
import { MountainScene } from "@/components/scene";
import s from "./admin.module.css";

const SHOW_QUIZZES = ["stormaktstiden", "kroppen", "procent", "vikingatiden", "periodiska", "sveriges-landskap", "demokrati", "irregular-verbs"];

const MODES: { id: GameMode; text: string; quiz: string }[] = [
  { id: "jakt", text: "Eleven kör en egen bil genom stan med polisen efter sig. Full mätare ger en fråga – rätt svar ger en stjärna.", quiz: "stormaktstiden" },
  { id: "fjall", text: "Varje elev försvarar sin stuga mot troll. Rätt svar ger virke att bygga torn för.", quiz: "kroppen" },
  { id: "topptur", text: "Alla svarar på samma fråga samtidigt och klättrar mot toppen. Läraren styr tempot.", quiz: "vikingatiden" },
];

const LINKS: { group: string; items: { href: string; label: string; icon: IconName; note: string }[] }[] = [
  {
    group: "Läraren",
    items: [
      { href: "/larare", label: "Översikt", icon: "home", note: "Förslag till nästa lektion" },
      { href: "/larare/quiz/ny", label: "Skapa quiz", icon: "edit", note: "Bilder, klistra in, dra och släpp" },
      { href: "/larare/klasser", label: "Klasser", icon: "chart", note: "Utveckling över tid" },
      { href: "/larare/resultat", label: "Resultat", icon: "check", note: "Vad klassen behöver repetera" },
      { href: "/larare/upptack", label: "Upptäck", icon: "search", note: "Quiz från andra lärare" },
    ],
  },
  {
    group: "Eleven",
    items: [
      { href: "/", label: "Startsidan", icon: "sparkle", note: "Så möts man av Klura" },
      { href: "/spela", label: "Gå med i spel", icon: "play", note: "Skriv in en kod" },
      { href: "/butik", label: "Butik", icon: "bag", note: "Figurer utan pay-to-win" },
      { href: "/profil", label: "Profil", icon: "user", note: "Nivå, bedrifter, Laserdala" },
    ],
  },
];

type View = "elev" | "projektor" | "delad";

export default function AdminPage() {
  const router = useRouter();
  const student = useStore((x) => x.student);
  const [quiz, setQuiz] = useState<Record<GameMode, string>>({ jakt: MODES[0].quiz, fjall: MODES[1].quiz, topptur: MODES[2].quiz });
  const [busy, setBusy] = useState<string | null>(null);
  const quizzes = ALL_QUIZZES.filter((q) => SHOW_QUIZZES.includes(q.id));

  const launch = async (mode: GameMode, view: View) => {
    setBusy(`${mode}-${view}`);
    // Projektorn ensam: läraren styr. Annars sköter rummet tempot själv.
    const { code, hostKey } = showcaseRoom(mode, quiz[mode], { autoHost: view !== "projektor" });
    if (view !== "elev") saveHostKey(code, hostKey);
    if (view !== "projektor") {
      const r = await localTransport.join(code, student.nickname || randomNickname(), student.skinId);
      if ("token" in r) savePlayerToken(code, r.token);
    }
    startShowcase(code);
    router.push(view === "elev" ? `/spela/${code}` : view === "projektor" ? `/larare/live?kod=${code}` : `/admin/visning?kod=${code}`);
  };

  const reset = () => {
    if (!window.confirm("Rensa all sparad data i den här webbläsaren? Quiz, resultat och figurer återställs.")) return;
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.href = "/admin";
  };

  return (
    <div className={s.shell}>
      <header className={s.top}>
        <Link href="/" className="row gap-8" aria-label="Till startsidan">
          <LogoMark size={34} />
        </Link>
        <span className={s.badge}>Visningsläge</span>
      </header>

      <main id="innehall" className={s.main}>
        <section className={s.hero}>
          <h1>Visa Klura på en minut</h1>
          <p>
            Allt körs direkt här i webbläsaren med en simulerad klass på 24 elever. Inget att installera och inga konton – öppna sidan på mötet och tryck på en knapp.
          </p>
          {!DEMO_MODE && <p className={s.warn}>Den här sajten kör mot en riktig server. Visningsläget fungerar bara i den publicerade versionen.</p>}
        </section>

        <section aria-labelledby="spel">
          <h2 id="spel" className={s.h2}>
            Spelen
          </h2>
          <div className={s.modes}>
            {MODES.map((m) => {
              const info = MODE_INFO[m.id];
              return (
                <article key={m.id} className={s.mode}>
                  <div className={s.preview}>
                    {m.id === "jakt" ? (
                      <ChasePreview />
                    ) : m.id === "fjall" ? (
                      <DefensePreview />
                    ) : (
                      <div style={{ aspectRatio: "3 / 2", background: "#dcefe7" }}>
                        <MountainScene climbers={[{ id: "a", skin: "mosse", t: 0.3 }, { id: "b", skin: "laserdala", t: 0.55, highlight: true }, { id: "c", skin: "kassetten", t: 0.75 }]} />
                      </div>
                    )}
                  </div>
                  <div className={s.modeBody}>
                    <div className="row gap-8">
                      <Icon name={info.icon} size={20} />
                      <h3>{info.name}</h3>
                    </div>
                    <p className={s.tag}>{info.tag}</p>
                    <p className={s.text}>{m.text}</p>
                    <label className={s.quizPick}>
                      <span>Quiz</span>
                      <select value={quiz[m.id]} onChange={(e) => setQuiz((q) => ({ ...q, [m.id]: e.target.value }))}>
                        {quizzes.map((q) => (
                          <option key={q.id} value={q.id}>
                            {q.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className={s.actions}>
                      <button className="btn btn-primary" disabled={!!busy} onClick={() => launch(m.id, "delad")}>
                        <Icon name="maximize" size={17} /> Delad skärm
                      </button>
                      <button className="btn" disabled={!!busy} onClick={() => launch(m.id, "elev")}>
                        <Icon name="play" size={17} /> Spela som elev
                      </button>
                      <button className="btn" disabled={!!busy} onClick={() => launch(m.id, "projektor")}>
                        <Icon name="users" size={17} /> Projektorn
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <p className={s.note}>
            <strong>Delad skärm</strong> visar projektorn och en elevmobil bredvid varandra – bäst när du visar på en skärm. <strong>Projektorn</strong> visar lärarens vy där du själv styr tempot.
          </p>
        </section>

        <section aria-labelledby="resten" style={{ marginTop: 36 }}>
          <h2 id="resten" className={s.h2}>
            Resten av produkten
          </h2>
          <div className={s.groups}>
            {LINKS.map((g) => (
              <div key={g.group}>
                <p className={s.groupTitle}>{g.group}</p>
                <div className={s.links}>
                  {g.items.map((l) => (
                    <Link key={l.href} href={l.href} className={s.link}>
                      <span className={s.linkIcon}>
                        <Icon name={l.icon} size={18} />
                      </span>
                      <span>
                        <strong>{l.label}</strong>
                        <small>{l.note}</small>
                      </span>
                      <Icon name="chevronRight" size={16} />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={s.resetBox}>
          <div>
            <strong>Inför nästa visning</strong>
            <p>Rensar quiz, resultat och figurer i den här webbläsaren så att nästa kund ser allt från början.</p>
          </div>
          <button className="btn" onClick={reset}>
            <Icon name="repeat" size={16} /> Återställ allt
          </button>
        </section>
      </main>
    </div>
  );
}
