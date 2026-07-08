"use client";

import { useEffect, useState } from "react";
import type { AuthUser } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

const INPUT =
  "h-11 w-full rounded-xl border border-white/10 bg-black px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#8ab4f8] focus:ring-4 focus:ring-[#8ab4f8]/10";

export default function ProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        const u = data as AuthUser;
        setUser(u);
        setName(u.name ?? "");
        setUsername(u.username ?? "");
      })
      .catch(() => {/* fail silently — user sees empty fields */})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);

    const payload: Record<string, string> = {};
    if (name.trim()) payload.name = name.trim();
    if (username.trim()) payload.username = username.trim();

    const res = await fetch("/api/auth/update-profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { detail?: string } & Partial<AuthUser>;

    if (!res.ok) {
      setSaveError(data.detail ?? "Failed to save profile.");
    } else {
      setUser(data as AuthUser);
      setSaveSuccess(true);
    }
    setSaving(false);
  }

  const placeholderSections = [
    "Notification Preferences",
    "Security Settings",
    "Connected Accounts",
  ];

  return (
    <div className="mx-auto max-w-xl space-y-8 px-6 py-10">
      <div>
        <p className="mb-1 font-mono text-xs uppercase tracking-widest text-white/30">
          Account
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Profile
        </h1>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label htmlFor="profile-email" className="mb-1.5 block text-xs text-white/60">
              Email
            </label>
            <input
              id="profile-email"
              className={`${INPUT} cursor-not-allowed opacity-50`}
              value={user?.email ?? ""}
              readOnly
              aria-readonly="true"
            />
          </div>
          <div>
            <label htmlFor="profile-name" className="mb-1.5 block text-xs text-white/60">
              Display Name
            </label>
            <input
              id="profile-name"
              className={INPUT}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={64}
            />
          </div>
          <div>
            <label htmlFor="profile-username" className="mb-1.5 block text-xs text-white/60">
              Username
            </label>
            <input
              id="profile-username"
              className={INPUT}
              value={username}
              onChange={(e) =>
                setUsername(e.target.value.replace(/[^a-z0-9_.-]/gi, ""))
              }
              placeholder="yourhandle"
              maxLength={32}
            />
          </div>

          {saveError && (
            <div className="rounded-xl border border-[#f28b82]/25 bg-[#f28b82]/10 px-4 py-3 text-sm text-[#f28b82]">
              {saveError}
            </div>
          )}
          {saveSuccess && (
            <div className="rounded-xl border border-[#34A853]/20 bg-[#34A853]/10 px-4 py-3 text-sm text-[#81c784]">
              Profile updated successfully.
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="h-11 w-full rounded-full bg-white text-sm font-medium text-black transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </form>
      )}

      {/* Coming-soon sections */}
      <div className="space-y-2.5 border-t border-white/[0.06] pt-6">
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-white/20">
          Coming Soon
        </p>
        {placeholderSections.map((section) => (
          <div
            key={section}
            className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-zinc-950 px-4 py-3 opacity-40"
          >
            <span className="text-sm text-white">{section}</span>
            <span className="text-xs text-white/40">Not available yet</span>
          </div>
        ))}
      </div>
    </div>
  );
}
