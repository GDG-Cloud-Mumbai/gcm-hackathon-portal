"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { CreateTrackPayload, Track, UpdateTrackPayload } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

type TrackListResponse = {
  tracks?: Track[];
};

type TrackFieldErrors = {
  name?: string;
  description?: string;
};

function getTrackFieldErrors(name: string, description: string): TrackFieldErrors {
  const errors: TrackFieldErrors = {};

  if (!name.trim()) {
    errors.name = "Track name is required.";
  }

  if (!description.trim()) {
    errors.description = "Track description is required.";
  }

  return errors;
}

function inputClass(error?: string) {
  return `w-full rounded-xl border bg-black/60 px-4 py-3 text-sm text-white placeholder-white/30 transition focus:outline-none ${
    error
      ? "border-red-500/60 focus:border-red-500"
      : "border-white/10 focus:border-[#4285F4]"
  }`;
}

const statusClasses: Record<Track["status"], string> = {
  active: "border-[#34A853]/20 bg-[#34A853]/10 text-[#81c784]",
  disabled: "border-[#FBBC04]/20 bg-[#FBBC04]/10 text-[#ffd54f]",
  archived: "border-red-500/20 bg-red-500/10 text-red-400",
};

async function getErrorMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { detail?: string; message?: string };
    return data.detail ?? data.message ?? fallback;
  } catch {
    return fallback;
  }
}

