"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Moon, Sun } from "lucide-react";

const THEME_KEY = "sc-theme";
const LEGACY_THEME_KEY = "scamcheck-theme";

function savedTheme(): "light" | "dark" | null {
  const saved = localStorage.getItem(THEME_KEY) || localStorage.getItem(LEGACY_THEME_KEY);
  return saved === "light" || saved === "dark" ? saved : null;
}

function systemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function currentTheme(): "light" | "dark" {
  const set = document.documentElement.dataset.theme;
  if (set === "dark" || set === "light") return set;
  return systemTheme();
}

export function applyTheme(theme: "light" | "dark") {
  document.documentElement.dataset.theme = theme;
  const color = theme === "dark" ? "#0C0C0E" : "#FAFAFA";
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute("content", color);
  });
}

function themeLabel(theme: "light" | "dark") {
  return theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      const theme = savedTheme() ?? (media.matches ? "dark" : "light");
      toggleRef.current?.setAttribute("aria-label", themeLabel(theme));
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  function toggleTheme() {
    const next = currentTheme() === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, next);
    localStorage.removeItem(LEGACY_THEME_KEY);
    applyTheme(next);
    toggleRef.current?.setAttribute("aria-label", themeLabel(next));
  }

  return (
    <div className="app">
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <header className="site-header">
        <Link href="/" aria-label="ScamCheck GH home" className="inline-flex items-center min-h-tap">
          {/* Self-hosted brand SVGs. next/image wraps these and fights the light/dark swap. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="only-light h-[30px] w-auto" src="/brand/lockup-light.svg" alt="" width={168} height={30} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="only-dark h-[30px] w-auto" src="/brand/lockup-dark.svg" alt="" width={168} height={30} />
        </Link>
        <nav className="site-nav" aria-label="Main">
          <Link className="nav-link desktop-nav" href="/" aria-current={pathname === "/" ? "page" : undefined}>
            Check
          </Link>
          <Link
            className="nav-link desktop-nav"
            href="/about"
            aria-current={pathname === "/about" ? "page" : undefined}
          >
            How it works
          </Link>
          <Link className="nav-link desktop-nav" href="/radar" aria-current={pathname === "/radar" ? "page" : undefined}>
            Radar
          </Link>
          <Link className="nav-link desktop-nav" href="/family" aria-current={pathname === "/family" ? "page" : undefined}>
            Family
          </Link>
          <Link
            className="nav-link desktop-nav"
            href="/privacy"
            aria-current={pathname === "/privacy" ? "page" : undefined}
          >
            Privacy
          </Link>
          <button
            type="button"
            ref={toggleRef}
            className="theme-toggle"
            aria-label="Switch between light and dark mode"
            title="Light / dark"
            onClick={toggleTheme}
          >
            <Moon className="only-light" aria-hidden strokeWidth={2} />
            <Sun className="only-dark" aria-hidden strokeWidth={2} />
          </button>
        </nav>
      </header>
      <div className="site-main" id="content">
        {children}
      </div>
      <footer className="site-footer t-small">
        <p>ScamCheck GH gives advice, not a guarantee. If you are unsure, call your network on 100 before you send anything.</p>
        <nav className="footer-links mt-3" aria-label="More">
          <Link className="text-link" href="/about">
            How it works
          </Link>
          <Link className="text-link" href="/privacy">
            Privacy
          </Link>
          <Link className="text-link" href="/shield">
            My Shield
          </Link>
          <Link className="text-link" href="/digest">
            This week
          </Link>
          <Link className="text-link" href="/radar">
            Scam Radar
          </Link>
          <Link className="text-link" href="/family">
            Check for Mum
          </Link>
          <Link className="text-link" href="/whatsapp">
            WhatsApp
          </Link>
          <Link className="text-link" href="/ussd">
            USSD
          </Link>
          <Link className="text-link" href="/disclaimer">
            Disclaimer
          </Link>
        </nav>
        <p className="mt-3">Not affiliated with MTN, Telecel, AT, the Cyber Security Authority, or the Ghana Police.</p>
      </footer>
    </div>
  );
}
