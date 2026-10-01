import type { Metadata, Viewport } from "next";
import "@fontsource-variable/lexend";
import "@fontsource-variable/nunito";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: { default: "Klura – quiz där kunskap vinner", template: "%s · Klura" },
  description: "Klura är quizspel för klassrummet där kunskap vinner. Tre spellägen – Biljakt, Fjällförsvar och Topptur – färdiga quiz för åk 7–9 och resultat som visar vad klassen behöver repetera.",
  icons: { icon: "/icon.svg" },
  openGraph: { title: "Klura – quiz där kunskap vinner", description: "Quizspel för klassrummet: Biljakt, Fjällförsvar och Topptur. Gratis att börja.", locale: "sv_SE", type: "website", siteName: "Klura" },
};

export const viewport: Viewport = {
  themeColor: "#12735a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body>
        <a href="#innehall" className="skip-link">
          Hoppa till innehållet
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
