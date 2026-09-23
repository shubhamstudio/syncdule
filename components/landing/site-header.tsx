"use client";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import Logo from "@/components/logo";
import { LandingActions } from "./landing-actions";
import { landingNavigation } from "./landing-data";

type SiteHeaderProps = {
  isSignedIn: boolean | undefined;
};

export function SiteHeader({ isSignedIn }: SiteHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const updateScrollState = () => setIsScrolled(window.scrollY > 12);

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });

    return () => window.removeEventListener("scroll", updateScrollState);
  }, []);

  const closeMobileMenu = () => setIsMenuOpen(false);

  return (
    <header className={isScrolled ? "landing-header landing-header-scrolled" : "landing-header"}>
      <div className="landing-container landing-header-inner">
        <Link href="/" aria-label="SYNCDULE home">
          <Logo className="landing-logo" />
        </Link>

        <nav aria-label="Primary navigation" className="landing-nav">
          {landingNavigation.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="landing-header-actions">
          <div className="landing-header-desktop">
            <LandingActions isSignedIn={isSignedIn} compact />
          </div>
          {isSignedIn && <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />}
          <button
            className="landing-menu-toggle"
            type="button"
            aria-expanded={isMenuOpen}
            aria-controls="landing-mobile-menu"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <span className="sr-only">Toggle navigation</span>
            {isMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </div>

      <nav
        id="landing-mobile-menu"
        aria-label="Mobile navigation"
        className={isMenuOpen ? "landing-mobile-menu is-open" : "landing-mobile-menu"}
      >
        {landingNavigation.map((item) => (
          <a key={item.href} href={item.href} onClick={closeMobileMenu}>
            {item.label}
          </a>
        ))}
        {!isSignedIn && (
          <Link href="/sign-in" onClick={closeMobileMenu}>
            Log in
          </Link>
        )}
      </nav>
    </header>
  );
}
