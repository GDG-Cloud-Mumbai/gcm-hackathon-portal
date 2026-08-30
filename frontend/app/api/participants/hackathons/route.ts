import { proxyToBackend } from "@/lib/api-client";

export const dynamic = "force-dynamic";

export async function GET() {
  return proxyToBackend("/participants/hackathons");
}
