import { DEMO_MODE } from "@/lib/backend/config";

/** Gemensamma hjälpare för API-routes. */

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

export function fail(error: string, status = 400) {
  return json({ ok: false, error }, status);
}

/** API:t är avstängt i demoläge (t.ex. på Vercel). */
export function demoGuard(): Response | null {
  return DEMO_MODE ? fail("Backend är avstängd i demoläge. Starta med npm run dev:full.", 404) : null;
}

export async function body<T>(req: Request, max = 400_000): Promise<T | null> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > max) return null;
  try {
    const txt = await req.text();
    if (txt.length > max) return null;
    return JSON.parse(txt) as T;
  } catch {
    return null;
  }
}

/** Enkel minnesbaserad hastighetsbegränsning per nyckel. */
const hits = new Map<string, number[]>();
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  return list.length <= max;
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "lokal";
}
