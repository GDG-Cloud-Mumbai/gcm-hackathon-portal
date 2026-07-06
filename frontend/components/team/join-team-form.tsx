"use client";

import { useState } from "react";

type Props = {
  onCancel: () => void;
};

const INPUT =
  "h-11 w-full rounded-xl border border-white/10 bg-black px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#8ab4f8] focus:ring-4 focus:ring-[#8ab4f8]/10";

// TODO: enable join once GET /participants/teams/lookup?code= is implemented
// on the backend. That endpoint should resolve a team code to a team UUID,
// which is then passed to POST /participants/teams/{uuid}/join.
export function JoinTeamForm({ onCancel }: Props) {
  const [teamCode, setTeamCode] = useState("");

  return (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
      <div>
        <label htmlFor="join-code" className="mb-1.5 block text-xs text-white/60">
          Team Code <span className="text-[#f28b82]">*</span>
        </label>
        <input
          id="join-code"
          className={INPUT}
          value={teamCode}
          onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
          placeholder="ABC123"
          maxLength={6}
          autoComplete="off"
        />
      </div>

      <div className="rounded-xl border border-[#FBBC04]/15 bg-[#FBBC04]/5 px-4 py-3 text-xs text-[#ffd54f]/70">
        Team lookup by code is pending a backend update. This feature will be
        enabled once the backend supports resolving a team code to a team.
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="h-11 flex-1 rounded-full border border-white/10 text-sm text-white/60 transition hover:text-white"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled
          title="Team lookup by code is pending a backend update"
          className="h-11 flex-1 cursor-not-allowed rounded-full bg-white/10 text-sm font-medium text-white/30"
        >
          Join Team
        </button>
      </div>
    </form>
  );
}
