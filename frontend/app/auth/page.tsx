"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Step = "email" | "otp";

export default function AuthPage() {
  return (
    <Suspense>
      <AuthCard />
    </Suspense>
  );
}

function AuthCard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawNext = searchParams.get("next");
  const nextRoute = rawNext?.startsWith("/") ? rawNext : "/home";

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function requestOtp(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to send OTP.");
      }

      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Invalid or expired OTP.");
      }

      router.push(nextRoute);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="font-sans min-h-screen bg-black text-white">
      <div className="flex min-h-screen items-center justify-center px-5">
        <section className="w-full max-w-[420px]">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
              <div className="grid rotate-45 grid-cols-2 gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-[#4285F4]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#EA4335]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#FBBC04]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#34A853]" />
              </div>
            </div>

            <p className="mb-3 text-xs font-medium uppercase tracking-[0.28em] text-white/40">
              Hackathon Portal
            </p>

            <h1 className="text-4xl font-medium tracking-[-0.04em] text-white">
              Experience liftoff.
            </h1>

            <p className="mt-3 text-sm text-white/50">
              {step === "email"
                ? "Continue with your registered email."
                : "Enter the code sent to your inbox."}
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#0a0a0a] p-2 shadow-2xl shadow-black">
            <div className="rounded-[22px] border border-white/[0.06] bg-[#111111] p-6">
              {step === "email" ? (
                <form onSubmit={requestOtp} className="space-y-5">
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm text-white/70"
                    >
                      Email
                    </label>

                    <input
                      id="email"
                      type="email"
                      required
                      autoFocus
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="name@example.com"
                      className="h-13 w-full rounded-2xl border border-white/10 bg-black px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#8ab4f8] focus:ring-4 focus:ring-[#8ab4f8]/10"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="h-12 w-full rounded-full bg-white text-sm font-medium text-black transition hover:bg-[#e8eaed] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? "Sending code..." : "Continue"}
                  </button>
                </form>
              ) : (
                <form onSubmit={verifyOtp} className="space-y-5">
                  <div>
                    <label
                      htmlFor="otp"
                      className="mb-2 block text-sm text-white/70"
                    >
                      Verification code
                    </label>

                    <p className="mb-4 truncate text-sm text-white/40">
                      {email}
                    </p>

                    <input
                      id="otp"
                      type="text"
                      required
                      autoFocus
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(event) =>
                        setOtp(event.target.value.replace(/\D/g, ""))
                      }
                      placeholder="000000"
                      className="h-14 w-full rounded-2xl border border-white/10 bg-black px-4 text-center text-xl font-medium tracking-[0.45em] text-white outline-none transition placeholder:text-white/20 focus:border-[#8ab4f8] focus:ring-4 focus:ring-[#8ab4f8]/10"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="h-12 w-full rounded-full bg-white text-sm font-medium text-black transition hover:bg-[#e8eaed] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? "Verifying..." : "Verify"}
                  </button>

                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("email");
                        setOtp("");
                        setError("");
                      }}
                      className="text-white/45 transition hover:text-white"
                    >
                      Change email
                    </button>

                    <button
                      type="button"
                      onClick={() => requestOtp()}
                      disabled={loading}
                      className="text-[#8ab4f8] transition hover:text-[#aecbfa] disabled:opacity-50"
                    >
                      Resend code
                    </button>
                  </div>
                </form>
              )}

              {error ? (
                <div className="mt-5 rounded-2xl border border-[#f28b82]/25 bg-[#f28b82]/10 px-4 py-3 text-sm text-[#f28b82]">
                  {error}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex justify-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4285F4]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#EA4335]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#FBBC04]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#34A853]" />
          </div>
        </section>
      </div>
    </main>
  );
}