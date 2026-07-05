"use client";

import { useState } from "react";
import { CreateTeamForm } from "./create-team-form";
import { JoinTeamForm } from "./join-team-form";
import type { TeamResponse } from "@/lib/types";

type View = "choice" | "create" | "join";

type Props = {
  onTeamCreated: (team: TeamResponse) => void;
  onJoinRequested: () => void;
};

export function NoTeamView({ onTeamCreated, onJoinRequested }: Props) {
  const [view, setView] = useState<View>("choice");

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
                Create a new team or join an existing one to get started.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setView("create")}
                className="group flex h-28 flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-zinc-950 transition hover:border-white/20 hover:bg-zinc-900"
              >
                <span className="text-2xl">✨</span>
                <span className="text-sm font-medium text-white/70 transition group-hover:text-white">
                  Create Team
                </span>
              </button>
              <button
                onClick={() => setView("join")}
                className="group flex h-28 flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-zinc-950 transition hover:border-white/20 hover:bg-zinc-900"
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
            <JoinTeamForm
              onSuccess={onJoinRequested}
              onCancel={() => setView("choice")}
            />
          </div>
        )}
      </div>
    </div>
  );
}
