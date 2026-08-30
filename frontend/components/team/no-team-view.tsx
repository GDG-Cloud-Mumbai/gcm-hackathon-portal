"use client";

import { useState } from "react";
import { CreateTeamForm } from "./create-team-form";
import { JoinTeamForm } from "./join-team-form";
import type { Hackathon, TeamResponse } from "@/lib/types";

type View = "choice" | "create" | "join";

type Props = {
  hackathon: Hackathon;
  onTeamCreated: (team: TeamResponse) => void;
  isPast?: boolean;
  isAdmin?: boolean;
};

export function NoTeamView({ hackathon, onTeamCreated, isPast = false, isAdmin = false }: Props) {
  const [view, setView] = useState<View>("choice");
  const canCreateTeam = !isPast && !isAdmin && hackathon.tracks.length > 0;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-5">
      <div className="w-full max-w-md">
        {view === "choice" && (
          <>
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-2xl">
                👥
              </div>
              <h2 className="text-xl font-semibold text-white">
                You&apos;re not in a team yet
              </h2>
              <p className="mt-2 text-sm text-white/40">
                {isAdmin
                  ? "Administrators are excluded from participating in teams."
                  : isPast
                  ? "Team actions are closed."
                  : hackathon.tracks.length === 0
                  ? "Team creation is unavailable until this hackathon has an active track."
                  : "Create a new team or join an existing one to get started."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setView("create")}
                disabled={!canCreateTeam}
                className="group flex h-28 flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-zinc-950 transition hover:border-white/20 hover:bg-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="text-2xl">✨</span>
                <span className="text-sm font-medium text-white/70 transition group-hover:text-white">
                  Create Team
                </span>
              </button>
              <button
                onClick={() => setView("join")}
                disabled={isPast || isAdmin}
                className="group flex h-28 flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-zinc-950 transition hover:border-white/20 hover:bg-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="text-2xl">🔗</span>
                <span className="text-sm font-medium text-white/70 transition group-hover:text-white">
                  Join Team
                </span>
              </button>
            </div>
          </>
        )}

        {view === "create" && (
          <div>
            <button
              onClick={() => setView("choice")}
              className="mb-5 flex items-center gap-1 text-xs text-white/40 transition hover:text-white/70"
            >
              ← Back
            </button>
            <h2 className="mb-6 text-lg font-semibold text-white">
              Create a Team
            </h2>
            <CreateTeamForm
              hackathon={hackathon}
              onSuccess={onTeamCreated}
              onCancel={() => setView("choice")}
            />
          </div>
        )}

        {view === "join" && (
          <div>
            <button
              onClick={() => setView("choice")}
              className="mb-5 flex items-center gap-1 text-xs text-white/40 transition hover:text-white/70"
            >
              ← Back
            </button>
            <h2 className="mb-6 text-lg font-semibold text-white">
              Join a Team
            </h2>
            <JoinTeamForm onCancel={() => setView("choice")} />
          </div>
        )}
      </div>
    </div>
  );
}
