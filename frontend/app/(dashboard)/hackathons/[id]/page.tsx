"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Hackathon, MyTeam, AuthUser } from "@/lib/types";
import { fetchHackathon } from "@/lib/services/hackathons";
import { Skeleton } from "@/components/ui/skeleton";

type TeamState =
  | { status: "loading" }
  | { status: "none" }
  | { status: "has-team"; team: MyTeam }
  | { status: "error" };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function PlaceholderCard({
  title,
  reason,
}: {
  title: string;
  reason: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-zinc-950 px-5 py-4 opacity-50">
      <span className="text-sm text-white">{title}</span>
      <span className="text-xs text-white/30">{reason}</span>
    </div>
  );
}

export default function HackathonOverviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [hackathonLoading, setHackathonLoading] = useState(true);
  const [teamState, setTeamState] = useState<TeamState>({ status: "loading" });
  const [me, setMe] = useState<AuthUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [h, teamRes, meRes] = await Promise.all([
        fetchHackathon(id),
        fetch(`/api/participants/me/team?hackathon_uuid=${id}`),
        fetch("/api/auth/me"),
      ]);

      if (cancelled) return;

      if (!h) {
        router.replace("/home");
        return;
      }
      setHackathon(h);
      setHackathonLoading(false);

      let isUserAdmin = false;
      if (meRes.ok) {
        const user = (await meRes.json()) as AuthUser;
        setMe(user);
        const role = user.global_role?.name;
        if (role === "admin" || role === "superadmin") {
          isUserAdmin = true;
        }
      }

      if (teamRes.status === 404) {
        setTeamState({ status: "none" });
        return;
      }

      if (teamRes.ok) {
        const team = (await teamRes.json()) as MyTeam;
        setTeamState({ status: "has-team", team });
      } else {
        if (isUserAdmin) {
          setTeamState({ status: "none" });
        } else {
          setTeamState({ status: "error" });
        }
      }
    }

    load().catch(() => {
      if (!cancelled) setTeamState({ status: "error" });
    });

    return () => { cancelled = true; };
  }, [id, router]);

  if (hackathonLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-5 px-6 py-10">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!hackathon) return null;

  const isPast =
    hackathon.backend_status === "completed" ||
    hackathon.backend_status === "archived" ||
    hackathon.status === "ended" ||
    new Date(hackathon.ends_at).getTime() < Date.now();

  const isAdmin = me?.global_role?.name === "admin" || me?.global_role?.name === "superadmin";

  const teamHref = `/hackathons/${id}/team`;

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="border-b border-white/10 bg-zinc-950 px-6 py-3 flex items-center justify-between">
          <span className="text-xs text-white/50">Viewing as Administrator</span>
        </div>
      )}


      <div className="mx-auto max-w-4xl space-y-5 px-6 py-10">
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

        {/* Hackathon info */}
        <section className="rounded-2xl border border-white/[0.08] bg-zinc-950 p-6">
          <p className="text-sm text-white/50">{hackathon.tagline}</p>
          <p className="mt-3 text-sm leading-relaxed text-white/40">
            {hackathon.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/30">
            <span>{formatDate(hackathon.starts_at)} — {formatDate(hackathon.ends_at)}</span>
            <span>Teams of {hackathon.min_team_size}–{hackathon.max_team_size}</span>
          </div>
          {hackathon.tracks.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {hackathon.tracks.map((t) => (
                <span
                  key={t.track_uuid}
                  className="rounded-full border border-[#4285F4]/20 bg-[#4285F4]/10 px-2.5 py-0.5 text-xs text-[#8ab4f8]"
                >
                  {t.name}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Team status */}
        <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950">
          <div className="border-b border-white/[0.06] px-5 py-4">
            <h3 className="text-sm font-medium text-white">Team</h3>
          </div>

          {teamState.status === "loading" && (
            <div className="space-y-3 p-5">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-3/4" />
            </div>
          )}

          {teamState.status === "none" && (
            <div className="px-5 py-6">
              <p className="mb-4 text-sm text-white/40">
                {isAdmin
                  ? "Administrators are excluded from participating in teams."
                  : isPast
                  ? "Team actions are closed."
                  : "You are not part of a team for this hackathon yet."}
              </p>
              {!isAdmin && !isPast && (
                <div className="flex gap-3">
                  <Link
                    href={teamHref}
                    className="h-9 rounded-full bg-white px-5 text-sm font-medium text-black transition hover:bg-zinc-100 flex items-center"
                  >
                    Create Team
                  </Link>
                  <Link
                    href={teamHref}
                    className="h-9 rounded-full border border-white/10 px-5 text-sm text-white/70 transition hover:border-white/20 hover:text-white flex items-center"
                  >
                    Join Team
                  </Link>
                </div>
              )}
            </div>
          )}

          {teamState.status === "has-team" && (
            <div className="px-5 py-5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-white">
                    {teamState.team.team_name}
                  </p>
                  <p className="mt-0.5 text-xs text-white/30">
                    {teamState.team.members.length} member
                    {teamState.team.members.length !== 1 ? "s" : ""}
                    {" · "}
                    {hackathon.max_team_size - teamState.team.members.length} slot
                    {hackathon.max_team_size - teamState.team.members.length !== 1 ? "s" : ""} remaining
                  </p>
                </div>
                <Link
                  href={teamHref}
                  className="shrink-0 h-8 rounded-full border border-white/10 px-4 text-xs font-medium text-white/70 transition hover:border-white/20 hover:text-white flex items-center"
                >
                  Manage Team →
                </Link>
              </div>

              <ul className="space-y-2">
                {teamState.team.members.map((m) => (
                  <li key={m.uuid} className="flex items-center gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-xs font-medium text-white">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-white">{m.name}</p>
                      {m.username && (
                        <p className="truncate text-xs text-white/30">@{m.username}</p>
                      )}
                    </div>
                    {m.is_leader && (
                      <span className="ml-auto shrink-0 rounded-full border border-[#4285F4]/20 bg-[#4285F4]/10 px-2 py-0.5 text-xs text-[#8ab4f8]">
                        Leader
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {teamState.status === "error" && (
            <p className="px-5 py-4 text-sm text-white/30">
              Could not load team status. Please refresh.
            </p>
          )}
        </section>

        {/* Placeholder sections */}
        <section className="space-y-2.5">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-white/20">
            Resources &amp; Actions
          </p>
          <PlaceholderCard title="Room Allocation" reason="Coming soon" />
          <PlaceholderCard title="Food Coupon" reason="Coming soon" />
          <PlaceholderCard title="Mentor Request" reason="Backend integration pending" />
          <PlaceholderCard title="Volunteer Request" reason="Backend integration pending" />
        </section>

        <section className="space-y-2.5">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-white/20">
            Event
          </p>
          <PlaceholderCard title="Submission" reason="Opens during hackathon" />
          <PlaceholderCard title="Timeline" reason="Coming soon" />
          <PlaceholderCard title="Announcements" reason="Coming soon" />
        </section>
      </div>
    </div>
  );
}
