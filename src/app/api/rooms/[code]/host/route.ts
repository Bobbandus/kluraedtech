import type { HostAction } from "@/lib/rooms/types";
import { body, demoGuard, fail, json } from "@/server/http";
import { rooms } from "@/server/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = ["start", "next", "pause", "resume", "end", "kick"];

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const guard = demoGuard();
  if (guard) return guard;
  const { code } = await params;
  const r = rooms.get(code);
  if (!r) return fail("Spelet finns inte längre.", 404);
  const b = await body<{ hostKey?: string; action?: HostAction }>(req, 2000);
  if (!b?.hostKey || b.hostKey !== r.room.hostKey) return fail("Saknar behörighet.", 403);
  if (!b.action || !ALLOWED.includes(b.action.type)) return fail("Okänd handling.");
  const res = r.room.host(b.action, Date.now());
  return json(res, res.ok ? 200 : 400);
}
