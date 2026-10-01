"use client";

import type { HostView, PlayerView } from "@/lib/rooms/types";
import type { GameTransport } from "./transport";

/**
 * Riktig transport mot backend-API:t (src/app/api/rooms).
 * Realtid via Server-Sent Events, handlingar via POST.
 *
 * Byt mot WebSocket/Supabase Realtime/PartyKit genom att implementera
 * samma gränssnitt – spelvyerna behöver inte ändras.
 */

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), credentials: "same-origin" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data.error ?? "Något gick fel. Försök igen.", ...data } as T;
  return data as T;
}

function stream<T>(url: string, cb: (v: T) => void, onError?: (e: string) => void): () => void {
  let closed = false;
  let es: EventSource | null = null;
  let retry: ReturnType<typeof setTimeout> | null = null;
  const open = () => {
    es = new EventSource(url);
    es.onmessage = (ev) => cb(JSON.parse(ev.data) as T);
    es.addEventListener("fel", (ev) => {
      onError?.((ev as MessageEvent).data || "Anslutningen bröts.");
      es?.close();
      closed = true;
    });
    es.onerror = () => {
      es?.close();
      if (!closed) retry = setTimeout(open, 1500);
    };
  };
  open();
  return () => {
    closed = true;
    es?.close();
    if (retry) clearTimeout(retry);
  };
}

export const remoteTransport: GameTransport = {
  kind: "remote",
  async createRoom(quiz, settings) {
    const r = await post<{ code: string; hostKey: string; error?: string }>("/api/rooms", { quiz, settings });
    if (r.error) throw new Error(r.error);
    return r;
  },
  hostWatch(code, hostKey, cb, onError) {
    return stream<HostView>(`/api/rooms/${code}/events?hostKey=${encodeURIComponent(hostKey)}`, cb, onError);
  },
  hostAction(code, hostKey, action) {
    return post(`/api/rooms/${code}/host`, { hostKey, action });
  },
  async peek(code) {
    const res = await fetch(`/api/rooms/${code}`);
    return res.ok ? res.json() : null;
  },
  async join(code, name, skinId) {
    const r = await post<{ token?: string; error?: string }>(`/api/rooms/${code}/join`, { name, skinId });
    return r.token ? { token: r.token } : { error: r.error ?? "Kunde inte gå med." };
  },
  playerWatch(code, tok, cb, onError) {
    return stream<PlayerView>(`/api/rooms/${code}/events?token=${encodeURIComponent(tok)}`, cb, onError);
  },
  act(code, tok, action) {
    return post(`/api/rooms/${code}/act`, { token: tok, action });
  },
};
