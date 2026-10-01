# Klura

Ett svenskt multiplayer-quiz för klassrummet där kunskap är den viktigaste skillen.

**Spellägen**

- **Fjällförsvar** – tower defense i egen takt. Varje elev försvarar sin stuga mot troll. Rätt svar ger virke, virket blir torn. Trollen går hela tiden, så man måste både kunna svaren och spela. Fel svar spärrar en kort stund och visar förklaringen.
- **Topptur** – hela klassen svarar på samma fråga på tavlan och klättrar mot toppen. En Joker per match tar bort två fel svar.

**Lärare** skapar quiz, hittar färdiga i Upptäck, väljer läge och klassrumsenergi (Lugn / Standard / Full fart) och får resultat som visar vad klassen behöver repetera.

## Kom igång

```bash
npm install
npm run dev          # demoläge: http://localhost:3000
npm run build && npm run start
```

Kräver Node 20+.

### Demoläge (standard, så körs Vercel)

Allt körs i webbläsaren. Klasskamrater simuleras och allt sparas i `localStorage`. Vilken sexsiffrig kod som helst fungerar för elever. Koder som slutar på en jämn siffra blir Fjällförsvar, udda blir Topptur.

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
| `npm run balans` | simulerar 3 000 Topptur-matcher |
| `npm run balans:fjall` | simulerar Fjällförsvar för olika elevtyper |

## Struktur

```
src/app/                 routes (/, /spela, /butik, /profil, /larare/…, /api/…)
src/components/game/     elevvy, projektorvy, defense/ (canvas-TD), climb/ (klättervy)
src/lib/game/            spelmotorer: engine.ts (Topptur), defense.ts (Fjällförsvar)
src/lib/rooms/           rum/livesession – samma logik i webbläsaren och på servern
src/lib/backend/         DEMO_MODE, transportgränssnitt (lokal/remote), datalager
src/lib/moderation/      namnfilter
src/server/              lokal backend: JSON-databas, konton, rum
scripts/                 balans- och filtertester
```

## Stack

Next.js (App Router) · React · TypeScript · CSS Modules + eget designsystem · Zustand · Canvas 2D för spelgrafiken (allt ritat i kod) · Server-Sent Events för realtid i backend-läget · Lexend/Nunito via Fontsource.
