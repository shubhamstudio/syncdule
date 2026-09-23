import Link from "next/link";
import Logo from "@/components/logo";
import { APP_NAME, APP_OWNER } from "@/constants/app";

export function SiteFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-container">
        <Logo />
        <p>
          © {new Date().getFullYear()} {APP_OWNER}. {APP_NAME} is licensed by
          {" "}{APP_OWNER}. All rights reserved.
        </p>
        <nav aria-label="Footer navigation">
          <Link href="#features">Features</Link>
          <Link href="#channels">Channels</Link>
          <Link href="#pricing">Start free</Link>
        </nav>
      </div>
    </footer>
  );
}
