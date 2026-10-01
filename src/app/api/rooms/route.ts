import { Room } from "@/lib/rooms/room";
import { currentUser } from "@/server/auth";
import { body, demoGuard, fail, json } from "@/server/http";
import { newCode, rooms, sanitizeQuiz, sanitizeSettings } from "@/server/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const guard = demoGuard();
  if (guard) return guard;
  const user = await currentUser();
  if (!user || user.role !== "larare") return fail("Logga in som lärare för att starta ett spel.", 401);
  const b = await body<{ quiz?: unknown; settings?: unknown }>(req);
  const quiz = sanitizeQuiz(b?.quiz);
  if (typeof quiz === "string") return fail(quiz);
  const code = newCode();
  // KLURA_FILL_BOTS=10 fyller rummet med simulerade spelare (bra när man testar ensam)
  const bots = Math.min(40, Number(process.env.KLURA_FILL_BOTS ?? 0) || 0);
  const room = new Room(code, quiz, sanitizeSettings(b?.settings), Date.now(), { bots, seed: Math.floor(Math.random() * 1e9) });
  rooms.set(code, { room, ownerId: user.id });
  return json({ ok: true, code, hostKey: room.hostKey });
}
