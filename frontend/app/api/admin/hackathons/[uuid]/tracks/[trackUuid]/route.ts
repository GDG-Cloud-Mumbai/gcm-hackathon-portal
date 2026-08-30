import { proxyToBackend } from "@/lib/api-client";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uuid: string; trackUuid: string }> },
) {
  const { uuid, trackUuid } = await params;
  return proxyToBackend(`/admin/hackathons/${uuid}/tracks/${trackUuid}`);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ uuid: string; trackUuid: string }> },
) {
  const { uuid, trackUuid } = await params;
  const body = await request.json();
  return proxyToBackend(`/admin/hackathons/${uuid}/tracks/${trackUuid}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
