import type { ActResult, HostAction, HostView, Peek, PlayerAction, PlayerView, RoomQuiz, RoomSettings } from "@/lib/rooms/types";

/**
 * Det enda gränssnittet spelvyerna pratar med. Två implementationer:
 *  - LocalTransport  (demo: rummen lever i webbläsaren)
 *  - RemoteTransport (fetch + EventSource mot /api/rooms)
 */
export interface GameTransport {
  readonly kind: "local" | "remote";
  createRoom(quiz: RoomQuiz, settings: RoomSettings): Promise<{ code: string; hostKey: string }>;
  hostWatch(code: string, hostKey: string, cb: (v: HostView) => void, onError?: (e: string) => void): () => void;
  hostAction(code: string, hostKey: string, action: HostAction): Promise<{ ok: boolean; error?: string }>;
  peek(code: string): Promise<Peek | null>;
  join(code: string, name: string, skinId: string): Promise<{ token: string } | { error: string }>;
  playerWatch(code: string, token: string, cb: (v: PlayerView) => void, onError?: (e: string) => void): () => void;
  act(code: string, token: string, action: PlayerAction): Promise<ActResult>;
}

export class TransportError extends Error {}
