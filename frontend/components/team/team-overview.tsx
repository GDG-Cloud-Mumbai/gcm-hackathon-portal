import type { MyTeam } from "@/lib/types";

type Props = {
  team: MyTeam;
  isLeader: boolean;
};

export function TeamOverview({ team, isLeader }: Props) {
  const leader = team.members.find((m) => m.is_leader);

  const stats = [
    { label: "Team Code", value: team.team_code, mono: true },
    { label: "Members", value: String(team.members.length) },
    { label: "Led by", value: leader?.name ?? "—" },
    { label: "Your role", value: isLeader ? "Leader" : "Member" },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 font-mono text-xs uppercase tracking-widest text-white/30">
            Your Team
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {team.team_name}
          </h2>
        </div>
        {isLeader && (
          <span className="mt-1 shrink-0 rounded-full border border-[#4285F4]/20 bg-[#4285F4]/10 px-2.5 py-1 text-xs font-medium text-[#8ab4f8]">
            Leader
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-white/[0.06] bg-black/40 px-3 py-3"
          >
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/30">
              {s.label}
            </p>
            <p
              className={`mt-1 truncate text-sm font-semibold text-white ${s.mono ? "font-mono tracking-widest" : ""}`}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
