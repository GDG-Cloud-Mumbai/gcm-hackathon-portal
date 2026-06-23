import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = String(body.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { message: "Email is required." },
        { status: 400 },
      );
    }

    const backendResponse = await fetch(
      `${process.env.BACKEND_URL}/auth/request-otp`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
        cache: "no-store",
      },
    );

    const text = await backendResponse.text();

    let data: unknown = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text };
    }
    const errorData = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
    if (!backendResponse.ok) {
      console.error("Request OTP failed:", {
        status: backendResponse.status,
        data: errorData,
      });

      return NextResponse.json(
        {
          message:
            errorData.detail ||
            errorData.message ||
            errorData.error ||
            "Something went wrong with the OTP request.",
        },
        {
          status: backendResponse.status,
        },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Request OTP route error:", error);

    return NextResponse.json(
      {
        message: "Could not connect to the OTP service.",
      },
      {
        status: 500,
      },
    );
  }
}