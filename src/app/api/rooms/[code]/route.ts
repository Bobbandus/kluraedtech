import { demoGuard, fail, json } from "@/server/http";
import { rooms } from "@/server/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const guard = demoGuard();
  if (guard) return guard;
  const { code } = await params;
  const r = rooms.get(code);
  if (!r) return fail("Inget spel med den koden.", 404);
  return json(r.room.peek());
}
