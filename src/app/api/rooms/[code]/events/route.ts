import { demoGuard, fail } from "@/server/http";
import { rooms } from "@/server/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Realtid via Server-Sent Events. Skickar en ny vy när rummet ändras. */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const guard = demoGuard();
  if (guard) return guard;
  const { code } = await params;
  const r = rooms.get(code);
  if (!r) return fail("Spelet finns inte längre.", 404);
  const url = new URL(req.url);
  const hostKey = url.searchParams.get("hostKey");
  const token = url.searchParams.get("token");
  const room = r.room;
  if (hostKey && hostKey !== room.hostKey) return fail("Saknar behörighet.", 403);
  if (!hostKey && !token) return fail("Saknar behörighet.", 403);

  const enc = new TextEncoder();
  let iv: ReturnType<typeof setInterval> | null = null;
  let ping: ReturnType<typeof setInterval> | null = null;
  const stream = new ReadableStream({
    start(controller) {
      let last = -1;
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        if (iv) clearInterval(iv);
        if (ping) clearInterval(ping);
        try {
          controller.close();
        } catch {}
      };
      const push = () => {
        const now = Date.now();
        room.tick(now);
        if (room.version === last) return;
        last = room.version;
        const view = hostKey ? room.hostView(now) : room.playerView(token!, now);
        if (!view) {
          controller.enqueue(enc.encode(`event: fel\ndata: Du är inte längre med i spelet.\n\n`));
          close();
          return;
        }
        controller.enqueue(enc.encode(`data: ${JSON.stringify(view)}\n\n`));
      };
      push();
      iv = setInterval(push, 250);
      ping = setInterval(() => !closed && controller.enqueue(enc.encode(`: ping\n\n`)), 15_000);
      req.signal.addEventListener("abort", close);
    },
    cancel() {
      if (iv) clearInterval(iv);
      if (ping) clearInterval(ping);
    },
  });
  return new Response(stream, {
    headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", connection: "keep-alive", "x-accel-buffering": "no" },
  });
}
