import { redirect } from "next/navigation";
import { getAccessToken } from "@/lib/auth";
import { BACKEND_URL } from "@/lib/constants";

type MeResponse = {
  global_role?: { name: string };
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = await getAccessToken();
  if (!token) {
    redirect("/auth");
  }

  if (!BACKEND_URL) {
    redirect("/home");
  }

  const res = await fetch(`${BACKEND_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    redirect("/auth");
  }

  const user = (await res.json()) as MeResponse;
  const role = user.global_role?.name;

  if (role !== "admin" && role !== "superadmin") {
    redirect("/home");
  }

  return <>{children}</>;
}
