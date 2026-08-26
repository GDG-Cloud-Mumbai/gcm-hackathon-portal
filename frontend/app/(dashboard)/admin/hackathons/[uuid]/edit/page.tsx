"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CustomDateTimePicker } from "@/components/ui/custom-datetime-picker";
import { TimezoneSelect } from "@/components/ui/timezone-select";
import { LiveTimelineGantt } from "@/components/admin/live-timeline-gantt";
import { Skeleton } from "@/components/ui/skeleton";

function toInputDateString(iso: string | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toISOString().slice(0, 16);
  } catch {
    return "";
  }
}

export default function EditHackathonPage() {
  const router = useRouter();
  const params = useParams<{ uuid: string }>();
  const uuid = params.uuid;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [timezone, setTimezone] = useState("");

  const [regStart, setRegStart] = useState("");
  const [regEnd, setRegEnd] = useState("");
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");
  const [subStart, setSubStart] = useState("");
  const [subDeadline, setSubDeadline] = useState("");

  const [minTeamSize, setMinTeamSize] = useState(1);
  const [maxTeamSize, setMaxTeamSize] = useState(4);
  const [allowIndividual, setAllowIndividual] = useState(true);
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/admin/hackathons/${uuid}`, { cache: "no-store" });
        if (!res.ok) {
          throw new Error("Failed to fetch hackathon details.");
        }
        const data = await res.json();
        if (cancelled) return;

        setName(data.name || "");
        setDescription(data.description || "");
        setTimezone(data.timezone || "Asia/Kolkata");

        setRegStart(toInputDateString(data.registration_start));
        setRegEnd(toInputDateString(data.registration_end));
        setEventStart(toInputDateString(data.event_start));
        setEventEnd(toInputDateString(data.event_end));
        setSubStart(toInputDateString(data.submission_start));
        setSubDeadline(toInputDateString(data.submission_deadline));

        setMinTeamSize(data.min_team_size ?? 1);
        setMaxTeamSize(data.max_team_size ?? 4);
        setAllowIndividual(data.allow_individual_registration ?? true);
        setIsPublic(data.is_public ?? true);
      } catch (err: unknown) {
        if (!cancelled) {
          setServerError(err instanceof Error ? err.message : "Error loading hackathon");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [uuid]);

  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = "Hackathon name is required";
    }

    const tRegStart = regStart ? new Date(regStart).getTime() : null;
    const tRegEnd = regEnd ? new Date(regEnd).getTime() : null;
    const tEventStart = eventStart ? new Date(eventStart).getTime() : null;
    const tEventEnd = eventEnd ? new Date(eventEnd).getTime() : null;
    const tSubStart = subStart ? new Date(subStart).getTime() : null;
    const tSubDeadline = subDeadline ? new Date(subDeadline).getTime() : null;

    if (tRegStart && tRegEnd && tRegStart >= tRegEnd) {
      errors.regEnd = "Registration start must be before registration end";
    }

    if (tRegEnd && tEventStart && tRegEnd > tEventStart) {
      errors.eventStart = "Registration must end before or at event start";
    }

    if (tEventStart && tEventEnd && tEventStart >= tEventEnd) {
      errors.eventEnd = "Event start must be before event end";
    }

    if (tSubStart && tSubDeadline && tSubStart > tSubDeadline) {
      errors.subDeadline = "Submission start must be before submission deadline";
    }

    if (tSubDeadline && tEventEnd && tSubDeadline > tEventEnd) {
      errors.subDeadline = "Submission deadline cannot be after event end";
    }

    if (minTeamSize < 1) {
      errors.minTeamSize = "Minimum team size must be at least 1";
    }

    if (minTeamSize > maxTeamSize) {
      errors.maxTeamSize = "Minimum team size cannot exceed maximum team size";
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
  ]);

  const isValid = Object.keys(validationErrors).length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;

    setSubmitting(true);
    setServerError(null);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        timezone,
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

      const res = await fetch(`/api/admin/hackathons/${uuid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || data.message || "Failed to update hackathon");
      }

      router.push(`/admin`);
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError("Update failed.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-6 py-10">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Edit Hackathon
          </h1>
          <p className="mt-1 text-sm text-white/60">
            Update hackathon settings, descriptions, timeline dates, and team size rules.
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



          <TimezoneSelect
            label="Event Timezone"
            value={timezone}
            onChange={(tz) => setTimezone(tz)}
          />
        </div>

        {/* Live Timeline Visualization */}
        <LiveTimelineGantt
          regStart={regStart}
          regEnd={regEnd}
          eventStart={eventStart}
          eventEnd={eventEnd}
          subStart={subStart}
          subDeadline={subDeadline}
        />

        {/* Timelines */}
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold text-white">Event Timeline & Deadlines</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <CustomDateTimePicker
              label="Registration Start *"
              value={regStart}
              onChange={(v) => setRegStart(v)}
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
            />
            <CustomDateTimePicker
              label="Submission Deadline *"
              value={subDeadline}
              onChange={(v) => setSubDeadline(v)}
              error={validationErrors.subDeadline}
            />
          </div>
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
                value={minTeamSize}
                onChange={(e) => setMinTeamSize(Number(e.target.value))}
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
                value={maxTeamSize}
                onChange={(e) => setMaxTeamSize(Number(e.target.value))}
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

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {!isValid && (
            <div className="text-xs text-red-400 font-medium flex items-center gap-1.5">
              <span>&#9888; Please fix validation errors above before saving.</span>
            </div>
          )}
          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/admin"
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || !isValid}
              className={`rounded-xl px-6 py-2.5 font-semibold text-white transition shadow-lg ${
                isValid && !submitting
                  ? "bg-[#4285F4] hover:bg-[#3367d6] shadow-blue-500/20"
                  : "bg-gray-700/50 text-white/40 cursor-not-allowed border border-white/10"
              }`}
            >
              {submitting ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
