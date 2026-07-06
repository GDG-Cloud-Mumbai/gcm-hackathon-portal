import { proxyToBackend } from "@/lib/api-client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  const { uuid } = await params;
  const body = await request.json();
  return proxyToBackend(`/participants/teams/${uuid}/join`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
