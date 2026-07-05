"use client";

import { useState } from "react";
import type { CreateTeamPayload, TeamResponse } from "@/lib/types";

type Props = {
  onSuccess: (team: TeamResponse) => void;
  onCancel: () => void;
};

const INPUT =
  "h-11 w-full rounded-xl border border-white/10 bg-black px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#8ab4f8] focus:ring-4 focus:ring-[#8ab4f8]/10";

export function CreateTeamForm({ onSuccess, onCancel }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [hackathonUuid, setHackathonUuid] = useState("");
  const [trackUuid, setTrackUuid] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !hackathonUuid.trim() || !trackUuid.trim()) return;

    setLoading(true);
    setError("");

    const payload: CreateTeamPayload = {
      name: name.trim(),
      description: description.trim(),
      hackathon_uuid: hackathonUuid.trim(),
      track_uuid: trackUuid.trim(),
      is_public: isPublic,
      required_skills: [],
    };

    try {
      const res = await fetch("/api/participants/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { detail?: string } & Partial<TeamResponse>;
      if (!res.ok) {
        setError(data.detail ?? "Failed to create team.");
        return;
      }
      onSuccess(data as TeamResponse);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="team-name" className="mb-1.5 block text-xs text-white/60">
          Team Name <span className="text-[#f28b82]">*</span>
        </label>
        <input
          id="team-name"
          className={INPUT}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Awesome Team"
          required
          maxLength={64}
        />
      </div>

      <div>
        <label htmlFor="team-desc" className="mb-1.5 block text-xs text-white/60">
          Description
        </label>
        <input
          id="team-desc"
          className={INPUT}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What will you build?"
          maxLength={256}
        />
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
        <p className="text-xs font-medium text-white/40 uppercase tracking-wider">
          Hackathon details
          <span className="ml-2 normal-case text-white/25">
            — provided by your organiser
          </span>
        </p>
        <div>
          <label htmlFor="hackathon-uuid" className="mb-1.5 block text-xs text-white/60">
            Hackathon UUID <span className="text-[#f28b82]">*</span>
          </label>
          <input
            id="hackathon-uuid"
            className={INPUT}
            value={hackathonUuid}
            onChange={(e) => setHackathonUuid(e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            required
          />
        </div>
        <div>
          <label htmlFor="track-uuid" className="mb-1.5 block text-xs text-white/60">
            Track UUID <span className="text-[#f28b82]">*</span>
          </label>
          <input
            id="track-uuid"
            className={INPUT}
            value={trackUuid}
            onChange={(e) => setTrackUuid(e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            required
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={isPublic}
          aria-label="Public team"
          onClick={() => setIsPublic(!isPublic)}
          className={`relative h-6 w-11 rounded-full transition ${isPublic ? "bg-[#4285F4]" : "bg-white/10"}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isPublic ? "translate-x-5" : "translate-x-0"}`}
          />
        </button>
        <span className="text-sm text-white/60">
          {isPublic
            ? "Public — anyone can request to join"
            : "Private — team code required to join"}
        </span>
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
          {loading ? "Creating…" : "Create Team"}
        </button>
      </div>
    </form>
  );
}
