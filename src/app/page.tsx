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
import ChasePreview from "@/components/game/chase/ChasePreview";
import { CoverArt, SUBJECTS } from "@/components/cover";
import { ALL_QUIZZES } from "@/data/quizzes";
import s from "./home.module.css";

const FEATURED = ["manskliga-rattigheter", "syslojd", "lag-och-ratt", "kallkritik", "demokrati-diktatur", "stormaktstiden"];

const FAQ = [
  { q: "Behöver eleverna ett konto?", a: "Nej. Eleverna skriver in spelkoden och ett smeknamn. Vill du kan du låta Klura slumpa fram namn, så att ingen behöver skriva sitt riktiga namn." },
  { q: "Vilka enheter fungerar det på?", a: "Allt som har en webbläsare: Chromebook, iPad, datorer och mobiler. Läraren visar spelet på projektorn och eleverna spelar på sina egna enheter." },
  { q: "Kan jag använda mina egna frågor?", a: "Ja. Skriv dem i quizbyggaren eller klistra in dem från ett dokument eller kalkylark – Klura förstår formatet och visar en förhandsgranskning innan du lägger till dem." },
  { q: "Blir det inte stökigt i klassrummet?", a: "Du väljer energinivå innan spelet: Lugn döljer topplistan och visar klassens resultat tillsammans, Full fart ger mer tävling. Projektorn visar aldrig vem som svarat fel." },
  { q: "Kan man köpa sig fördelar?", a: "Nej. Gnistor och figurer är bara utseende. Det enda som ger poäng i spelen är rätt svar." },
  { q: "Hur hanteras personuppgifter?", a: "Klura sparar så lite som möjligt: smeknamn och svar i en spelomgång. Skolor får ett personuppgiftsbiträdesavtal." },
];

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
        <nav className={`${s.topNav} ${s.hideMobile}`} aria-label="Startsidan">
          <a href="#spellagen">Spellägen</a>
          <Link href="/larare/upptack">Färdiga quiz</Link>
          <a href="#priser">Priser</a>
          <a href="#fragor">Frågor</a>
        </nav>
        <div className={s.topLinks}>
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
            <p className={s.lead}>Kör undan polisen, försvara stugan eller klättra mot toppen – men bara rätt svar tar dig framåt.</p>

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

        <div className={s.trust} aria-label="Därför Klura">
          <span>
            <Icon name="check" size={16} stroke={3} /> Byggt för svensk skola och Lgr22
          </span>
          <span>
            <Icon name="check" size={16} stroke={3} /> Chromebook, iPad och mobil
          </span>
          <span>
            <Icon name="check" size={16} stroke={3} /> Inga elevkonton behövs
          </span>
          <span>
            <Icon name="check" size={16} stroke={3} /> Ingen reklam, inget pay-to-win
          </span>
        </div>

        <section className={s.section} aria-labelledby="spellagen-rubrik" id="spellagen">
          <p className="eyebrow">Tre spellägen</p>
          <h2 id="spellagen-rubrik" style={{ marginTop: 6 }}>
            Svara rätt. Sen spelar du.
          </h2>
          <p className={s.sectionLead}>Samma quiz fungerar i alla lägen. Välj det som passar lektionen – från lugn repetition till full fart på fredagen.</p>
          <div className={s.modes}>
            <article className={s.mode}>
              <div className={s.modeArt}>
                <ChasePreview />
              </div>
              <div className={s.modeBody}>
                <span className={s.modeTag}>Nytt · I egen takt</span>
                <h3>Biljakt</h3>
                <p>Kör undan polisen genom stan. När mätaren är full kommer en fråga – rätt svar ger en stjärna. Flest stjärnor vinner.</p>
              </div>
            </article>
            <article className={s.mode}>
              <div className={s.modeArt}>
                <DefensePreview />
              </div>
              <div className={s.modeBody}>
                <span className={s.modeTag}>I egen takt</span>
                <h3>Fjällförsvar</h3>
                <p>Försvara stugan mot trollen. Rätt svar ger virke att bygga torn för – men trollen väntar inte medan du funderar.</p>
              </div>
            </article>
            <article className={s.mode}>
              <div className={s.modeArt} style={{ background: "#dcefe7", display: "grid", alignItems: "end" }}>
                <ClimbScene skin="mosse" score={520} maxScore={1200} field={[{ skinId: "raven", score: 700 }, { skinId: "kassetten", score: 300 }, { skinId: "flugis", score: 610 }]} height={200} legs={["Skogen", "Kalfjället", "Toppen"]} />
              </div>
              <div className={s.modeBody}>
                <span className={s.modeTag}>Hela klassen samtidigt</span>
                <h3>Topptur</h3>
                <p>Alla svarar på samma fråga på tavlan och klättrar mot toppen. Du styr tempot och pausar för att prata om svaren.</p>
              </div>
            </article>
          </div>
        </section>

        <section className={s.section} aria-labelledby="sa-funkar">
          <p className="eyebrow">Så funkar det</p>
          <h2 id="sa-funkar" style={{ marginTop: 6 }}>
            Från idé till spel på under en minut
          </h2>
          <ol className={s.steps}>
            <li className={s.step}>
              <span className={s.stepNum}>1</span>
              <h3>Välj eller gör ett quiz</h3>
              <p>Ta ett färdigt quiz eller klistra in dina egna frågor från ett dokument eller kalkylark. Lägg till bilder och förklaringar.</p>
            </li>
            <li className={s.step}>
              <span className={s.stepNum}>2</span>
              <h3>Eleverna går med med en kod</h3>
              <p>Sex siffror på tavlan – inga konton, inga appar. Fungerar på skolans datorer och elevernas mobiler.</p>
            </li>
            <li className={s.step}>
              <span className={s.stepNum}>3</span>
              <h3>Se vad som behöver repeteras</h3>
              <p>Efter spelet ser du vilka frågor och begrepp som inte sitter – och startar en repetition med ett klick.</p>
            </li>
          </ol>
        </section>

        <section className={s.section} style={{ paddingTop: 8 }}>
          <div className={s.teacher}>
            <div>
              <p className="eyebrow" style={{ color: "#8fd1b6" }}>
                För lärare
              </p>
              <h2 style={{ marginTop: 8 }}>Spänning i vågor, inte kaos hela lektionen.</h2>
              <p style={{ marginTop: 14, fontSize: "1.05rem" }}>Välj hur mycket energi rummet tål. Följ klassen över tid. Få konkreta förslag inför nästa lektion.</p>
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
                  <span>Du styr hur mycket topplista och tävling klassen ser.</span>
                </div>
              </div>
              <div className={s.point}>
                <span className={s.pointIcon}>
                  <Icon name="chart" size={20} />
                </span>
                <div>
                  <strong>Klassen över tid</strong>
                  <span>Träffsäkerhet per lektion, begrepp som återkommer som svåra och vilka elever som lyft.</span>
                </div>
              </div>
              <div className={s.point}>
                <span className={s.pointIcon}>
                  <Icon name="repeat" size={20} />
                </span>
                <div>
                  <strong>Repetition med ett klick</strong>
                  <span>Klura föreslår vad du ska repetera med varje klass till nästa lektion.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={s.section} aria-labelledby="fardiga">
          <div className={s.sectionHead}>
            <div>
              <p className="eyebrow">Färdiga quiz</p>
              <h2 id="fardiga" style={{ marginTop: 6 }}>
                Redo för åk 7–9
              </h2>
            </div>
            <Link href="/larare/upptack" className="btn btn-sm">
              Alla quiz <Icon name="arrowRight" size={16} />
            </Link>
          </div>
          <div className={s.quizzes}>
            {FEATURED.map((id) => {
              const qz = ALL_QUIZZES.find((x) => x.id === id);
              if (!qz) return null;
              return (
                <Link key={id} href={`/larare/upptack`} className={s.quiz}>
                  <CoverArt subject={qz.subject} motif={qz.cover} rounded={14} />
                  <span className={s.quizSubject}>{SUBJECTS[qz.subject].label}</span>
                  <strong>{qz.title}</strong>
                  <span className={s.quizMeta}>
                    {qz.questions.length} frågor · {qz.level}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className={s.section} aria-labelledby="trygghet">
          <p className="eyebrow">Trygghet</p>
          <h2 id="trygghet" style={{ marginTop: 6 }}>
            Gjort för skolan – inte för reklam
          </h2>
          <div className={s.safety}>
            <div>
              <Icon name="lock" size={22} />
              <h3>Minimal elevdata</h3>
              <p>Eleverna spelar med ett smeknamn. Inga e-postadresser, inga konton och ingen spårning.</p>
            </div>
            <div>
              <Icon name="shield" size={22} />
              <h3>Namnfilter</h3>
              <p>Olämpliga namn och kränkande ord stoppas – på svenska och engelska, även med specialtecken och siffror.</p>
            </div>
            <div>
              <Icon name="trophy" size={22} />
              <h3>Rättvist på riktigt</h3>
              <p>Figurer är bara utseende. Inga lootboxar, ingen pay-to-win – den som kan mest vinner.</p>
            </div>
            <div>
              <Icon name="eye" size={22} />
              <h3>Tillgängligt</h3>
              <p>Tangentbordsstyrning, tydliga kontraster, färg och form på svaren och läge för minskade animationer.</p>
            </div>
          </div>
        </section>

        <section className={s.section} aria-labelledby="priser-rubrik" id="priser">
          <p className="eyebrow">Priser</p>
          <h2 id="priser-rubrik" style={{ marginTop: 6 }}>
            Gratis att börja. Enkelt att växa.
          </h2>
          <div className={s.plans}>
            <div className={s.plan}>
              <h3>Gratis</h3>
              <p className={s.price}>
                0 kr
              </p>
              <p className={s.planLead}>För dig som vill testa i din klass.</p>
              <ul>
                <li>Alla tre spellägena</li>
                <li>Upp till 40 elever per spel</li>
                <li>Egna quiz och färdiga quiz</li>
                <li>Resultat efter varje lektion</li>
              </ul>
              <Link href="/logga-in" className="btn btn-block">
                Skapa konto
              </Link>
            </div>
            <div className={`${s.plan} ${s.planMain}`}>
              <span className={s.planBadge}>Populärast</span>
              <h3>Lärare</h3>
              <p className={s.price}>
                59 kr <small>/ månad</small>
              </p>
              <p className={s.planLead}>För dig som använder Klura varje vecka.</p>
              <ul>
                <li>Allt i Gratis</li>
                <li>Klasser och utveckling över tid</li>
                <li>Förslag till nästa lektion</li>
                <li>Bilder i frågor och import från kalkylark</li>
                <li>Publicera och dela quiz</li>
              </ul>
              <Link href="/logga-in" className="btn btn-primary btn-block">
                Prova gratis i 30 dagar
              </Link>
            </div>
            <div className={s.plan}>
              <h3>Skola</h3>
              <p className={s.price}>
                Offert
              </p>
              <p className={s.planLead}>För hela skolan eller kommunen.</p>
              <ul>
                <li>Alla lärare på skolan</li>
                <li>Inloggning via skolans konto</li>
                <li>Personuppgiftsbiträdesavtal</li>
                <li>Introduktion för kollegiet</li>
              </ul>
              <a href="mailto:hej@klura.se" className="btn btn-block">
                Kontakta oss
              </a>
            </div>
          </div>
          <p className={s.planNote}>Alla priser exklusive moms. Eleverna betalar aldrig något.</p>
        </section>

        <section className={s.section} aria-labelledby="fragor">
          <p className="eyebrow">Vanliga frågor</p>
          <h2 id="fragor" style={{ marginTop: 6 }}>
            Bra att veta
          </h2>
          <div className={s.faq}>
            {FAQ.map((x) => (
              <details key={x.q}>
                <summary>
                  {x.q}
                  <Icon name="chevronDown" size={18} />
                </summary>
                <p>{x.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={s.section}>
          <div className={s.finalCta}>
            <div>
              <h2>Testa Klura med din klass i morgon</h2>
              <p>Gratis, på svenska och klart på en minut.</p>
            </div>
            <div className="row gap-12 wrap">
              <Link href={loggedIn ? "/larare" : "/logga-in"} className="btn btn-accent btn-lg">
                Kom igång gratis
              </Link>
              <Link href="/spela" className="btn btn-lg">
                Jag är elev
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className={s.footer}>
        <div className={s.footerBrand}>
          <Wordmark size={28} />
          <p>Quiz där kunskap vinner. Gjort i Sverige för svensk skola.</p>
        </div>
        <div className={s.footerCols}>
          <div>
            <strong>Produkt</strong>
            <a href="#spellagen">Spellägen</a>
            <Link href="/larare/upptack">Färdiga quiz</Link>
            <a href="#priser">Priser</a>
          </div>
          <div>
            <strong>Kom igång</strong>
            <Link href="/logga-in">För lärare</Link>
            <Link href="/spela">För elever</Link>
            <a href="mailto:hej@klura.se">Kontakt</a>
          </div>
          <div>
            <strong>Trygghet</strong>
            <a href="#trygghet">Integritet</a>
            <a href="#fragor">Vanliga frågor</a>
          </div>
        </div>
        <p className={s.copy}>© 2026 Klura</p>
      </footer>
    </>
  );
}
