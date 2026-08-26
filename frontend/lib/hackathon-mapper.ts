import type { Hackathon, HackathonStatus } from "@/lib/types";

export type BackendHackathon = {
  uuid: string;
  slug?: string;
  name: string;
  description?: string;
  status: string;
  registration_start?: string;
  registration_end?: string;
  event_start: string;
  event_end: string;
  submission_start?: string;
  submission_deadline?: string;
  min_team_size?: number;
  max_team_size?: number;
  is_public?: boolean;
};

function deriveStatus(doc: BackendHackathon): HackathonStatus {
  const now = Date.now();
  const eventStart = new Date(doc.event_start).getTime();
  const eventEnd = new Date(doc.event_end).getTime();

  // Primary: Respect explicit backend lifecycle status
  if (doc.status === "registration_open" || doc.status === "ongoing" || doc.status === "judging") {
    return "active";
  }
  if (doc.status === "completed" || doc.status === "archived") {
    return "ended";
  }
  if (doc.status === "registration_closed" || doc.status === "published" || doc.status === "draft") {
    if (!Number.isNaN(eventEnd) && now > eventEnd) return "ended";
    if (!Number.isNaN(eventStart) && now >= eventStart && now <= eventEnd) return "active";
    return "upcoming";
  }

  // Fallback: Date calculation
  if (!Number.isNaN(eventStart) && !Number.isNaN(eventEnd)) {
    if (now >= eventStart && now <= eventEnd) return "active";
    if (now > eventEnd) return "ended";
  }

  return "upcoming";
}

export function mapBackendToHackathon(doc: BackendHackathon): Hackathon {
  const now = Date.now();
  const regStart = doc.registration_start ? new Date(doc.registration_start).getTime() : null;
  const regEnd = doc.registration_end ? new Date(doc.registration_end).getTime() : null;

  // Determine if registration is actively open
  let isRegOpen = doc.status === "registration_open";
  if (!isRegOpen && doc.status !== "registration_closed" && doc.status !== "completed" && doc.status !== "archived" && doc.status !== "draft") {
    if (regStart && regEnd && !Number.isNaN(regStart) && !Number.isNaN(regEnd)) {
      isRegOpen = now >= regStart && now <= regEnd;
    }
  }

  return {
    hackathon_uuid: doc.uuid,
    name: doc.name,
    tagline: doc.description?.slice(0, 80) ?? "",
    description: doc.description ?? "",
    backend_status: doc.status,
    status: deriveStatus(doc),
    starts_at: doc.event_start,
    ends_at: doc.event_end,
    registration_start: doc.registration_start,
    registration_end: doc.registration_end,
    registration_open: isRegOpen,
    min_team_size: doc.min_team_size ?? 1,
    max_team_size: doc.max_team_size ?? 4,
    tracks: [],
  };
}

export function isVisibleOnHome(doc: BackendHackathon): boolean {
  if (doc.is_public === false) return false;
  return doc.status !== "draft" && doc.status !== "archived";
}
