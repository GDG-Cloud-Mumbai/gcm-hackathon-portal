import { type NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/api-client";

export async function GET(request: NextRequest) {
  const hackathonUuid = request.nextUrl.searchParams.get("hackathon_uuid") ?? "";
  const qs = hackathonUuid ? `?hackathon_uuid=${encodeURIComponent(hackathonUuid)}` : "";
  return proxyToBackend(`/participants/me/team${qs}`);
}
