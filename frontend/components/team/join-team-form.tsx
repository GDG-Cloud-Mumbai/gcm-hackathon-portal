"use client";

import { useState } from "react";

type Props = {
  onSuccess: () => void;
  onCancel: () => void;
};

const INPUT =
  "h-11 w-full rounded-xl border border-white/10 bg-black px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#8ab4f8] focus:ring-4 focus:ring-[#8ab4f8]/10";

export function JoinTeamForm({ onSuccess, onCancel }: Props) {
  const [teamUuid, setTeamUuid] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!teamUuid.trim()) return;

    setLoading(true);
    setError("");

    const body = teamCode.trim() ? { team_code: teamCode.trim() } : {};

    try {
      const res = await fetch(
        `/api/participants/teams/${teamUuid.trim()}/join`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = (await res.json()) as { detail?: string };
      if (!res.ok) {
        setError(data.detail ?? "Failed to submit join request.");
        return;
      }
      setSubmitted(true);
      setTimeout(onSuccess, 1800);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-[#34A853]/20 bg-[#34A853]/5 px-5 py-6 text-center">
        <p className="text-sm font-medium text-[#81c784]">
          Join request submitted!
        </p>
        <p className="mt-1 text-xs text-white/40">
          Waiting for the team leader to approve your request.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="join-uuid" className="mb-1.5 block text-xs text-white/60">
          Team UUID <span className="text-[#f28b82]">*</span>
        </label>
        <input
          id="join-uuid"
          className={INPUT}
          value={teamUuid}
          onChange={(e) => setTeamUuid(e.target.value)}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          required
        />
        <p className="mt-1.5 text-xs text-white/25">
          Ask your team leader for the team UUID.
        </p>
      </div>

      <div>
        <label htmlFor="join-code" className="mb-1.5 block text-xs text-white/60">
          Team Code{" "}
          <span className="text-white/30">(required for private teams)</span>
        </label>
        <input
          id="join-code"
          className={INPUT}
          value={teamCode}
          onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
          placeholder="ABC123"
          maxLength={6}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-[#f28b82]/25 bg-[#f28b82]/10 px-4 py-3 text-sm text-[#f28b82]">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="h-11 flex-1 rounded-full border border-white/10 text-sm text-white/60 transition hover:text-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="h-11 flex-1 rounded-full bg-white text-sm font-medium text-black transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Submitting…" : "Request to Join"}
        </button>
      </div>
    </form>
  );
}
