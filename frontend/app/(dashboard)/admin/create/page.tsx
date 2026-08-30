"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CustomDateTimePicker } from "@/components/ui/custom-datetime-picker";
import { TimezoneSelect } from "@/components/ui/timezone-select";
import { LiveTimelineGantt } from "@/components/admin/live-timeline-gantt";
import type { CreateTrackPayload, Track } from "@/lib/types";

type StagedTrack = {
  clientId: string;
  name: string;
  description: string;
};

type TrackFieldErrors = {
  name?: string;
  description?: string;
};

type CreatedHackathon = {
  uuid: string;
  name: string;
};

type TrackListResponse = {
  tracks?: Track[];
};

function makeStagedTrack(name = "", description = ""): StagedTrack {
  return {
    clientId: crypto.randomUUID(),
    name,
    description,
  };
}

async function getErrorMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { detail?: string; message?: string };
    return data.detail ?? data.message ?? fallback;
  } catch {
    return fallback;
  }
}

export default function CreateHackathonPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [timezone, setTimezone] = useState("");

  // Default dates helper (tomorrow -> +7d, +8d -> +10d)
  const now = new Date();
  const regStartDefault = new Date(now.getTime() + 1 * 86400000).toISOString().slice(0, 16);
  const regEndDefault = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 16);
  const eventStartDefault = new Date(now.getTime() + 8 * 86400000).toISOString().slice(0, 16);
  const eventEndDefault = new Date(now.getTime() + 10 * 86400000).toISOString().slice(0, 16);
  const subStartDefault = new Date(now.getTime() + 8 * 86400000).toISOString().slice(0, 16);
  const subDeadlineDefault = new Date(now.getTime() + 10 * 86400000).toISOString().slice(0, 16);

  const [regStart, setRegStart] = useState(regStartDefault);
  const [regEnd, setRegEnd] = useState(regEndDefault);
  const [eventStart, setEventStart] = useState(eventStartDefault);
  const [eventEnd, setEventEnd] = useState(eventEndDefault);
  const [subStart, setSubStart] = useState(subStartDefault);
  const [subDeadline, setSubDeadline] = useState(subDeadlineDefault);

  const [minTeamSize, setMinTeamSize] = useState("1");
  const [maxTeamSize, setMaxTeamSize] = useState("4");
  const [allowIndividual, setAllowIndividual] = useState(true);
  const [isPublic, setIsPublic] = useState(true);
  const [stagedTracks, setStagedTracks] = useState<StagedTrack[]>([
    { clientId: "default-general", name: "General", description: "Open Innovation" },
  ]);
  const [createdHackathon, setCreatedHackathon] = useState<CreatedHackathon | null>(null);
  const [createdTrackIds, setCreatedTrackIds] = useState<string[]>([]);
  const [trackSetupNotice, setTrackSetupNotice] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Immediate inline validation keeps the submit state safe before any request begins.
  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = "Hackathon name is required.";
    }

    if (!timezone.trim()) {
      errors.timezone = "Event timezone is required.";
    }

    const getTimestamp = (value: string, field: string) => {
      if (!value.trim()) {
        errors[field] = "Date and time are required.";
        return null;
      }

      const timestamp = new Date(value).getTime();
      if (!Number.isFinite(timestamp)) {
        errors[field] = "Enter a valid date and time.";
        return null;
      }

      return timestamp;
    };

    const tRegStart = getTimestamp(regStart, "regStart");
    const tRegEnd = getTimestamp(regEnd, "regEnd");
    const tEventStart = getTimestamp(eventStart, "eventStart");
    const tEventEnd = getTimestamp(eventEnd, "eventEnd");
    const tSubStart = getTimestamp(subStart, "subStart");
    const tSubDeadline = getTimestamp(subDeadline, "subDeadline");

    if (tRegStart !== null && tRegEnd !== null && tRegStart >= tRegEnd) {
      errors.regEnd = "Registration start must be before registration end.";
    }

    if (tRegEnd !== null && tEventStart !== null && tRegEnd > tEventStart) {
      errors.eventStart = "Registration must end before or at event start.";
    }

    if (tEventStart !== null && tEventEnd !== null && tEventStart >= tEventEnd) {
      errors.eventEnd = "Event start must be before event end.";
    }

    if (tSubStart !== null && tSubDeadline !== null && tSubStart > tSubDeadline) {
      errors.subDeadline = "Submission start must be before submission deadline.";
    }

    if (tSubDeadline !== null && tEventEnd !== null && tSubDeadline > tEventEnd) {
      errors.subDeadline = "Submission deadline cannot be after event end.";
    }

    const minimumSize = Number(minTeamSize);
    const maximumSize = Number(maxTeamSize);

    if (!Number.isInteger(minimumSize) || minimumSize < 1) {
      errors.minTeamSize = "Minimum team size must be a positive whole number.";
    }

    if (!Number.isInteger(maximumSize) || maximumSize < 1) {
      errors.maxTeamSize = "Maximum team size must be a positive whole number.";
    } else if (Number.isInteger(minimumSize) && minimumSize > maximumSize) {
      errors.maxTeamSize = "Minimum team size cannot exceed maximum team size.";
    }

    return errors;
  }, [
    name,
    regStart,
    regEnd,
    eventStart,
    eventEnd,
    subStart,
    subDeadline,
    minTeamSize,
    maxTeamSize,
    timezone,
  ]);

  const trackValidation = useMemo(() => {
    const errorsById: Record<string, TrackFieldErrors> = {};
    const normalizedTrackIds = new Map<string, string[]>();

    if (stagedTracks.length === 0) {
      return {
        isValid: false,
        errorsById,
        message: "At least one track is required.",
      };
    }

    for (const track of stagedTracks) {
      const normalizedName = track.name.trim().toLocaleLowerCase();
      if (!normalizedName) {
        errorsById[track.clientId] = {
          ...errorsById[track.clientId],
          name: "Track name is required.",
        };
      } else {
        const matches = normalizedTrackIds.get(normalizedName) ?? [];
        matches.push(track.clientId);
        normalizedTrackIds.set(normalizedName, matches);
      }

      if (!track.description.trim()) {
        errorsById[track.clientId] = {
          ...errorsById[track.clientId],
          description: "Track description is required.",
        };
      }
    }

    for (const trackIds of normalizedTrackIds.values()) {
      if (trackIds.length > 1) {
        for (const trackId of trackIds) {
          errorsById[trackId] = {
            ...errorsById[trackId],
            name: "Track names must be unique.",
          };
        }
      }
    }

    return {
      isValid: Object.keys(errorsById).length === 0,
      errorsById,
      message: Object.keys(errorsById).length > 0
        ? "Track names and descriptions must be complete, and track names unique."
        : null,
    };
  }, [stagedTracks]);

  const isHackathonFormValid = Object.keys(validationErrors).length === 0;
  const isValid = isHackathonFormValid && trackValidation.isValid;

  function updateStagedTrack(
    clientId: string,
    field: "name" | "description",
    value: string,
  ) {
    setStagedTracks((tracks) => tracks.map((track) =>
      track.clientId === clientId ? { ...track, [field]: value } : track,
    ));
  }

  function addTrack() {
    setStagedTracks((tracks) => [...tracks, makeStagedTrack()]);
  }

  function removeTrack(clientId: string) {
    setStagedTracks((tracks) => tracks.filter((track) => track.clientId !== clientId));
  }

  async function countActiveTracks(hackathonUuid: string) {
    const response = await fetch(`/api/admin/hackathons/${hackathonUuid}/tracks`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(await getErrorMessage(response, "Failed to verify hackathon tracks."));
    }

    const data = (await response.json()) as TrackListResponse;
    return (data.tracks ?? []).filter((track) => track.status === "active").length;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || !isValid) return;

    setLoading(true);
    setServerError(null);
    setTrackSetupNotice(null);

    try {
      let hackathon = createdHackathon;

      if (!hackathon) {
        const payload = {
          name: name.trim(),
          description: description.trim() || undefined,
          timezone: timezone.trim(),
          registration_start: new Date(regStart).toISOString(),
          registration_end: new Date(regEnd).toISOString(),
          event_start: new Date(eventStart).toISOString(),
          event_end: new Date(eventEnd).toISOString(),
          submission_start: new Date(subStart).toISOString(),
          submission_deadline: new Date(subDeadline).toISOString(),
          min_team_size: Number(minTeamSize),
          max_team_size: Number(maxTeamSize),
          allow_individual_registration: allowIndividual,
          is_public: isPublic,
        };

        const response = await fetch("/api/admin/hackathons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(await getErrorMessage(response, "Failed to create hackathon."));
        }

        const data = (await response.json()) as { uuid?: string; name?: string };
        if (!data.uuid) {
          throw new Error("Hackathon creation did not return an identifier.");
        }

        hackathon = { uuid: data.uuid, name: data.name ?? name.trim() };
        setCreatedHackathon(hackathon);
      }

      const pendingTracks = stagedTracks.filter(
        (track) => !createdTrackIds.includes(track.clientId),
      );

      const trackResults = await Promise.all(pendingTracks.map(async (track) => {
        const payload: CreateTrackPayload = {
          name: track.name.trim(),
          description: track.description.trim(),
        };
        const response = await fetch(`/api/admin/hackathons/${hackathon.uuid}/tracks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          return {
            clientId: track.clientId,
            name: track.name.trim(),
            success: false,
            error: await getErrorMessage(response, "Failed to create track."),
          };
        }

        return {
          clientId: track.clientId,
          name: track.name.trim(),
          success: true,
          error: null,
        };
      }));

      const successfulTrackIds = trackResults
        .filter((result) => result.success)
        .map((result) => result.clientId);
      const nextCreatedTrackIds = [...new Set([...createdTrackIds, ...successfulTrackIds])];
      setCreatedTrackIds(nextCreatedTrackIds);

      const failedTracks = trackResults.filter((result) => !result.success);
      const activeTrackCount = await countActiveTracks(hackathon.uuid);

      if (failedTracks.length > 0) {
        const failedNames = failedTracks.map((track) => track.name).join(", ");
        setTrackSetupNotice(
          activeTrackCount > 0
            ? `Hackathon created, but these tracks still need attention: ${failedNames}.`
            : `Hackathon created, but no active track was created. Failed tracks: ${failedNames}.`,
        );
        return;
      }

      if (activeTrackCount === 0) {
        setTrackSetupNotice(
          "Hackathon created, but no active track could be confirmed. Add a track before publishing.",
        );
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError("Creation failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Create New Hackathon
          </h1>
          <p className="mt-1 text-sm text-white/60">
            Define basic details, timeline dates, timezone, and participant team size rules.
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          Cancel
        </Link>
      </div>

      {serverError && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 font-medium">
          {serverError}
        </div>
      )}

      {createdHackathon && (trackSetupNotice || serverError) && (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-[#FBBC04]/20 bg-[#FBBC04]/10 p-4 text-sm text-[#ffd54f] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Track setup is incomplete for {createdHackathon.name}.</p>
            <p className="mt-1 text-[#ffd54f]/75">
              {trackSetupNotice ?? "Track setup could not be verified. Add or verify an active track before publishing."}
            </p>
          </div>
          <Link
            href={`/admin/hackathons/${createdHackathon.uuid}/tracks`}
            className="shrink-0 rounded-xl border border-[#FBBC04]/25 bg-[#FBBC04]/10 px-4 py-2 text-center text-sm font-medium text-[#ffd54f] transition hover:bg-[#FBBC04]/20"
          >
            Manage Tracks
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        {/* Basic Information */}
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold text-white">Basic Information</h2>
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-2">
              Hackathon Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Build & Grow AI Hackathon 2026"
              className={`w-full rounded-xl border bg-black/60 px-4 py-3 text-sm text-white placeholder-white/30 transition focus:outline-none ${
                validationErrors.name
                  ? "border-red-500/60 focus:border-red-500"
                  : "border-white/10 focus:border-[#4285F4]"
              }`}
            />
            {validationErrors.name && (
              <p className="mt-1 text-xs font-medium text-red-400">
                {validationErrors.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-2">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Event description and guidelines..."
              className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-[#4285F4] focus:outline-none"
            />
          </div>

          {/* Searchable Timezone Dropdown */}
          <TimezoneSelect
            label="Event Timezone"
            value={timezone}
            onChange={(tz) => setTimezone(tz)}
            error={validationErrors.timezone}
          />
        </div>

        {/* Required Tracks */}
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Tracks</h2>
              <p className="mt-1 text-sm text-white/50">
                Add at least one active track before this hackathon can be published.
              </p>
            </div>
            <span className="font-mono text-xs uppercase tracking-widest text-white/30">
              Required
            </span>
          </div>

          <div className="space-y-3">
            {stagedTracks.map((track) => {
              const isCreated = createdTrackIds.includes(track.clientId);
              const trackErrors = trackValidation.errorsById[track.clientId];

              return (
                <div key={track.clientId} className="rounded-xl border border-white/[0.08] bg-black/30 p-4">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">
                          Track Name *
                        </label>
                        <input
                          value={track.name}
                          onChange={(event) => updateStagedTrack(track.clientId, "name", event.target.value)}
                          disabled={loading || isCreated}
                          placeholder="e.g. AI/ML"
                          maxLength={120}
                          className={`w-full rounded-xl border bg-black/60 px-4 py-3 text-sm text-white placeholder-white/30 transition focus:outline-none ${
                            trackErrors?.name
                              ? "border-red-500/60 focus:border-red-500"
                              : "border-white/10 focus:border-[#4285F4]"
                          }`}
                        />
                        {trackErrors?.name && (
                          <p className="mt-1 text-xs font-medium text-red-400">{trackErrors.name}</p>
                        )}
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">
                          Description *
                        </label>
                        <input
                          value={track.description}
                          onChange={(event) => updateStagedTrack(track.clientId, "description", event.target.value)}
                          disabled={loading || isCreated}
                          placeholder="Optional track description"
                          maxLength={500}
                          className={`w-full rounded-xl border bg-black/60 px-4 py-3 text-sm text-white placeholder-white/30 transition focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                            trackErrors?.description
                              ? "border-red-500/60 focus:border-red-500"
                              : "border-white/10 focus:border-[#4285F4]"
                          }`}
                        />
                        {trackErrors?.description && (
                          <p className="mt-1 text-xs font-medium text-red-400">{trackErrors.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 pt-7">
                      {isCreated && (
                        <span className="rounded-full border border-[#34A853]/20 bg-[#34A853]/10 px-2.5 py-0.5 text-xs font-medium text-[#81c784]">
                          Created
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeTrack(track.clientId)}
                        disabled={loading || isCreated}
                        aria-label={`Remove ${track.name.trim() || "track"}`}
                        title={isCreated ? "Created tracks can be managed from Manage Tracks" : "Remove track"}
                        className="rounded-lg p-2 text-white/40 transition hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.35 9m-4.78 0L9.26 9m9.97-3.21c.34.05.68.1 1.02.16m-1.02-.16L18.16 19.67A2.25 2.25 0 0 1 15.92 21.75H8.08a2.25 2.25 0 0 1-2.24-2.08L4.77 5.79m14.46 0a48.11 48.11 0 0 0-3.48-.4m-12 .56c.34-.06.68-.11 1.02-.16m0 0a48.11 48.11 0 0 1 3.48-.4m7.5 0V4.88c0-1.13-.87-2.05-2-2.09a48.2 48.2 0 0 0-3.5 0c-1.13.04-2 .96-2 2.09v.91m7.5 0a48.67 48.67 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {trackValidation.message && (
            <p className="text-xs font-medium text-red-400">{trackValidation.message}</p>
          )}

          <button
            type="button"
            onClick={addTrack}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Add Track
          </button>
        </div>

        {/* Timelines with Custom Date Pickers */}
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold text-white">Event Timeline & Deadlines</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <CustomDateTimePicker
              label="Registration Start *"
              value={regStart}
              onChange={(v) => setRegStart(v)}
              error={validationErrors.regStart}
            />
            <CustomDateTimePicker
              label="Registration End *"
              value={regEnd}
              onChange={(v) => setRegEnd(v)}
              error={validationErrors.regEnd}
            />
            <CustomDateTimePicker
              label="Event Start *"
              value={eventStart}
              onChange={(v) => setEventStart(v)}
              error={validationErrors.eventStart}
            />
            <CustomDateTimePicker
              label="Event End *"
              value={eventEnd}
              onChange={(v) => setEventEnd(v)}
              error={validationErrors.eventEnd}
            />
            <CustomDateTimePicker
              label="Submission Start *"
              value={subStart}
              onChange={(v) => setSubStart(v)}
              error={validationErrors.subStart}
            />
            <CustomDateTimePicker
              label="Submission Deadline *"
              value={subDeadline}
              onChange={(v) => setSubDeadline(v)}
              error={validationErrors.subDeadline}
            />
          </div>

        {/* Live Gantt Chart Visualizer */}
        <LiveTimelineGantt
          regStart={regStart}
          regEnd={regEnd}
          eventStart={eventStart}
          eventEnd={eventEnd}
          subStart={subStart}
          subDeadline={subDeadline}
        />
        </div>

        {/* Team Configuration */}
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold text-white">Team Configuration</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-2">
                Min Team Size
              </label>
              <input
                type="number"
                min={1}
                step={1}
                value={minTeamSize}
                onChange={(e) => setMinTeamSize(e.target.value)}
                className={`w-full rounded-xl border bg-black/60 px-4 py-3 text-sm text-white focus:outline-none ${
                  validationErrors.minTeamSize
                    ? "border-red-500/60 focus:border-red-500"
                    : "border-white/10 focus:border-[#4285F4]"
                }`}
              />
              {validationErrors.minTeamSize && (
                <p className="mt-1 text-xs font-medium text-red-400">
                  {validationErrors.minTeamSize}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-2">
                Max Team Size
              </label>
              <input
                type="number"
                min={1}
                step={1}
                value={maxTeamSize}
                onChange={(e) => setMaxTeamSize(e.target.value)}
                className={`w-full rounded-xl border bg-black/60 px-4 py-3 text-sm text-white focus:outline-none ${
                  validationErrors.maxTeamSize
                    ? "border-red-500/60 focus:border-red-500"
                    : "border-white/10 focus:border-[#4285F4]"
                }`}
              />
              {validationErrors.maxTeamSize && (
                <p className="mt-1 text-xs font-medium text-red-400">
                  {validationErrors.maxTeamSize}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 pt-2">
            <label className="flex items-center gap-3 text-sm text-white/80 cursor-pointer">
              <input
                type="checkbox"
                checked={allowIndividual}
                onChange={(e) => setAllowIndividual(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-black text-[#4285F4]"
              />
              Allow Individual Registration
            </label>
            <label className="flex items-center gap-3 text-sm text-white/80 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-black text-[#4285F4]"
              />
              Is Publicly Visible
            </label>
          </div>
        </div>

        {/* Form Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {!isValid && (
            <div className="text-xs text-red-400 font-medium flex items-center gap-1.5">
              <span>
                &#9888; {trackValidation.message ?? "Please fix timeline/validation errors above before submitting."}
              </span>
            </div>
          )}
          <div className="ml-auto">
            <button
              type="submit"
              disabled={loading || !isValid}
              className={`rounded-xl px-6 py-3 font-semibold text-white transition shadow-lg ${
                isValid && !loading
                  ? "bg-[#4285F4] hover:bg-[#3367d6] shadow-blue-500/20"
                  : "bg-gray-700/50 text-white/40 cursor-not-allowed border border-white/10"
              }`}
            >
              {loading
                ? createdHackathon ? "Setting Up Tracks..." : "Creating Hackathon..."
                : createdHackathon
                  ? createdTrackIds.length === stagedTracks.length
                    ? "Verify Track Setup"
                    : "Retry Track Setup"
                  : "Save & Create Hackathon"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
