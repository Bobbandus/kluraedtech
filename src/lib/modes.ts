import type { IconName } from "@/components/icons";
import type { GameMode } from "@/lib/rooms/types";

/** Namn och ikon per spelläge – samma överallt i appen. */
export const MODE_INFO: Record<GameMode, { name: string; icon: IconName; tag: string }> = {
  topptur: { name: "Topptur", icon: "mountain", tag: "Alla svarar samtidigt" },
  fjall: { name: "Fjällförsvar", icon: "hammer", tag: "Tower defense i egen takt" },
  jakt: { name: "Biljakt", icon: "car", tag: "Kör undan polisen i egen takt" },
};
