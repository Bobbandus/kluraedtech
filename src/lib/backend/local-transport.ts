"use client";

import { Room } from "@/lib/rooms/room";
import type { RoomQuiz, RoomSettings } from "@/lib/rooms/types";
import { ALL_QUIZZES } from "@/data/quizzes";
import type { GameTransport } from "./transport";

/**
 * Demo-transport: rummen lever i den här webbläsarflikens minne.
 * Klasskamraterna simuleras av rummet självt (bottar), så att en elev kan
 * spela ensam och en lärare kan visa projektorvyn utan uppkopplade elever.
 */

const rooms = new Map<string, Room>();
const ROTATION = ["stormaktstiden", "kroppen", "procent", "vikingatiden", "periodiska", "kallkritik", "irregular-verbs", "sveriges-landskap", "demokrati"];

function newCode(): string {
  let c = "";
  do c = String(100000 + Math.floor(Math.random() * 900000));
  while (rooms.has(c));
  return c;
}

function toRoomQuiz(id: string): RoomQuiz {
  const q = ALL_QUIZZES.find((x) => x.id === id)!;
  return { id: q.id, title: q.title, subject: q.subject, questions: q.questions };
}

/** En elev som skriver en kod som inte finns lokalt får en simulerad match. */
function demoRoomFor(code: string): Room {
  let room = rooms.get(code);
  if (room) return room;
  const n = code.split("").reduce((a, c) => a + Number(c), 0);
  // Koder som slutar på jämn siffra blir Fjällförsvar, udda blir Topptur
  const mode = Number(code[code.length - 1]) % 2 === 0 ? "fjall" : "topptur";
  room = new Room(code, toRoomQuiz(ROTATION[n % ROTATION.length]), { mode, energy: "standard", longerTime: false, randomNames: false, minutes: 5 }, Date.now(), {
    bots: 23,
    autoHost: true,
  });
  rooms.set(code, room);
  return room;
}

function watch<T>(room: Room, view: () => T | null, cb: (v: T) => void): () => void {
  let last = -1;
  const emit = () => {
    const v = view();
    if (v) cb(v);
  };
  const iv = setInterval(() => {
    room.tick(Date.now());
    if (room.version !== last) {
      last = room.version;
      emit();
    }
  }, 120);
  emit();
  return () => clearInterval(iv);
}

export const localTransport: GameTransport = {
  kind: "local",
  async createRoom(quiz: RoomQuiz, settings: RoomSettings) {
    const code = newCode();
    const room = new Room(code, quiz, settings, Date.now(), { bots: 26 });
    rooms.set(code, room);
    return { code, hostKey: room.hostKey };
  },
  hostWatch(code, hostKey, cb, onError) {
    const room = rooms.get(code);
    if (!room || room.hostKey !== hostKey) {
      onError?.("Spelet finns inte längre.");
      return () => {};
    }
    return watch(room, () => room.hostView(Date.now()), cb);
  },
  async hostAction(code, hostKey, action) {
    const room = rooms.get(code);
    if (!room || room.hostKey !== hostKey) return { ok: false, error: "Spelet finns inte längre." };
    return room.host(action, Date.now());
  },
  async peek(code) {
    if (!/^\d{6}$/.test(code)) return null;
    return demoRoomFor(code).peek();
  },
  async join(code, name, skinId) {
    if (!/^\d{6}$/.test(code)) return { error: "Spelkoden har sex siffror." };
    const r = demoRoomFor(code).join(name, skinId);
    return "error" in r ? r : { token: r.token };
  },
  playerWatch(code, tok, cb, onError) {
    const room = rooms.get(code);
    if (!room) {
      onError?.("Spelet finns inte längre.");
      return () => {};
    }
    return watch(room, () => room.playerView(tok, Date.now()), cb);
  },
  async act(code, tok, action) {
    const room = rooms.get(code);
    if (!room) return { ok: false, error: "Spelet finns inte längre." };
    return room.act(tok, action, Date.now());
  },
};
