import { proxyToBackend } from "@/lib/api-client";

export async function GET() {
  return proxyToBackend("/participants/invitations");
}
