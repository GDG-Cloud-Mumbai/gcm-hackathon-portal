import { proxyToBackend } from "@/lib/api-client";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  const { uuid } = await params;
  return proxyToBackend(`/participants/teams/${uuid}/leave`, {
    method: "POST",
    body: "{}",
  });
}
