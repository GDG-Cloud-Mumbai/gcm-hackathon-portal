"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  href: string;
  label: string;
};

export function HackathonNavLink({ href, label }: Props) {
  const pathname = usePathname();
  // Exact match for Overview (/hackathons/[id]), prefix match for Team (/hackathons/[id]/team)
  const isActive = pathname === href || (href.endsWith("/team") && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-1.5 text-sm transition ${
        isActive
          ? "bg-white/[0.08] text-white"
          : "text-white/40 hover:text-white/70"
      }`}
    >
      {label}
    </Link>
  );
}
