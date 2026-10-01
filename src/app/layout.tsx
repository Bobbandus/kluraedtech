import type { Metadata, Viewport } from "next";
import "@fontsource-variable/lexend";
import "@fontsource-variable/nunito";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: { default: "Klura – quiz där kunskap vinner", template: "%s · Klura" },
  description: "Klura är ett multiplayer-quiz för klassrummet där kunskap är den viktigaste skillen. Gå med med en kod, klättra mot toppen.",
  icons: { icon: "/icon.svg" },
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
