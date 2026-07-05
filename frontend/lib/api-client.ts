import { getAccessToken } from "@/lib/auth";

const BACKEND_URL = process.env.BACKEND_URL;

export async function proxyToBackend(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  if (!BACKEND_URL) {
    return Response.json(
      { message: "Backend URL not configured" },
      { status: 500 },
    );
  }

  const token = await getAccessToken();
  if (!token) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...(options.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  return Response.json(data, { status: res.status });
}
