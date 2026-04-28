import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  type AuthResponse,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = String(body.email || "").trim().toLowerCase();
    const otp = String(body.otp || "").trim();

    if (!email || !otp) {
      return NextResponse.json(
        { message: "Email and OTP are required." },
        { status: 400 },
      );
    }

    const backendResponse = await fetch(
      `${process.env.BACKEND_URL}/auth/verify-otp`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          otp,
        }),
        cache: "no-store",
      },
    );

    const text = await backendResponse.text();

    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text };
    }

    if (!backendResponse.ok || !data.access_token) {
      console.error("Verify OTP failed:", {
        status: backendResponse.status,
        data,
      });

      return NextResponse.json(
        {
          message:
            data.detail ||
            data.message ||
            data.error ||
            "Invalid or expired OTP.",
        },
        {
          status: backendResponse.status || 401,
        },
      );
    }

    const authData = data as AuthResponse;

    const response = NextResponse.json({
      user: authData.user,
      token_type: authData.token_type,
      expires_in: authData.expires_in,
    });

    response.cookies.set(AUTH_COOKIE_NAME, authData.access_token, {
      ...authCookieOptions,
      maxAge: authData.expires_in,
    });

    return response;
  } catch (error) {
    console.error("Verify OTP route error:", error);

    return NextResponse.json(
      {
        message: "Could not connect to the OTP verification service.",
      },
      {
        status: 500,
      },
    );
  }
}