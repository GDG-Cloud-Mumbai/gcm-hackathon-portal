import { proxyToBackend } from "@/lib/api-client";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  const { uuid } = await params;
  return proxyToBackend(`/admin/hackathons/${uuid}/tracks`);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  const { uuid } = await params;
  const body = await request.json();
  return proxyToBackend(`/admin/hackathons/${uuid}/tracks`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
