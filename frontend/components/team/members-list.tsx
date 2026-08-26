"use client";

import { useState } from "react";
import type { MyTeam, TeamMember } from "@/lib/types";
import { ConfirmDialog } from "@/components/ui/dialog";

type Props = {
  team: MyTeam;
  currentUserUuid: string;
  onRefresh: () => void;
  isPast?: boolean;
  isAdmin?: boolean;
};

type PendingAction =
  | { type: "leave" }
  | { type: "remove"; member: TeamMember }
  | { type: "transfer"; member: TeamMember };

export function MembersList({ team, currentUserUuid, onRefresh, isPast = false, isAdmin = false }: Props) {
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  async function executeAction() {
    if (!pending) return;
    setActionLoading(true);
    setError("");

    try {
      let res: Response;

      if (pending.type === "leave") {
        res = await fetch(`/api/participants/teams/${team.team_uuid}/leave`, {
          method: "POST",
        });
      } else if (pending.type === "remove") {
        res = await fetch(
          `/api/participants/teams/${team.team_uuid}/remove-member`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ member_uuid: pending.member.uuid }),
          },
        );
      } else {
        res = await fetch(
          `/api/participants/teams/${team.team_uuid}/transfer-leadership`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ member_uuid: pending.member.uuid }),
          },
        );
      }

      const data = (await res.json()) as { detail?: string };
      if (!res.ok) {
        setError(data.detail ?? "Action failed. Please try again.");
        return;
      }
      setPending(null);
      onRefresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  function dismissError() {
    setError("");
    setPending(null);
  }

  const canLeaderLeave = team.members.length === 1;

  const dialogConfig: Record<
    string,
    { title: string; description: string; destructive: boolean; confirmLabel: string }
  > = {
    leave: {
      title: "Leave team?",
      description:
        "You will be removed from this team. This cannot be undone.",
      destructive: true,
      confirmLabel: "Leave",
    },
    remove: {
      title: `Remove ${pending?.type === "remove" ? pending.member.name : ""}?`,
      description: "This member will be removed from the team immediately.",
      destructive: true,
      confirmLabel: "Remove",
    },
    transfer: {
      title: `Transfer leadership to ${pending?.type === "transfer" ? pending.member.name : ""}?`,
      description: "You will become a regular member of the team.",
      destructive: false,
      confirmLabel: "Transfer",
    },
  };

  const dialog = pending ? dialogConfig[pending.type] : null;

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
        <div className="border-b border-white/[0.06] px-5 py-4">
          <h3 className="text-sm font-medium text-white">
            Members ({team.members.length})
          </h3>
        </div>

        <ul role="list">
          {team.members.map((member, i) => {
            const isMe = member.uuid === currentUserUuid;
            const isLast = i === team.members.length - 1;

            return (
              <li
                key={member.uuid}
                className={`flex items-center justify-between gap-4 px-5 py-4 ${!isLast ? "border-b border-white/[0.04]" : ""}`}
              >
                {/* Avatar + name */}
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-xs font-medium text-white"
                    aria-hidden="true"
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white">
                      {member.name}
                      {isMe && (
                        <span className="ml-1.5 text-xs text-white/30">
                          (you)
                        </span>
                      )}
                    </p>
                    {member.username && (
                      <p className="truncate text-xs text-white/30">
                        @{member.username}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-2">
                  {member.is_leader && (
                    <span className="rounded-full border border-[#4285F4]/20 bg-[#4285F4]/10 px-2 py-0.5 text-xs font-medium text-[#8ab4f8]">
                      Leader
                    </span>
                  )}

                  {!isPast && !isAdmin && (
                    <>
                      {/* Current user is member (not leader): can leave */}
                      {isMe && !member.is_leader && (
                        <button
                          onClick={() => setPending({ type: "leave" })}
                          className="text-xs text-white/30 transition hover:text-[#f28b82]"
                        >
                          Leave
                        </button>
                      )}

                      {/* Current user is leader with no other members: can leave (dissolves team) */}
                      {isMe && member.is_leader && canLeaderLeave && (
                        <button
                          onClick={() => setPending({ type: "leave" })}
                          className="text-xs text-white/30 transition hover:text-[#f28b82]"
                        >
                          Leave
                        </button>
                      )}

                      {/* Leader actions on other members */}
                      {team.is_leader && !isMe && (
                        <>
                          <button
                            onClick={() =>
                              setPending({ type: "transfer", member })
                            }
                            className="text-xs text-white/30 transition hover:text-[#8ab4f8]"
                          >
                            Make Leader
                          </button>
                          <button
                            onClick={() => setPending({ type: "remove", member })}
                            className="text-xs text-white/30 transition hover:text-[#f28b82]"
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {error && (
        <div className="rounded-xl border border-[#f28b82]/25 bg-[#f28b82]/10 px-4 py-3 text-sm text-[#f28b82]">
          {error}
          <button
            onClick={dismissError}
            className="ml-3 text-xs underline opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {dialog && (
        <ConfirmDialog
          open
          title={dialog.title}
          description={dialog.description}
          destructive={dialog.destructive}
          confirmLabel={dialog.confirmLabel}
          loading={actionLoading}
          onConfirm={executeAction}
          onCancel={() => {
            setPending(null);
            setError("");
          }}
        />
      )}
    </>
  );
}
