"use client";

import { useState } from "react";

type Props = {
  teamUuid: string;
};

/*
 * BACKEND GAP: participant search by email is not yet available.
 *
 * Required endpoint: GET /participants/users/search?email=<query>
 * Response: [{ uuid, name, email, username }]
 *
 * When the endpoint ships, replace the placeholder below with a real search
 * that calls /api/participants/users/search, displays results, and sends
 * the selected user's uuid to POST /api/participants/teams/:uuid/invite.
 */

export function InviteSearch({ teamUuid }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Placeholder — remove once backend search endpoint exists.
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setSuccess("");
    // Simulate network delay for realistic feel
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    setError(
      "Participant search is not available yet. Ask the participant for their user UUID and use the direct invite field below.",
    );
  }

  async function handleDirectInvite(uuid: string) {
    setError("");
    setSuccess("");
    const res = await fetch(`/api/participants/teams/${teamUuid}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_uuid: uuid }),
    });
    const data = (await res.json()) as { detail?: string };
    if (!res.ok) {
      setError(data.detail ?? "Failed to send invitation.");
    } else {
      setSuccess("Invitation sent successfully.");
      setQuery("");
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950 p-5">
      <h3 className="mb-3 text-sm font-medium text-white">Invite a Participant</h3>

      {/* Email search (placeholder) */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email address…"
          className="h-10 flex-1 rounded-xl border border-white/10 bg-black px-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-[#8ab4f8] focus:ring-4 focus:ring-[#8ab4f8]/10"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="h-10 shrink-0 rounded-xl border border-white/10 px-4 text-sm text-white/60 transition hover:text-white disabled:opacity-40"
        >
          {loading ? "…" : "Search"}
        </button>
      </form>

      {/* Direct invite by UUID (fallback) */}
      <DirectUuidInvite onInvite={handleDirectInvite} />

      {error && (
        <p className="mt-3 text-xs text-[#f28b82]">{error}</p>
      )}
      {success && (
        <p className="mt-3 text-xs text-[#81c784]">{success}</p>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-white/20">
        Email-based participant search requires a backend endpoint that is not
        yet available. The direct UUID invite above works in the meantime.
      </p>
    </div>
  );
}

function DirectUuidInvite({
  onInvite,
}: {
  onInvite: (uuid: string) => Promise<void>;
}) {
  const [uuid, setUuid] = useState("");
  const [loading, setLoading] = useState(false);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    if (!uuid.trim()) return;
    setLoading(true);
    await onInvite(uuid.trim());
    setUuid("");
    setLoading(false);
  }

  return (
    <form onSubmit={handle} className="mt-3 flex gap-2">
      <input
        value={uuid}
        onChange={(e) => setUuid(e.target.value)}
        placeholder="Or paste user UUID directly"
        className="h-10 flex-1 rounded-xl border border-white/[0.06] bg-black/60 px-3 font-mono text-xs text-white/60 outline-none transition placeholder:text-white/15 focus:border-[#8ab4f8]/40 focus:text-white"
      />
      <button
        type="submit"
        disabled={loading || !uuid.trim()}
        className="h-10 shrink-0 rounded-xl bg-white px-4 text-sm font-medium text-black transition hover:bg-zinc-100 disabled:opacity-40"
      >
        {loading ? "…" : "Invite"}
      </button>
    </form>
  );
}
