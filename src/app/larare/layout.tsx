"use client";

import { usePathname } from "next/navigation";
import { TeacherNav } from "@/components/nav";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  // Värdvyn (projektorn) visas i helskärm utan meny
  if (path.startsWith("/larare/live")) return <>{children}</>;
  return (
    <>
      <TeacherNav />
      {children}
    </>
  );
}
