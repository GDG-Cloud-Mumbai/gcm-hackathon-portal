import { proxyToBackend } from "@/lib/api-client";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  const { uuid } = await params;
  return proxyToBackend(`/participants/hackathons/${uuid}`);
}
