import Link from "next/link";
import { Avatar } from "@/components/avatar";

export default function NotFound() {
  return (
    <main id="innehall" className="page page-narrow" style={{ textAlign: "center", paddingTop: 80 }}>
      <Avatar skin="molnet" size={120} style={{ margin: "0 auto" }} />
      <h1 style={{ marginTop: 16 }}>Här finns ingen stig</h1>
      <p className="muted" style={{ marginTop: 6 }}>
        Sidan du letar efter finns inte. Kanske gick du vilse i dimman?
      </p>
      <Link href="/" className="btn btn-primary btn-lg" style={{ marginTop: 24 }}>
        Till startsidan
      </Link>
    </main>
  );
}
