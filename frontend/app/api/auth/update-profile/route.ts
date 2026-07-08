import { proxyToBackend } from "@/lib/api-client";

export async function PATCH(request: Request) {
  const body = await request.json();
  return proxyToBackend("/auth/update-profile", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
