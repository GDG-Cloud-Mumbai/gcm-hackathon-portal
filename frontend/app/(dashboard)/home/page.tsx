import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccessToken, decodeJwtPayload } from "@/lib/auth";
import { getParticipantHackathons } from "@/lib/services/hackathons";
import type { ParticipantHackathonSummary } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type JwtClaims = { email?: string; sub?: string };

function statusLabel(status: ParticipantHackathonSummary["status"]) {
  if (status === "registration_open") {
    return {
      text: "Registration Open",
      className: "bg-[#34A853]/10 text-[#81c784] border border-[#34A853]/20",
    };
  }
  if (status === "registration_closed") {
    return {
      text: "Registration Closed",
      className: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
    };
  }
  if (status === "ongoing") {
    return {
      text: "Event Live",
      className: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
    };
  }
  if (status === "judging") {
    return {
      text: "Judging Phase",
      className: "bg-pink-500/10 text-pink-400 border border-pink-500/20",
    };
  }
  if (status === "completed" || status === "archived") {
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

export default async function HomePage() {
  const token = await getAccessToken();
  if (!token) redirect("/auth");

  const claims = decodeJwtPayload<JwtClaims>(token);
  const email = claims?.email ?? "";
  const displayName = email.split("@")[0];

  const { hackathons, error } = await getParticipantHackathons(token);

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

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-5 text-sm text-red-400">
          {error}
        </div>
      )}

      {!error && hackathons.length > 0 && (
        <HackathonSection title="Available Hackathons" hackathons={hackathons} />
      )}
      {!error && hackathons.length === 0 && (
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
  hackathons: ParticipantHackathonSummary[];
}) {
  return (
    <section>
      <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-white/30">
        {title}
      </h2>
      <div className="space-y-3">
        {hackathons.map((h) => (
          <HackathonCard key={h.uuid} hackathon={h} />
        ))}
      </div>
    </section>
  );
}

function HackathonCard({ hackathon: h }: { hackathon: ParticipantHackathonSummary }) {
  const badge = statusLabel(h.status);

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
          <p className="mt-1 text-sm text-white/50">{h.description ?? "No description provided."}</p>
        </div>

        <Link
          href={`/hackathons/${h.uuid}`}
          className="shrink-0 self-center rounded-full border border-white/10 px-4 py-2 text-xs font-medium text-white/70 transition hover:border-white/30 hover:text-white"
        >
          Enter →
        </Link>
      </div>

      {h.status === "published" && (
        <p className="mt-3 text-xs text-white/25">Registration opens soon</p>
      )}
      {h.status === "registration_closed" && (
        <p className="mt-3 text-xs text-orange-400/60">
          Registration is now closed for this event
        </p>
      )}
    </div>
  );
}
