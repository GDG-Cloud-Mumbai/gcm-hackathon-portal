"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    router.push("/auth");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-full border border-white/10 bg-white px-5 py-2 text-sm font-medium text-black transition hover:bg-white/85"
    >
      Logout
    </button>
  );
}