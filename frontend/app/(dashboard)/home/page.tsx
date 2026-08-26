import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccessToken, decodeJwtPayload } from "@/lib/auth";
import { getHackathons } from "@/lib/services/hackathons";
import type { Hackathon } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type JwtClaims = { email?: string; sub?: string };

function statusLabel(h: Hackathon) {
  const bStatus = h.backend_status ?? "";

  if (bStatus === "registration_open" || h.registration_open) {
    return {
      text: "Registration Open",
      className: "bg-[#34A853]/10 text-[#81c784] border border-[#34A853]/20",
    };
  }
  if (bStatus === "registration_closed") {
    return {
      text: "Registration Closed",
      className: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
    };
  }
  if (bStatus === "ongoing") {
    return {
      text: "Event Live",
      className: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
    };
  }
  if (bStatus === "judging") {
    return {
      text: "Judging Phase",
      className: "bg-pink-500/10 text-pink-400 border border-pink-500/20",
    };
  }
  if (bStatus === "completed" || h.status === "ended") {
    return {
      text: "Ended",
      className: "bg-white/5 text-white/30 border border-white/10",
    };
  }
  return {
    text: "Upcoming",
    className: "bg-[#FBBC04]/10 text-[#ffd54f] border border-[#FBBC04]/20",
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function HomePage() {
  const token = await getAccessToken();
  if (!token) redirect("/auth");

  const claims = decodeJwtPayload<JwtClaims>(token);
  const email = claims?.email ?? "";
  const displayName = email.split("@")[0];

  const hackathons = await getHackathons();

  const active = hackathons.filter(
    (h) =>
      h.registration_open ||
      h.backend_status === "registration_open" ||
      h.backend_status === "ongoing" ||
      h.backend_status === "judging"
  );

  const upcoming = hackathons.filter(
    (h) =>
      !active.includes(h) &&
      (h.status === "upcoming" ||
        h.backend_status === "published" ||
        h.backend_status === "registration_closed")
  );

  const ended = hackathons.filter(
    (h) => !active.includes(h) && !upcoming.includes(h)
  );

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-6 py-10">
      {/* Welcome */}
      <section>
        <p className="mb-1 font-mono text-xs uppercase tracking-widest text-white/30">
          Dashboard
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Welcome back, {displayName}.
        </h1>
        <p className="mt-1 text-sm text-white/40">{email}</p>
      </section>

      {/* Hackathon listing */}
      {active.length > 0 && (
        <HackathonSection title="Live & Active Hackathons" hackathons={active} />
      )}
      {upcoming.length > 0 && (
        <HackathonSection title="Upcoming Hackathons" hackathons={upcoming} />
      )}
      {ended.length > 0 && (
        <HackathonSection title="Past Hackathons" hackathons={ended} />
      )}
      {hackathons.length === 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-zinc-950 px-6 py-12 text-center">
          <p className="text-sm text-white/30">No hackathons available right now.</p>
        </div>
      )}
    </div>
  );
}

function HackathonSection({
  title,
  hackathons,
}: {
  title: string;
  hackathons: Hackathon[];
}) {
  return (
    <section>
      <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-white/30">
        {title}
      </h2>
      <div className="space-y-3">
        {hackathons.map((h) => (
          <HackathonCard key={h.hackathon_uuid} hackathon={h} />
        ))}
      </div>
    </section>
  );
}

function HackathonCard({ hackathon: h }: { hackathon: Hackathon }) {
  const badge = statusLabel(h);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950 p-5 transition hover:border-white/20">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h3 className="truncate text-base font-semibold text-white">
              {h.name}
            </h3>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
            >
              {badge.text}
            </span>
          </div>
          <p className="mt-1 text-sm text-white/50">{h.tagline}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/30">
            <span>
              {formatDate(h.starts_at)} — {formatDate(h.ends_at)}
            </span>
            <span>
              Teams of {h.min_team_size}–{h.max_team_size}
            </span>
            {h.tracks.length > 0 && (
              <span>
                {h.tracks.length} track{h.tracks.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        <Link
          href={`/hackathons/${h.hackathon_uuid}`}
          className="shrink-0 self-center rounded-full border border-white/10 px-4 py-2 text-xs font-medium text-white/70 transition hover:border-white/30 hover:text-white"
        >
          Enter →
        </Link>
      </div>

      {!h.registration_open && h.backend_status === "published" && (
        <p className="mt-3 text-xs text-white/25">Registration opens soon</p>
      )}
      {!h.registration_open && h.backend_status === "registration_closed" && (
        <p className="mt-3 text-xs text-orange-400/60">
          Registration is now closed for this event
        </p>
      )}
    </div>
  );
}
