import { notFound } from "next/navigation";
import { getAccessToken } from "@/lib/auth";
import { getParticipantHackathon } from "@/lib/services/hackathons";
import { CountdownTimer } from "@/components/hackathon/countdown-timer";
import { HackathonNavLink } from "@/components/hackathon/hackathon-nav-link";

type Props = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

const NAV_ITEMS = [
  { label: "Overview", suffix: "" },
  { label: "Team", suffix: "/team" },
] as const;

export default async function HackathonLayout({ children, params }: Props) {
  const { id } = await params;
  const token = await getAccessToken();
  const hackathon = token ? await getParticipantHackathon(id, token) : null;
  if (!hackathon) notFound();

  const base = `/hackathons/${id}`;

  return (
    <div>
      <div className="border-b border-white/[0.06] px-6 py-4">
        <div className="mx-auto max-w-4xl">
          <p className="mb-0.5 font-mono text-xs uppercase tracking-widest text-white/25">
            Hackathon
          </p>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-white">{hackathon.name}</h2>
            {hackathon.status === "active" && (
              <CountdownTimer endsAt={hackathon.ends_at} />
            )}
          </div>

          <nav className="mt-3 flex gap-0.5" aria-label="Hackathon navigation">
            {NAV_ITEMS.map(({ label, suffix }) => (
              <HackathonNavLink
                key={label}
                href={`${base}${suffix}`}
                label={label}
              />
            ))}
          </nav>
        </div>
      </div>

      {children}
    </div>
  );
}
