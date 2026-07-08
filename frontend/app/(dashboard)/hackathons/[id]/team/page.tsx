"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { AuthUser, Hackathon, MyTeam, TeamResponse } from "@/lib/types";
import { getHackathon } from "@/lib/services/hackathons";
import { NoTeamView } from "@/components/team/no-team-view";
import { TeamOverview } from "@/components/team/team-overview";
import { MembersList } from "@/components/team/members-list";
import { JoinRequestsPanel } from "@/components/team/join-requests-panel";
import { InvitationsPanel } from "@/components/team/invitations-panel";
import { InviteSearch } from "@/components/team/invite-search";
import { Skeleton } from "@/components/ui/skeleton";

type PageState = "loading" | "no-team" | "has-team";

export default function HackathonTeamPage() {
  const params = useParams<{ id: string }>();
  const hackathonId = params.id;

  const [state, setState] = useState<PageState>("loading");
  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [team, setTeam] = useState<MyTeam | null>(null);
  const [me, setMe] = useState<AuthUser | null>(null);

  const loadData = useCallback(async () => {
    setState("loading");
    try {
      const [h, teamRes, meRes] = await Promise.all([
        getHackathon(hackathonId),
        fetch(`/api/participants/me/team?hackathon_uuid=${hackathonId}`),
        fetch("/api/auth/me"),
      ]);

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
    } catch {
      setState("no-team");
    }
  }, [hackathonId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleTeamCreated(_team: TeamResponse) {
    loadData();
  }

  if (state === "loading") {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-6 py-10">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-52 w-full" />
      </div>
    );
  }

  if (state === "no-team") {
    return (
      <div className="mx-auto max-w-3xl px-6">
        <div className="mt-4">
          <InvitationsPanel onAccepted={loadData} />
        </div>
        {hackathon && (
          <NoTeamView
            hackathon={hackathon}
            onTeamCreated={handleTeamCreated}
          />
        )}
      </div>
    );
  }

  if (!team) return null;

  const currentUserUuid = me?.uuid ?? "";

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-6 py-10">
      <TeamOverview team={team} isLeader={team.is_leader} />

      <InvitationsPanel onAccepted={loadData} />

      <MembersList
        team={team}
        currentUserUuid={currentUserUuid}
        onRefresh={loadData}
      />

      {team.is_leader && (
        <>
          <InviteSearch teamUuid={team.team_uuid} currentUserUuid={currentUserUuid} />
          <JoinRequestsPanel teamUuid={team.team_uuid} />
        </>
      )}
    </div>
  );
}
