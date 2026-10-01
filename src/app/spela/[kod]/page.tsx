import type { Metadata } from "next";
import StudentGame from "@/components/game/StudentGame";

export const metadata: Metadata = { title: "Spela" };

export default async function Page({ params }: { params: Promise<{ kod: string }> }) {
  const { kod } = await params;
  return <StudentGame code={kod.replace(/\D/g, "").slice(0, 6)} />;
}
