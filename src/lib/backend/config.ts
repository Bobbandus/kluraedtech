/**
 * DEMO_MODE = true (standard): allt körs i webbläsaren med simulerade
 * klasskamrater och lokal lagring. Det är så den publicerade sidan körs.
 *
 * DEMO_MODE = false: klienten pratar med backend-API:t i src/app/api
 * (konton, riktiga rum och realtid via Server-Sent Events).
 * Starta med `npm run dev:full`.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
