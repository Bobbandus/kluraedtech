# Klura

Ett svenskt multiplayer-quiz för klassrummet där kunskap är den viktigaste skillen.

**Spellägen**

- **Biljakt** – kör undan polisen i egen takt. Varje elev styr en egen bil genom en stad sedd uppifrån. När mätaren är full kommer en fråga i slowmotion. Rätt svar ger en stjärna, och stjärnorna är en poängmultiplikator (×1,5, ×2 …). Man kan kliva ur bilen, bli spöke och ta över en annan bil, och skaka av sig polisen genom att hålla sig utom synhåll. Polisen jagar och genskjuter, och vid högre nivåer kliver poliserna ur bilarna och skjuter. Blir man fast tappar man en stjärna. Flest poäng vinner. Projektorn visar hela staden och topplistan med topp 3 i guld, silver och brons.
- **Fjällförsvar** – tower defense i egen takt. Varje elev försvarar sin stuga mot troll. Rätt svar ger virke, virket blir torn. Trollen går hela tiden, så man måste både kunna svaren och spela. Fel svar spärrar en kort stund och visar förklaringen.
- **Topptur** – hela klassen svarar på samma fråga på tavlan och klättrar mot toppen. En Joker per match tar bort två fel svar.

**Lärare** skapar quiz, hittar färdiga i Upptäck, väljer läge och klassrumsenergi (Lugn / Standard / Full fart) och får resultat som visar vad klassen behöver repetera.

## Kom igång

```bash
npm install
npm run dev          # demoläge: http://localhost:3000
npm run build && npm run start
```

Kräver Node 20+. Produktion (Vercel) bygger från `main`.

### Demoläge (standard, så körs Vercel)

Allt körs i webbläsaren. Klasskamrater simuleras och allt sparas i `localStorage`. Vilken sexsiffrig kod som helst fungerar för elever. Sista siffran avgör spelläget: 0, 3, 6 och 9 blir Biljakt, 2, 4 och 8 blir Fjällförsvar och 1, 5 och 7 blir Topptur.

### Testa riktig multiplayer lokalt

```bash
npm run dev:full     # NEXT_PUBLIC_DEMO_MODE=false, lyssnar på alla nätverkskort
```

1. Öppna `http://localhost:3000/logga-in` → **Skapa konto** som lärare.
2. Välj ett quiz → **Starta** → välj läge → **Öppna lobbyn**.
3. Elever går till `http://<datorns-ip>:3000/spela` (samma wifi) eller öppnar en annan webbläsare/inkognitoflik, skriver koden och spelar.

Konton sparas i `.data/klura.json` (gitignorerad). Testa ensam med simulerade spelare: `KLURA_FILL_BOTS=10 npm run dev:full`.

Backend-delen är en enkel enprocess-server avsedd för slutna tester. Den riktiga produktionsbackenden (databas, delad realtid) kopplas in genom att byta implementation bakom `src/lib/backend` och `src/server/db.ts`.

## Skript

| Kommando | Vad |
| --- | --- |
| `npm run typecheck` | TypeScript |
| `npm run test:filter` | testar namnfiltret (svenska + engelska, leetspeak, varianter) |
| `npm run balans:jakt` | simulerar Biljakt: hur många stjärnor olika elevtyper får |
| `npm run test:import` | testar inklistring av frågor (block- och kalkylarksformat) |
| `npm run balans` | simulerar 3 000 Topptur-matcher |
| `npm run balans:fjall` | simulerar Fjällförsvar för olika elevtyper |

## Struktur

```
src/app/                 routes (/, /spela, /butik, /profil, /larare/…, /api/…)
src/components/game/     elevvy, projektorvy, defense/ (canvas-TD), climb/ (klättervy)
src/lib/game/            spelmotorer: engine.ts (Topptur), defense.ts (Fjällförsvar), chase.ts (Biljakt)
src/lib/rooms/           rum/livesession – samma logik i webbläsaren och på servern
src/lib/backend/         DEMO_MODE, transportgränssnitt (lokal/remote), datalager
src/lib/moderation/      namnfilter
src/server/              lokal backend: JSON-databas, konton, rum
scripts/                 balans- och filtertester
```

## Stack

Next.js (App Router) · React · TypeScript · CSS Modules + eget designsystem · Zustand · Canvas 2D för spelgrafiken (allt ritat i kod) · Server-Sent Events för realtid i backend-läget · Lexend/Nunito via Fontsource.
