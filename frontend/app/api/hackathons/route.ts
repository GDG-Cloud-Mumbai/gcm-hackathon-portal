import { proxyToBackendPublic } from "@/lib/api-client";

export const dynamic = "force-dynamic";

export async function GET() {
  return proxyToBackendPublic("/hackathons");
}

