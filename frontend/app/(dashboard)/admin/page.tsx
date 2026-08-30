"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Track } from "@/lib/types";

interface HackathonItem {
  uuid: string;
  slug: string;
  name: string;
  status: string;
  registration_start: string;
  registration_end: string;
  event_start: string;
  event_end: string;
  is_public: boolean;
}

type TrackListResponse = {
  tracks?: Track[];
};

type PublishTrackState = "checking" | "ready" | "missing" | "unavailable";

const statusColors: Record<string, string> = {
  draft: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  published: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  registration_open: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  registration_closed: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  ongoing: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  judging: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  completed: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  archived: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function AdminPage() {
  const router = useRouter();
  const [hackathons, setHackathons] = useState<HackathonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [publishTrackState, setPublishTrackState] = useState<Record<string, PublishTrackState>>({});

  const fetchHackathons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/hackathons", { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Insufficient administrator permissions.");
        }
        const errData = await res.json();
        throw new Error(errData.detail || errData.message || "Failed to load hackathons");
      }
      const data = await res.json();
      const nextHackathons = (data.hackathons || []) as HackathonItem[];
      const draftHackathons = nextHackathons.filter((item) => item.status === "draft");

      setHackathons(nextHackathons);
      setPublishTrackState(Object.fromEntries(
        draftHackathons.map((item) => [item.uuid, "checking"]),
      ));

      const trackChecks = await Promise.all(draftHackathons.map(async (item) => {
        try {
          const trackResponse = await fetch(`/api/admin/hackathons/${item.uuid}/tracks`, {
            cache: "no-store",
          });
          if (!trackResponse.ok) {
            return [item.uuid, "unavailable"] as const;
          }

          const trackData = (await trackResponse.json()) as TrackListResponse;
          const hasActiveTrack = (trackData.tracks ?? []).some(
            (track) => track.status === "active",
          );
          return [item.uuid, hasActiveTrack ? "ready" : "missing"] as const;
        } catch {
          return [item.uuid, "unavailable"] as const;
        }
      }));

      setPublishTrackState(Object.fromEntries(trackChecks));
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchHackathons();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchHackathons]);

  async function handleAction(uuid: string, action: string) {
    if (action === "publish") {
      const trackState = publishTrackState[uuid];
      if (trackState !== "ready") {
        setError(
          trackState === "missing"
            ? "Add at least one active track before publishing this hackathon."
            : "Track availability could not be verified. Refresh and try again.",
        );
        return;
      }
    }

    setActionLoading(`${uuid}-${action}`);
    try {
      const res = await fetch(`/api/admin/hackathons/${uuid}/${action}`, {
        method: "POST",
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || errData.message || "Action failed");
      }
      await fetchHackathons();
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  }


  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-white/60">
            Manage hackathon lifecycles, configuration, and event operations.
          </p>
        </div>
        <Link
          href="/admin/create"
          className="inline-flex items-center justify-center rounded-xl bg-[#4285F4] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-[#3367d6]"
        >
          + Create Hackathon
        </Link>
      </div>

      {loading && (
        <div className="mt-12 text-center text-sm text-white/50 animate-pulse">
          Loading hackathons database…
        </div>
      )}

      {error && (
        <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-400">
          <p className="font-semibold">Error Loading Admin Data</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && hackathons.length === 0 && (
        <div className="mt-12 text-center rounded-2xl border border-white/10 bg-white/[0.02] p-12">
          <p className="text-lg font-medium text-white/80">No Hackathons Created Yet</p>
          <p className="mt-1 text-sm text-white/50">
            Create your first hackathon to manage its registration, timeline, and participant workflow.
          </p>
          <Link
            href="/admin/create"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
          >
            Create Hackathon
          </Link>
        </div>
      )}

      {!loading && hackathons.length > 0 && (
        <div className="mt-8 grid gap-6">
          {hackathons.map((item) => (
            <div
              key={item.uuid}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/20"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-white">{item.name}</h2>
                    <span
                      className={`rounded-full border px-3 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                        statusColors[item.status] || "bg-gray-500/10 text-gray-400"
                      }`}
                    >
                      {item.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-white/40">
                    Slug: {item.slug} | UUID: {item.uuid}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/hackathons/${item.uuid}/tracks`}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10"
                  >
                    Manage Tracks
                  </Link>
                  {item.status === "draft" && (
                    <button
                      onClick={() => handleAction(item.uuid, "publish")}
                      disabled={
                        actionLoading === `${item.uuid}-publish` ||
                        publishTrackState[item.uuid] !== "ready"
                      }
                      className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {publishTrackState[item.uuid] === "checking"
                        ? "Checking Tracks…"
                        : publishTrackState[item.uuid] === "missing"
                          ? "Add Track First"
                          : publishTrackState[item.uuid] === "unavailable"
                            ? "Track Check Failed"
                            : "Publish"}
                    </button>
                  )}


                  {item.status === "published" && (
                    <button
                      onClick={() => handleAction(item.uuid, "open-registration")}
                      disabled={actionLoading === `${item.uuid}-open-registration`}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
                    >
                      Open Registration
                    </button>
                  )}

                  {item.status === "registration_open" && (
                    <button
                      onClick={() => handleAction(item.uuid, "close-registration")}
                      disabled={actionLoading === `${item.uuid}-close-registration`}
                      className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-orange-500 disabled:opacity-50"
                    >
                      Close Registration
                    </button>
                  )}

                  {item.status === "registration_closed" && (
                    <button
                      onClick={() => handleAction(item.uuid, "start")}
                      disabled={actionLoading === `${item.uuid}-start`}
                      className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-purple-500 disabled:opacity-50"
                    >
                      Start Hackathon
                    </button>
                  )}

                  {item.status === "ongoing" && (
                    <button
                      onClick={() => handleAction(item.uuid, "start-judging")}
                      disabled={actionLoading === `${item.uuid}-start-judging`}
                      className="rounded-xl bg-pink-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-pink-500 disabled:opacity-50"
                    >
                      Start Judging
                    </button>
                  )}

                  {item.status === "judging" && (
                    <button
                      onClick={() => handleAction(item.uuid, "complete")}
                      disabled={actionLoading === `${item.uuid}-complete`}
                      className="rounded-xl bg-gray-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-gray-500 disabled:opacity-50"
                    >
                      Complete Event
                    </button>
                  )}

                  {item.status !== "archived" ? (
                    <button
                      onClick={() => handleAction(item.uuid, "archive")}
                      disabled={actionLoading === `${item.uuid}-archive`}
                      className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                    >
                      Archive
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction(item.uuid, "restore")}
                      disabled={actionLoading === `${item.uuid}-restore`}
                      className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/20 disabled:opacity-50"
                    >
                      Restore
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/5 pt-4 text-xs text-white/60">
                <div>
                  <span className="font-semibold text-white/80">Registration:</span>{" "}
                  {new Date(item.registration_start).toLocaleDateString()} —{" "}
                  {new Date(item.registration_end).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-semibold text-white/80">Event Timeline:</span>{" "}
                  {new Date(item.event_start).toLocaleDateString()} —{" "}
                  {new Date(item.event_end).toLocaleDateString()}
                </div>
              </div>
              {item.status === "draft" && publishTrackState[item.uuid] === "missing" && (
                <p className="mt-4 text-xs text-[#ffd54f]">
                  Add at least one active track before publishing this hackathon.
                </p>
              )}
              {item.status === "draft" && publishTrackState[item.uuid] === "unavailable" && (
                <p className="mt-4 text-xs text-red-400">
                  Track availability could not be verified. Publish remains unavailable until it can be checked.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
