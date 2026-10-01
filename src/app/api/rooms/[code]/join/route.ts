import { body, clientIp, demoGuard, fail, json, rateLimit } from "@/server/http";
import { rooms } from "@/server/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const guard = demoGuard();
  if (guard) return guard;
  if (!rateLimit(`join:${clientIp(req)}`, 30, 60_000)) return fail("För många försök. Vänta en stund.", 429);
  const { code } = await params;
  const r = rooms.get(code);
  if (!r) return fail("Inget spel med den koden.", 404);
  const b = await body<{ name?: string; skinId?: string }>(req, 2000);
  const res = r.room.join(String(b?.name ?? ""), String(b?.skinId ?? "kisel"));
  if ("error" in res) return fail(res.error);
  return json({ ok: true, token: res.token });
}
