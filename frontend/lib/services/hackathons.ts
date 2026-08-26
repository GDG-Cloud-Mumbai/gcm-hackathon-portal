import { BACKEND_URL } from "@/lib/constants";
import {
  isVisibleOnHome,
  mapBackendToHackathon,
  type BackendHackathon,
} from "@/lib/hackathon-mapper";
import type { Hackathon } from "@/lib/types";

type BackendListResponse = {
  hackathons: BackendHackathon[];
};

async function fetchBackendHackathons(): Promise<Hackathon[]> {
  if (!BACKEND_URL) {
    return [];
  }

  const res = await fetch(`${BACKEND_URL}/hackathons`, { cache: "no-store" });
  if (!res.ok) {
    return [];
  }

  const data = (await res.json()) as BackendListResponse;
  return (data.hackathons ?? [])
    .filter(isVisibleOnHome)
    .map(mapBackendToHackathon);
}

async function fetchBackendHackathon(id: string): Promise<Hackathon | null> {
  if (!BACKEND_URL) {
    return null;
  }

  const res = await fetch(`${BACKEND_URL}/hackathons/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    return null;
  }

  const doc = (await res.json()) as BackendHackathon;
  if (doc.status === "archived") {
    return null;
  }

  return mapBackendToHackathon(doc);
}

export async function getHackathons(): Promise<Hackathon[]> {
  return fetchBackendHackathons();
}

export async function getHackathon(id: string): Promise<Hackathon | null> {
  return fetchBackendHackathon(id);
}

/** Client-side fetch via Next.js API route (for use in "use client" components). */
export async function fetchHackathon(id: string): Promise<Hackathon | null> {
  const res = await fetch(`/api/hackathons/${id}`);
  if (!res.ok) {
    return null;
  }

  const doc = (await res.json()) as BackendHackathon;
  if (doc.status === "archived") {
    return null;
  }

  return mapBackendToHackathon(doc);
}
