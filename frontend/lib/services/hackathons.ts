// Hackathon data service.
// Currently reads from dummy data. When backend hackathon endpoints are
// available, replace the implementations below — UI code stays unchanged.

import type { Hackathon } from "@/lib/types";
import { DUMMY_HACKATHONS } from "@/lib/dummy-hackathons";

export async function getHackathons(): Promise<Hackathon[]> {
  return DUMMY_HACKATHONS;
}

export async function getHackathon(id: string): Promise<Hackathon | null> {
  return DUMMY_HACKATHONS.find((h) => h.hackathon_uuid === id) ?? null;
}
