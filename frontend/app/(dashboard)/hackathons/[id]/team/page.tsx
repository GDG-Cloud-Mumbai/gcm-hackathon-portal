"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { AuthUser, Hackathon, MyTeam } from "@/lib/types";
import { fetchParticipantHackathon } from "@/lib/services/hackathons";
import { NoTeamView } from "@/components/team/no-team-view";
import { TeamOverview } from "@/components/team/team-overview";
import { MembersList } from "@/components/team/members-list";
import { JoinRequestsPanel } from "@/components/team/join-requests-panel";
import { InvitationsPanel } from "@/components/team/invitations-panel";
import { InviteSearch } from "@/components/team/invite-search";
import { Skeleton } from "@/components/ui/skeleton";

type PageState = "loading" | "no-team" | "has-team" | "error";

export default function HackathonTeamPage() {
  const params = useParams<{ id: string }>();
  const hackathonId = params.id;

  const [state, setState] = useState<PageState>("loading");
  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [team, setTeam] = useState<MyTeam | null>(null);
  const [me, setMe] = useState<AuthUser | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [h, teamRes, meRes] = await Promise.all([
        fetchParticipantHackathon(hackathonId),
        fetch(`/api/participants/me/team?hackathon_uuid=${hackathonId}`),
        fetch("/api/auth/me"),
      ]);

      if (!h) {
        setLoadError("This hackathon is no longer available.");
        setState("error");
        return;
      }

      setHackathon(h);

      if (meRes.ok) {
        setMe((await meRes.json()) as AuthUser);
      }

      if (teamRes.status === 404) {
        setState("no-team");
        return;
      }

      if (teamRes.ok) {
        const t = (await teamRes.json()) as MyTeam;
        setTeam(t);
        setState("has-team");
      } else {
        setState("no-team");
      }
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to load hackathon tracks.",
      );
      setState("error");
    }
  }, [hackathonId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  function handleTeamCreated() {
    loadData();
  }

  const isPast =
    hackathon?.backend_status === "completed" ||
    hackathon?.backend_status === "archived" ||
    hackathon?.status === "ended";

  const isAdmin = me?.global_role?.name === "admin" || me?.global_role?.name === "superadmin";

  if (state === "loading") {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-6 py-10">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-52 w-full" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-6 py-10">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-400">
          {loadError ?? "Failed to load this hackathon."}
        </div>
        <button
          onClick={loadData}
          className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  if (state === "no-team") {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-4">
        {isPast && (
          <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-5 py-4 text-sm text-yellow-400">
            ⚠️ This hackathon has ended — team actions are closed.
          </div>
        )}

        {isAdmin && (
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-5 py-4 text-sm text-blue-400">
            ℹ️ Administrators cannot join or create teams.
          </div>
        )}

        <div className="mt-4">
          <InvitationsPanel onAccepted={loadData} isPast={isPast} isAdmin={isAdmin} />
        </div>
        {hackathon && (
          <NoTeamView
            hackathon={hackathon}
            onTeamCreated={handleTeamCreated}
            isPast={isPast}
            isAdmin={isAdmin}
          />
        )}
      </div>
    );
  }

  if (!team) return null;

  const currentUserUuid = me?.uuid ?? "";

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-6 py-10">
      {isPast && (
        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-5 py-4 text-sm text-yellow-400">
          ⚠️ This hackathon has ended — team actions are closed.
        </div>
      )}

      {isAdmin && (
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-5 py-4 text-sm text-blue-400">
          ℹ️ Administrators cannot join or create teams.
        </div>
      )}

      <TeamOverview team={team} isLeader={team.is_leader} />

      <InvitationsPanel onAccepted={loadData} isPast={isPast} isAdmin={isAdmin} />

      <MembersList
        team={team}
        currentUserUuid={currentUserUuid}
        onRefresh={loadData}
        isPast={isPast}
        isAdmin={isAdmin}
      />

      {team.is_leader && (
        <>
          <InviteSearch teamUuid={team.team_uuid} currentUserUuid={currentUserUuid} isPast={isPast} isAdmin={isAdmin} />
          <JoinRequestsPanel teamUuid={team.team_uuid} isPast={isPast} isAdmin={isAdmin} />
        </>
      )}
    </div>
  );
}
