"use client";

import { useEffect, useRef, useState } from "react";
import type { ParticipantSearchResult } from "@/lib/types";

type Props = {
  teamUuid: string;
  currentUserUuid?: string;
};

type SearchState =
  | { status: "idle" }
  | { status: "searching" }
  | { status: "results"; results: ParticipantSearchResult[] }
  | { status: "no-results" }
  | { status: "error"; message: string };

type InviteState =
  | { status: "idle" }
  | { status: "inviting" }
  | { status: "sent" }
  | { status: "error"; message: string };

const INPUT =
  "h-11 w-full rounded-xl border border-white/10 bg-black px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#8ab4f8] focus:ring-4 focus:ring-[#8ab4f8]/10";

export function InviteSearch({ teamUuid, currentUserUuid }: Props) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState>({ status: "idle" });
  const [inviteStates, setInviteStates] = useState<Record<string, InviteState>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setSearch({ status: "idle" });
      return;
    }

    setSearch({ status: "searching" });
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/participants/users/search?email=${encodeURIComponent(query)}`,
        );
        if (!res.ok) {
          const data = (await res.json()) as { detail?: string };
          setSearch({ status: "error", message: data.detail ?? "Search failed." });
          return;
        }
        const results = (await res.json()) as ParticipantSearchResult[];
        setSearch(
          results.length > 0
            ? { status: "results", results }
            : { status: "no-results" },
        );
      } catch {
        setSearch({ status: "error", message: "Network error. Please try again." });
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function setInvite(uuid: string, s: InviteState) {
    setInviteStates((prev) => ({ ...prev, [uuid]: s }));
  }

  async function handleInvite(p: ParticipantSearchResult) {
    setInvite(p.uuid, { status: "inviting" });
    try {
      const res = await fetch(`/api/participants/teams/${teamUuid}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_uuid: p.uuid }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { detail?: string };
        const message = data.detail ?? "Invitation could not be sent.";
        setInvite(p.uuid, { status: "error", message });
        setTimeout(() => setInvite(p.uuid, { status: "idle" }), 6000);
        return;
      }
      setInvite(p.uuid, { status: "sent" });
    } catch {
      setInvite(p.uuid, { status: "error", message: "Network error. Please try again." });
      setTimeout(() => setInvite(p.uuid, { status: "idle" }), 6000);
    }
  }

  const visibleResults =
    search.status === "results"
      ? search.results.filter((p) => p.uuid !== currentUserUuid)
      : [];

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
      <div className="border-b border-white/[0.06] px-5 py-4">
        <h3 className="text-sm font-medium text-white">Invite Member</h3>
      </div>

      <div className="space-y-4 p-5">
        <div className="relative">
          <input
            className={INPUT}
            type="email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by email…"
            autoComplete="off"
          />
          {search.status === "searching" && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <span className="block h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
            </div>
          )}
        </div>

        {search.status === "idle" && (
          <p className="text-xs text-white/25">Type at least 2 characters to search.</p>
        )}

        {search.status === "no-results" && (
          <p className="text-sm text-white/30">No participants found for that email.</p>
        )}

        {search.status === "results" && visibleResults.length === 0 && (
          <p className="text-sm text-white/30">No other matching participants found.</p>
        )}

        {search.status === "error" && (
          <p className="text-sm text-[#f28b82]">{search.message}</p>
        )}

        {search.status === "results" && visibleResults.length > 0 && (
          <ul className="space-y-2">
            {visibleResults.map((p) => {
              const s = inviteStates[p.uuid] ?? { status: "idle" };
              return (
                <li
                  key={p.uuid}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02]"
                >
                  <div className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-white">{p.name}</p>
                      <p className="truncate text-xs text-white/30">{p.email}</p>
                    </div>
                    <button
                      onClick={() => handleInvite(p)}
                      disabled={s.status !== "idle"}
                      className={`h-8 shrink-0 rounded-full px-3 text-xs font-medium transition disabled:cursor-not-allowed ${
                        s.status === "sent"
                          ? "border border-[#34A853]/20 bg-[#34A853]/10 text-[#81c784]"
                          : s.status === "error"
                          ? "border border-[#f28b82]/20 bg-[#f28b82]/10 text-[#f28b82]"
                          : "bg-white text-black hover:bg-zinc-100 disabled:opacity-50"
                      }`}
                    >
                      {s.status === "inviting"
                        ? "…"
                        : s.status === "sent"
                        ? "Invited"
                        : s.status === "error"
                        ? "Failed"
                        : "Invite"}
                    </button>
                  </div>
                  {s.status === "error" && (
                    <p className="px-4 pb-3 text-xs text-[#f28b82]">{s.message}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
