import { proxyToBackend } from "@/lib/api-client";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ uuid: string; action: string }> },
) {
  const { uuid, action } = await params;
  return proxyToBackend(`/admin/hackathons/${uuid}/${action}`, {
    method: "POST",
  });
}

