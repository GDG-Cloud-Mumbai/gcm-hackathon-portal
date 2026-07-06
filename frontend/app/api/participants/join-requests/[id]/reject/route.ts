import { proxyToBackend } from "@/lib/api-client";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToBackend(`/participants/join-requests/${id}/reject`, {
    method: "POST",
    body: "{}",
  });
}
