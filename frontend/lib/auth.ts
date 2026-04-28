import { cookies } from "next/headers";

export const AUTH_COOKIE_NAME = "gcm_access_token";

export type AuthUser = {
  email: string;
  created_at: string;
  last_login_at: string;
};

export type AuthResponse = {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  user: AuthUser;
};

export const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function getAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE_NAME)?.value;
}

export function decodeJwtPayload<T = Record<string, unknown>>(
  token: string,
): T | null {
  try {
    const payload = token.split(".")[1];

    if (!payload) {
      return null;
    }

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(base64, "base64").toString("utf-8");

    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}