export default function AdminTracksPage() {
  const params = useParams<{ uuid: string }>();
  const uuid = params.uuid;
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editingTrackUuid, setEditingTrackUuid] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const newTrackErrors = getTrackFieldErrors(newName, newDescription);
  const editTrackErrors = getTrackFieldErrors(editName, editDescription);
  const isNewTrackValid = Object.keys(newTrackErrors).length === 0;
  const isEditTrackValid = Object.keys(editTrackErrors).length === 0;

  const loadTracks = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/hackathons/${uuid}/tracks`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Failed to load tracks."));
      }
      const data = (await response.json()) as TrackListResponse;
      setTracks(data.tracks ?? []);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Failed to load tracks.");
    } finally {
      setLoading(false);
    }
  }, [uuid]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTracks();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadTracks]);

  async function createTrack(event: React.FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    const description = newDescription.trim();
    if (creating || !isNewTrackValid) return;

    setCreating(true);
    setServerError(null);
    try {
      const payload: CreateTrackPayload = {
        name,
        description,
      };
      const response = await fetch(`/api/admin/hackathons/${uuid}/tracks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Failed to create track."));
      }
      const track = (await response.json()) as Track;
      setTracks((current) => [...current, track]);
      setNewName("");
      setNewDescription("");
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Failed to create track.");
    } finally {
      setCreating(false);
    }
  }

  function startEditing(track: Track) {
    setEditingTrackUuid(track.uuid);
    setEditName(track.name);
    setEditDescription(track.description ?? "");
    setServerError(null);
  }

  function cancelEditing() {
    setEditingTrackUuid(null);
    setEditName("");
    setEditDescription("");
  }

  async function saveTrack(trackUuid: string) {
    const name = editName.trim();
    const description = editDescription.trim();
    if (actionLoading || !isEditTrackValid) return;

    setActionLoading(`edit-${trackUuid}`);
    setServerError(null);
    try {
      const payload: UpdateTrackPayload = {
        name,
        description,
      };
      const response = await fetch(
        `/api/admin/hackathons/${uuid}/tracks/${trackUuid}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Failed to update track."));
      }
      const updatedTrack = (await response.json()) as Track;
      setTracks((current) =>
        current.map((track) => track.uuid === trackUuid ? updatedTrack : track),
      );
      cancelEditing();
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Failed to update track.");
    } finally {
      setActionLoading(null);
    }
  }

  async function changeTrackStatus(track: Track) {
    const action = track.status === "archived" ? "restore" : "archive";
    setActionLoading(`${action}-${track.uuid}`);
    setServerError(null);
    try {
      const response = await fetch(
        `/api/admin/hackathons/${uuid}/tracks/${track.uuid}/${action}`,
        { method: "POST" },
      );
      if (!response.ok) {
        throw new Error(await getErrorMessage(response, `Failed to ${action} track.`));
      }
      const updatedTrack = (await response.json()) as Track;
      setTracks((current) =>
        current.map((item) => item.uuid === track.uuid ? updatedTrack : item),
      );
    } catch (error) {
      setServerError(error instanceof Error ? error.message : `Failed to ${action} track.`);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-white/30">Hackathon configuration</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">Manage Tracks</h1>
          <p className="mt-1 text-sm text-white/60">Create and maintain the tracks participants can choose for their teams.</p>
        </div>
        <Link
          href="/admin"
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-center text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          Back to Admin
        </Link>
      </div>

      {serverError && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-medium text-red-400">
          {serverError}
        </div>
      )}

      <form onSubmit={createTrack} className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Create Track</h2>
          <p className="mt-1 text-sm text-white/40">Add a track before participants create teams.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">
              Name *
            </label>
            <input
              aria-label="Track name"
              className={inputClass(newTrackErrors.name)}
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Track name"
              maxLength={120}
              required
            />
            {newTrackErrors.name && (
              <p className="mt-1 text-xs font-medium text-red-400">{newTrackErrors.name}</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">
              Description *
            </label>
            <input
              aria-label="Track description"
              className={inputClass(newTrackErrors.description)}
              value={newDescription}
              onChange={(event) => setNewDescription(event.target.value)}
              placeholder="Track description"
              maxLength={500}
              required
            />
            {newTrackErrors.description && (
              <p className="mt-1 text-xs font-medium text-red-400">{newTrackErrors.description}</p>
            )}
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={creating || !isNewTrackValid}
            className="rounded-xl bg-[#4285F4] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-[#3367d6] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create Track"}
          </button>
        </div>
      </form>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-xs uppercase tracking-widest text-white/30">Tracks</h2>
          {!loading && (
            <span className="text-xs text-white/30">{tracks.length} total</span>
          )}
        </div>

        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        )}

        {!loading && tracks.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-12 text-center">
            <p className="text-sm text-white/40">No tracks have been created for this hackathon.</p>
          </div>
        )}

        {!loading && tracks.length > 0 && (
          <div className="space-y-3">
            {tracks.map((track) => {
              const isEditing = editingTrackUuid === track.uuid;
              const isBusy = actionLoading !== null;

              return (
                <article key={track.uuid} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">
                            Name *
                          </label>
                          <input
                            aria-label="Track name"
                            className={inputClass(editTrackErrors.name)}
                            value={editName}
                            onChange={(event) => setEditName(event.target.value)}
                            maxLength={120}
                          />
                          {editTrackErrors.name && (
                            <p className="mt-1 text-xs font-medium text-red-400">{editTrackErrors.name}</p>
                          )}
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">
                            Description *
                          </label>
                          <input
                            aria-label="Track description"
                            className={inputClass(editTrackErrors.description)}
                            value={editDescription}
                            onChange={(event) => setEditDescription(event.target.value)}
                            placeholder="Track description"
                            maxLength={500}
                          />
                          {editTrackErrors.description && (
                            <p className="mt-1 text-xs font-medium text-red-400">{editTrackErrors.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={cancelEditing}
                          disabled={isBusy}
                          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => saveTrack(track.uuid)}
                          disabled={isBusy || !isEditTrackValid}
                          className="rounded-xl bg-[#4285F4] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#3367d6] disabled:opacity-50"
                        >
                          {actionLoading === `edit-${track.uuid}` ? "Saving…" : "Save Changes"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h3 className="text-base font-semibold text-white">{track.name}</h3>
                          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${statusClasses[track.status]}`}>
                            {track.status}
                          </span>
                        </div>
                        {track.description && (
                          <p className="mt-2 text-sm text-white/50">{track.description}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEditing(track)}
                          disabled={isBusy}
                          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10 disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => changeTrackStatus(track)}
                          disabled={isBusy}
                          className={track.status === "archived"
                            ? "rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/20 disabled:opacity-50"
                            : "rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"}
                        >
                          {actionLoading === `${track.status === "archived" ? "restore" : "archive"}-${track.uuid}`
                            ? `${track.status === "archived" ? "Restoring" : "Archiving"}…`
                            : track.status === "archived" ? "Restore" : "Archive"}
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
