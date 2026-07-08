import { proxyToBackend } from "@/lib/api-client";

export async function POST(request: Request) {
  const body = await request.json();
  return proxyToBackend("/participants/teams", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
