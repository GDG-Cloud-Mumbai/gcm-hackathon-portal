"use client";

import { useCallback, useEffect, useState } from "react";
import type { Invitation } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  onAccepted: () => void;
  isPast?: boolean;
  isAdmin?: boolean;
};

export function InvitationsPanel({ onAccepted, isPast = false, isAdmin = false }: Props) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchInvitations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/participants/invitations");
      const data = await res.json();
      setInvitations(Array.isArray(data) ? (data as Invitation[]) : []);
    } catch {
      setError("Failed to load invitations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  async function handleAction(
    invitationId: string,
    action: "accept" | "decline",
  ) {
    setActionLoading(invitationId);
    setError("");
    try {
      const res = await fetch(
        `/api/participants/invitations/${invitationId}/${action}`,
        { method: "POST" },
      );
      if (!res.ok) {
        const data = (await res.json()) as { detail?: string };
        setError(data.detail ?? "Action failed.");
        return;
      }
      if (action === "accept") {
        onAccepted();
      } else {
        await fetchInvitations();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (invitations.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#FBBC04]/20 bg-[#FBBC04]/[0.04]">
      <div className="border-b border-[#FBBC04]/10 px-5 py-4">
        <h3 className="text-sm font-medium text-[#ffd54f]">
          Team Invitations ({invitations.length})
        </h3>
      </div>

      <ul role="list">
        {invitations.map((inv, i) => (
          <li
            key={inv.invitation_id}
            className={`flex items-center justify-between gap-4 px-5 py-4 ${i !== invitations.length - 1 ? "border-b border-white/[0.04]" : ""}`}
          >
            <div>
              <p className="text-sm font-medium text-white">{inv.team_name}</p>
              <p className="text-xs text-white/30">Team invitation</p>
            </div>
            {!isPast && !isAdmin && (
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => handleAction(inv.invitation_id, "decline")}
                  disabled={actionLoading === inv.invitation_id}
                  className="h-8 rounded-full border border-white/10 px-3 text-xs text-white/50 transition hover:text-[#f28b82] disabled:opacity-40"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleAction(inv.invitation_id, "accept")}
                  disabled={actionLoading === inv.invitation_id}
                  className="h-8 rounded-full bg-white px-3 text-xs font-medium text-black transition hover:bg-zinc-100 disabled:opacity-40"
                >
                  {actionLoading === inv.invitation_id ? "…" : "Accept"}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {error && (
        <p className="px-5 pb-4 text-xs text-[#f28b82]">{error}</p>
      )}
    </div>
  );
}
