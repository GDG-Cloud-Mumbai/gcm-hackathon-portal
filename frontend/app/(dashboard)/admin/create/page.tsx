"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CustomDateTimePicker } from "@/components/ui/custom-datetime-picker";
import { TimezoneSelect } from "@/components/ui/timezone-select";
import { LiveTimelineGantt } from "@/components/admin/live-timeline-gantt";

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

  const [minTeamSize, setMinTeamSize] = useState(1);
  const [maxTeamSize, setMaxTeamSize] = useState(4);
  const [allowIndividual, setAllowIndividual] = useState(true);
  const [isPublic, setIsPublic] = useState(true);

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Immediate Inline Validation Logic
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

    setLoading(true);
    setServerError(null);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
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

      const res = await fetch("/api/admin/hackathons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || data.message || "Failed to create hackathon");
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

        {/* Timelines with Custom Date Pickers */}
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

        {/* Form Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {!isValid && (
            <div className="text-xs text-red-400 font-medium flex items-center gap-1.5">
              <span>&#9888; Please fix timeline/validation errors above before submitting.</span>
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
              {loading ? "Creating Hackathon..." : "Save & Create Hackathon"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
