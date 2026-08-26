"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const baseLinks = [
  { href: "/home", label: "Home" },
  { href: "/profile", label: "Profile" },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [navLinks, setNavLinks] = useState(baseLinks);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((user) => {
        const role = user?.global_role?.name;
        if (role === "admin" || role === "superadmin") {
          setNavLinks([
            { href: "/home", label: "Home" },
            { href: "/admin", label: "Admin" },
            { href: "/profile", label: "Profile" },
          ]);
        }
      })
      .catch(() => {
        // Keep base links on fetch failure
      });
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth");
    router.refresh();
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/home" className="group flex items-center gap-2.5">
          <div className="grid rotate-45 grid-cols-2 gap-[3px]">
            <span className="h-2 w-2 rounded-full bg-[#4285F4]" />
            <span className="h-2 w-2 rounded-full bg-[#EA4335]" />
            <span className="h-2 w-2 rounded-full bg-[#FBBC04]" />
            <span className="h-2 w-2 rounded-full bg-[#34A853]" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-white/90">
              GDG Cloud Mumbai
            </span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-[#8ab4f8]">
              Hackathon Portal
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Main navigation"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex h-8 items-center rounded-full px-3 text-sm transition ${
                isActive(link.href)
                  ? "bg-white/10 font-medium text-white"
                  : "text-white/50 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="hidden md:block">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="h-8 rounded-full border border-white/10 px-4 text-sm text-white/70 transition hover:border-white/20 hover:text-white disabled:opacity-50"
          >
            {loggingOut ? "Logging out…" : "Logout"}
          </button>
        </div>

        {/* Mobile toggle */}
        <button
          className="p-1.5 text-white/60 transition hover:text-white md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {mobileOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="border-t border-white/10 bg-black px-6 py-4 md:hidden">
          <nav className="space-y-1" aria-label="Mobile navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex h-10 items-center rounded-xl px-3 text-sm transition ${
                  isActive(link.href)
                    ? "bg-white/10 font-medium text-white"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 border-t border-white/[0.06] pt-3">
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex h-10 w-full items-center rounded-xl px-3 text-sm text-white/60 transition hover:text-white"
            >
              {loggingOut ? "Logging out…" : "Logout"}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
