"use client";

import { useState } from "react";
import type { Hackathon, TeamResponse } from "@/lib/types";

type Props = {
  hackathon: Hackathon;
  onSuccess: (team: TeamResponse) => void;
  onCancel: () => void;
};

const INPUT =
  "h-11 w-full rounded-xl border border-white/10 bg-black px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#8ab4f8] focus:ring-4 focus:ring-[#8ab4f8]/10";

export function CreateTeamForm({ hackathon, onSuccess, onCancel }: Props) {
  const singleTrack = hackathon.tracks.length <= 1;
  const defaultTrack = hackathon.tracks.length > 0 ? hackathon.tracks[0].track_uuid : "general";
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trackUuid, setTrackUuid] = useState(defaultTrack);
  const [requiredSkills, setRequiredSkills] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !trackUuid) return;

    setLoading(true);
    setError("");

    const skills = requiredSkills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/participants/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          hackathon_uuid: hackathon.hackathon_uuid,
          track_uuid: trackUuid,
          is_public: false,
          required_skills: skills,
        }),
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

      {/* Track selector — hidden when only one track exists */}
      {!singleTrack && (
        <div>
          <label htmlFor="team-track" className="mb-1.5 block text-xs text-white/60">
            Track <span className="text-[#f28b82]">*</span>
          </label>
          <select
            id="team-track"
            className="h-11 w-full rounded-xl border border-white/10 bg-black px-4 text-sm text-white outline-none transition focus:border-[#8ab4f8] focus:ring-4 focus:ring-[#8ab4f8]/10"
            value={trackUuid}
            onChange={(e) => setTrackUuid(e.target.value)}
            required
          >
            <option value="" disabled>Select a track…</option>
            {hackathon.tracks.map((t) => (
              <option key={t.track_uuid} value={t.track_uuid}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {singleTrack && (
        <p className="text-xs text-white/30">
          Track: <span className="text-white/50">{hackathon.tracks[0]?.name ?? "General Track"}</span>
        </p>
      )}

      {/* Advanced — collapsible */}
      <details className="group rounded-xl border border-white/[0.06]">
        <summary className="cursor-pointer list-none px-4 py-3 text-xs text-white/40 transition hover:text-white/60">
          <span className="select-none">Advanced</span>
        </summary>
        <div className="space-y-4 border-t border-white/[0.06] px-4 pb-4 pt-3">
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
          <div>
            <label htmlFor="team-skills" className="mb-1.5 block text-xs text-white/60">
              Required Skills
              <span className="ml-1.5 text-white/25">(comma-separated)</span>
            </label>
            <input
              id="team-skills"
              className={INPUT}
              value={requiredSkills}
              onChange={(e) => setRequiredSkills(e.target.value)}
              placeholder="Python, React, Cloud"
            />
          </div>
        </div>
      </details>

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
          disabled={loading || !trackUuid}
          className="h-11 flex-1 rounded-full bg-white text-sm font-medium text-black transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create Team"}
        </button>
      </div>
    </form>
  );
}
