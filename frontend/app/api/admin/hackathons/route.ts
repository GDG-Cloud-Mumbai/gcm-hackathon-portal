import { proxyToBackend } from "@/lib/api-client";

export const dynamic = "force-dynamic";

export async function GET() {
  return proxyToBackend("/admin/hackathons");
}

export async function POST(request: Request) {
  const body = await request.json();
  return proxyToBackend("/admin/hackathons", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

