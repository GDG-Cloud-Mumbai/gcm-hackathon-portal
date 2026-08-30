import { BACKEND_URL } from "@/lib/constants";
import {
  mapParticipantHackathonToHackathon,
} from "@/lib/hackathon-mapper";
import type {
  Hackathon,
  ParticipantHackathonDetail,
  ParticipantHackathonSummary,
  Track,
} from "@/lib/types";

type ParticipantHackathonListResponse = {
  hackathons: ParticipantHackathonSummary[];
};

type ParticipantTrackListResponse = {
  tracks: Track[];
};

type ParticipantHackathonListResult = {
  hackathons: ParticipantHackathonSummary[];
  error: string | null;
};

async function getErrorMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as {
      detail?: string;
      message?: string;
    };
    return data.detail ?? data.message ?? fallback;
  } catch {
    return fallback;
  }
}

export async function getParticipantHackathons(
  accessToken: string,
): Promise<ParticipantHackathonListResult> {
  if (!BACKEND_URL) {
    return {
      hackathons: [],
      error: "Hackathon service is not configured.",
    };
  }

  const res = await fetch(`${BACKEND_URL}/participants/hackathons`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    return {
      hackathons: [],
      error: await getErrorMessage(res, "Failed to load available hackathons."),
    };
  }

  const data = (await res.json()) as ParticipantHackathonListResponse;
  return { hackathons: data.hackathons ?? [], error: null };
}

export async function getParticipantHackathon(
  id: string,
  accessToken: string,
): Promise<Hackathon | null> {
  if (!BACKEND_URL || !accessToken) {
    return null;
  }

  const res = await fetch(`${BACKEND_URL}/participants/hackathons/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    return null;
  }

  const doc = (await res.json()) as ParticipantHackathonDetail;
  return mapParticipantHackathonToHackathon(doc, []);
}

/** Client-side detail and track fetch via authenticated Next.js BFF routes. */
export async function fetchParticipantHackathon(
  id: string,
): Promise<Hackathon | null> {
  const detailResponse = await fetch(`/api/participants/hackathons/${id}`);
  if (detailResponse.status === 404) {
    return null;
  }
  if (!detailResponse.ok) {
    throw new Error(
      await getErrorMessage(detailResponse, "Failed to load hackathon details."),
    );
  }

  const tracksResponse = await fetch(
    `/api/participants/hackathons/${id}/tracks`,
  );
  if (!tracksResponse.ok) {
    throw new Error(
      await getErrorMessage(tracksResponse, "Failed to load hackathon tracks."),
    );
  }

  const detail = (await detailResponse.json()) as ParticipantHackathonDetail;
  const tracks = (await tracksResponse.json()) as ParticipantTrackListResponse;
  return mapParticipantHackathonToHackathon(detail, tracks.tracks ?? []);
}
