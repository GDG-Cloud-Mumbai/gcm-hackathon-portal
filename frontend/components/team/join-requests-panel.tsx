"use client";

import { useCallback, useEffect, useState } from "react";
import type { JoinRequest } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  teamUuid: string;
};

export function JoinRequestsPanel({ teamUuid }: Props) {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/participants/teams/${teamUuid}/join-requests`,
      );
      const data = await res.json();
      setRequests(Array.isArray(data) ? (data as JoinRequest[]) : []);
    } catch {
      setError("Failed to load join requests.");
    } finally {
      setLoading(false);
    }
  }, [teamUuid]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  async function handleAction(
    requestId: string,
    action: "approve" | "reject",
  ) {
    setActionLoading(requestId);
    setError("");
    try {
      const res = await fetch(
        `/api/participants/join-requests/${requestId}/${action}`,
        { method: "POST" },
      );
      if (!res.ok) {
        const data = (await res.json()) as { detail?: string };
        setError(data.detail ?? "Action failed.");
        return;
      }
      await fetchRequests();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
      <div className="border-b border-white/[0.06] px-5 py-4">
        <h3 className="text-sm font-medium text-white">
          Join Requests
          {!loading && requests.length > 0 && (
            <span className="ml-2 rounded-full bg-[#FBBC04]/10 px-2 py-0.5 text-xs font-medium text-[#ffd54f]">
              {requests.length}
            </span>
          )}
        </h3>
      </div>

      {loading ? (
        <div className="space-y-3 p-5">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-3/4" />
        </div>
      ) : requests.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-sm text-white/30">No pending join requests.</p>
        </div>
      ) : (
        <ul role="list">
          {requests.map((req, i) => (
            <li
              key={req.request_id}
              className={`flex items-center justify-between gap-4 px-5 py-4 ${i !== requests.length - 1 ? "border-b border-white/[0.04]" : ""}`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-white">{req.user.name}</p>
                {req.user.username && (
                  <p className="text-xs text-white/30">@{req.user.username}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => handleAction(req.request_id, "reject")}
                  disabled={actionLoading === req.request_id}
                  className="h-8 rounded-full border border-white/10 px-3 text-xs text-white/50 transition hover:border-[#f28b82]/20 hover:text-[#f28b82] disabled:opacity-40"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleAction(req.request_id, "approve")}
                  disabled={actionLoading === req.request_id}
                  className="h-8 rounded-full bg-white px-3 text-xs font-medium text-black transition hover:bg-zinc-100 disabled:opacity-40"
                >
                  {actionLoading === req.request_id ? "…" : "Approve"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="px-5 pb-4 text-xs text-[#f28b82]">{error}</p>
      )}
    </div>
  );
}
