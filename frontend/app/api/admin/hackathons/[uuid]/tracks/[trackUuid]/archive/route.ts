import { proxyToBackend } from "@/lib/api-client";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ uuid: string; trackUuid: string }> },
) {
  const { uuid, trackUuid } = await params;
  return proxyToBackend(`/admin/hackathons/${uuid}/tracks/${trackUuid}/archive`, {
    method: "POST",
  });
}
