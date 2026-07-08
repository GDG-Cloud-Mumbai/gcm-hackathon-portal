import { type NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/api-client";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email") ?? "";
  return proxyToBackend(`/participants/users/search?email=${encodeURIComponent(email)}`);
}
