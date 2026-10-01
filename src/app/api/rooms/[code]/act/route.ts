import type { PlayerAction } from "@/lib/rooms/types";
import { body, demoGuard, fail, json, rateLimit } from "@/server/http";
import { rooms } from "@/server/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = ["answer", "joker", "next", "fjall_next", "fjall_answer", "fjall_report", "leave"];

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const guard = demoGuard();
  if (guard) return guard;
  const { code } = await params;
  const r = rooms.get(code);
  if (!r) return fail("Spelet finns inte längre.", 404);
  const b = await body<{ token?: string; action?: PlayerAction }>(req, 4000);
  if (!b?.token || !b.action || !ALLOWED.includes(b.action.type)) return fail("Ogiltig begäran.");
  if (!rateLimit(`act:${b.token}`, 60, 10_000)) return fail("För många förfrågningar.", 429);
  const now = Date.now();
  r.room.tick(now);
  const res = r.room.act(b.token, b.action, now);
  return json(res, res.ok ? 200 : 400);
}
