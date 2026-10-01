# Klura

Ett svenskt multiplayer-quiz för klassrummet där kunskap är den viktigaste skillen.

- **Elever** går med med en sexsiffrig kod, väljer namn och figur och spelar **Topptur**: tre etapper med frågor, spelkort mellan etapperna och en lugn rytm utan ständig topplista.
- **Lärare** skapar egna quiz, hittar färdiga i **Upptäck**, startar spel med vald klassrumsenergi (Lugn / Standard / Full fart) och får resultat som visar vad klassen behöver repetera.

Den här versionen är en frontend utan backend: livesessioner, klasskamrater och historik simuleras lokalt och sparas i `localStorage`.

## Kom igång

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # produktionsbygge
npm run start      # kör produktionsbygget
npm run typecheck  # TypeScript
npm run balans     # simulerar 3 000 matcher och skriver ut vinstfördelning
```

Kräver Node 20+. Deploy: importera repot i Vercel – inga miljövariabler behövs.

## Stack

Next.js (App Router) · React · TypeScript · CSS Modules + ett litet eget designsystem i `globals.css` · Zustand för lokal state · egna SVG-figurer och ikoner · Lexend/Nunito via Fontsource (inga externa anrop vid bygge).

## Struktur

```
src/app/            routes (/, /spela, /butik, /profil, /larare/…)
src/components/     UI, figurer (avatar.tsx), ikoner, spelvyer (game/)
src/lib/game/       spelmotorn – ren TS, används av klient och simulering
src/lib/            store, livesessioner, resultatanalys
src/data/           quiz, figurer, namn och klasser
scripts/balans.ts   balanssimulering
```

## Spelbalans (Topptur)

100 m per rätt svar, fartbonus max 20 m som avtar mjukt, radbonus max 40 m, sista etappen ×1,25. Fel ger aldrig minus. Spelkort påverkar bara framtida poäng. I simuleringen (`npm run balans`, endast A–D) vinner eleven med 92 % rätt och bra tempo ~69 %, den långsamma men noggranna (88 %) ~24 %, snabbklickaren (73 %) ~6 % och eleven med 55 % och maximal tur ~0,2 %.
