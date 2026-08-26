import { proxyToBackend } from "@/lib/api-client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  const { uuid } = await params;
  return proxyToBackend(`/admin/hackathons/${uuid}`);
}


