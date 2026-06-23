"use client";

import { useState } from "react";
import Link from "next/link";

type HackathonFilter = "all" | "active" | "upcoming" | "past";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("deploy");
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<HackathonFilter>("all");

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const hackathons = [
    {
      id: "genai-2026",
      title: "Google Cloud GenAI Challenge 2026",
      subtitle: "Build intelligent agentic workflows on Vertex AI",
      status: "active",
      badgeText: "Active Now",
      badgeColor: "bg-[#4285F4]/10 text-[#8ab4f8] border-[#4285F4]/20",
      accentGlow: "shadow-[#4285F4]/5 border-[#4285F4]/20 hover:border-[#4285F4]/50",
      date: "August 15-16, 2026",
      mode: "Hybrid (Google Mumbai Office + Online)",
      prizePool: "₹1,50,000",
      teamSize: "1-4 Members",
      description: "Design and implement cutting-edge conversational agents, automation engines, or multi-modal models using Gemini 2.5 and Vertex AI APIs.",
      ctaText: "Register for Challenge",
      link: "/auth"
    },
    {
      id: "cloudnative-2026",
      title: "Cloud Native Scale Build 2026",
      subtitle: "Deploy highly resilient container systems on GKE",
      status: "active",
      badgeText: "Active Now",
      badgeColor: "bg-[#EA4335]/10 text-[#ff8a80] border-[#EA4335]/20",
      accentGlow: "shadow-[#EA4335]/5 border-[#EA4335]/20 hover:border-[#EA4335]/50",
      date: "September 12-13, 2026",
      mode: "Online Hackathon",
      prizePool: "₹1,00,000",
      teamSize: "1-4 Members",
      description: "Scale applications on Google Kubernetes Engine (GKE), deploy serverless modules on Cloud Run, and construct APIs that can withstand heavy traffic spikes.",
      ctaText: "Register for Hackathon",
      link: "/auth"
    },
    {
      id: "techgood-2026",
      title: "GCP Tech For Good 2026",
      subtitle: "Create high-impact sustainable solutions",
      status: "upcoming",
      badgeText: "Upcoming",
      badgeColor: "bg-[#FBBC04]/10 text-[#ffd54f] border-[#FBBC04]/20",
      accentGlow: "shadow-[#FBBC04]/5 border-[#FBBC04]/20 hover:border-[#FBBC04]/50",
      date: "October 17-18, 2026",
      mode: "Hybrid (Mumbai Venue TBA)",
      prizePool: "₹1,00,000",
      teamSize: "1-4 Members",
      description: "Build digital prototypes tackling carbon emissions, municipal management in Mumbai, or equal educational access, utilizing Google Cloud APIs.",
      ctaText: "Get Notified",
      link: "/auth"
    },
    {
      id: "gamedev-2026",
      title: "Mumbai Cloud Game Jam 2026",
      subtitle: "Construct backend-driven multiplayer games",
      status: "upcoming",
      badgeText: "Upcoming",
      badgeColor: "bg-[#34A853]/10 text-[#81c784] border-[#34A853]/20",
      accentGlow: "shadow-[#34A853]/5 border-[#34A853]/20 hover:border-[#34A853]/50",
      date: "November 21-22, 2026",
      mode: "Online Game Jam",
      prizePool: "₹80,000",
      teamSize: "1-5 Members",
      description: "Build robust multiplayer game servers on Agones or Google Cloud databases, ensuring real-time syncing and low-latency matchmaking.",
      ctaText: "Get Notified",
      link: "/auth"
    },
    {
      id: "vertex-2025",
      title: "Vertex AI Agents Hackathon 2025",
      subtitle: "Agentic models for enterprises",
      status: "past",
      badgeText: "Completed",
      badgeColor: "bg-white/5 text-zinc-400 border-white/10",
      accentGlow: "border-white/10 hover:border-white/20 opacity-70 hover:opacity-100",
      date: "December 13-14, 2025",
      mode: "In-Person (Mumbai)",
      prizePool: "₹1,50,000",
      teamSize: "450+ Hackers",
      description: "Participants created 82 functioning GenAI enterprise agents. Top projects integrated automated code remediation and smart analytics agents.",
      ctaText: "View Highlights",
      link: "#"
    },
    {
      id: "run-2025",
      title: "Serverless Speed Run 2025",
      subtitle: "Lightning-fast serverless applications",
      status: "past",
      badgeText: "Completed",
      badgeColor: "bg-white/5 text-zinc-400 border-white/10",
      accentGlow: "border-white/10 hover:border-white/20 opacity-70 hover:opacity-100",
      date: "October 11-12, 2025",
      mode: "Online Event",
      prizePool: "₹1,00,000",
      teamSize: "320+ Hackers",
      description: "54 projects were successfully deployed to Google Cloud Run in under 36 hours. Focused on build performance, lightweight deployments, and auto-scaling.",
      ctaText: "View Highlights",
      link: "#"
    }
  ];

  const filteredHackathons = hackathons.filter(
    (h) => selectedFilter === "all" || h.status === selectedFilter
  );

  const platformFeatures = [
    {
      title: "One-Click Registration",
      description: "Complete your developer profile once. When a new hackathon opens, register for it instantly with single-click profile matching.",
      icon: (
        <svg className="h-6 w-6 text-[#4285F4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
      )
    },
    {
      title: "Mumbai Developer Directory",
      description: "Find co-founders, team leads, or design partners directly in the portal. Search developers by tech stacks (e.g. Next.js, Python, GKE).",
      icon: (
        <svg className="h-6 w-6 text-[#EA4335]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      title: "Sandbox GCP Credits",
      description: "No need for personal credit cards. Registered teams are provisioned sandboxed Google Cloud projects pre-loaded with free developer credits.",
      icon: (
        <svg className="h-6 w-6 text-[#FBBC04]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: "GDG Mentorship Network",
      description: "Get real-time code reviews, deployment support, and system architecture recommendations from Google Developer Experts (GDEs) and mentors.",
      icon: (
        <svg className="h-6 w-6 text-[#34A853]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      )
    }
  ];

  const faqs = [
    {
      q: "How does the portal handle multiple hackathons?",
      a: "The GDG Cloud Mumbai Hackathon Portal acts as a unified system. Once you sign up, you'll have a permanent profile where you can create a team and register for any active hackathon. Your submission history and stats will persist on your dashboard."
    },
    {
      q: "Can I participate in more than one active hackathon?",
      a: "Yes! If two hackathons are scheduled at different times, you can participate in both. You can also customize your team members for each specific registration."
    },
    {
      q: "How do we receive Google Cloud credits?",
      a: "Once your team registers for an active hackathon and the registration is approved, a temporary sandbox Google Cloud environment will be automatically provisioned for your team. Access credentials and free credits will be sent directly to your portal dashboard."
    },
    {
      q: "Can I form a team with developers I don't know yet?",
      a: "Absolutely! The portal has a built-in Developer Matchmaking board on the dashboard. You can list your profile, describe your skills, and search for others looking for teammates for any specific event."
    },
    {
      q: "Is there a limit to how many projects I can submit?",
      a: "You can submit one core project per registered team for each hackathon. However, you can explore multiple tracks and deploy various cloud microservices within your provisioned sandbox project."
    }
  ];

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-[#4285F4] selection:text-white relative overflow-x-hidden">
      {/* Background Glowing Blobs Container */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#4285F4]/10 blur-[120px] animate-pulse-slow" />
        <div className="absolute top-[20%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-[#EA4335]/5 blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[20%] left-[-5%] w-[40vw] h-[40vw] rounded-full bg-[#FBBC04]/5 blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#34A853]/10 blur-[120px] animate-pulse-slow" />
      </div>

      {/* Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f29370f_1px,transparent_1px),linear-gradient(to_bottom,#1f29370f_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b border-white/10 bg-black/60 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            {/* SVG developer brackets logo representing GDG Cloud Mumbai */}
            <svg className="h-7 w-7 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 6L1 12L7 18" stroke="#4285F4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M17 6L23 12L17 18" stroke="#34A853" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 4L10 20" stroke="#EA4335" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="1" fill="#FBBC04" />
            </svg>
            <div className="flex flex-col">
              <span className="font-semibold text-base tracking-tight bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                GDG Cloud Mumbai
              </span>
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#8ab4f8]">
                Hackathon Portal
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <Link href="#events" className="hover:text-white transition">Hackathons</Link>
            <Link href="#features" className="hover:text-white transition">Platform Features</Link>
            <Link href="#about" className="hover:text-white transition">About Portal</Link>
            <Link href="#faqs" className="hover:text-white transition">FAQs</Link>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/auth"
              className="h-10 px-5 rounded-full bg-zinc-900 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white transition text-sm font-medium flex items-center justify-center"
            >
              Portal Login
            </Link>
            <Link
              href="/auth"
              className="h-10 px-5 rounded-full bg-white text-black hover:bg-[#e8eaed] transition text-sm font-semibold flex items-center justify-center shadow-lg shadow-white/5"
            >
              Sign Up Free
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-zinc-400 hover:text-white transition"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-white/10 bg-black/95 px-6 py-6 space-y-6 flex flex-col animate-fadeIn">
            <nav className="flex flex-col gap-4 text-base font-medium text-zinc-400">
              <Link href="#events" onClick={() => setMobileMenuOpen(false)} className="hover:text-white transition">Hackathons</Link>
              <Link href="#features" onClick={() => setMobileMenuOpen(false)} className="hover:text-white transition">Platform Features</Link>
              <Link href="#about" onClick={() => setMobileMenuOpen(false)} className="hover:text-white transition">About Portal</Link>
              <Link href="#faqs" onClick={() => setMobileMenuOpen(false)} className="hover:text-white transition">FAQs</Link>
            </nav>
            <hr className="border-white/10" />
            <div className="flex flex-col gap-3">
              <Link
                href="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="h-11 rounded-xl bg-zinc-900 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white text-center flex items-center justify-center font-medium transition"
              >
                Portal Login
              </Link>
              <Link
                href="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="h-11 rounded-xl bg-white text-black hover:bg-[#e8eaed] text-center flex items-center justify-center font-semibold transition"
              >
                Sign Up Free
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-28 md:pt-28 md:pb-36 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Text Column */}
          <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-xs text-white/70">
              <span className="h-2 w-2 rounded-full bg-[#4285F4] animate-pulse" />
              <span>GDG Cloud Mumbai Hub</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-none bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              One central portal. <br />
              <span className="bg-gradient-to-r from-[#8ab4f8] via-[#aecbfa] to-[#d2e3fc] bg-clip-text text-transparent">Multiple</span> cloud challenges.
            </h1>

            <p className="text-base sm:text-lg text-zinc-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Welcome to the official hackathon portal for GDG Cloud Mumbai. Register once, build teams, access Google Cloud resources, and compete in standard-setting cloud competitions.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
              <Link
                href="/auth"
                className="h-13 px-8 rounded-full bg-white text-black hover:bg-[#e8eaed] text-sm font-semibold flex items-center justify-center transition shadow-xl shadow-white/5"
              >
                Create Account & Join
                <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="#events"
                className="h-13 px-8 rounded-full bg-zinc-900 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white text-sm font-medium flex items-center justify-center transition"
              >
                Browse Active Hackathons
              </Link>
            </div>
          </div>

          {/* Right Interactive Mock Terminal Column */}
          <div className="lg:col-span-5 relative mt-6 lg:mt-0 animate-float">
            {/* Ambient terminal glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#4285F4]/10 via-transparent to-[#34A853]/10 rounded-3xl blur-xl" />

            <div className="relative rounded-3xl border border-white/10 bg-zinc-950/80 shadow-2xl backdrop-blur-sm overflow-hidden">
              {/* Terminal header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-zinc-900/40">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#EA4335]/80" />
                  <span className="h-3 w-3 rounded-full bg-[#FBBC04]/80" />
                  <span className="h-3 w-3 rounded-full bg-[#34A853]/80" />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab("deploy")}
                    className={`text-xs px-2.5 py-1 rounded-md font-mono transition ${activeTab === "deploy" ? "bg-white/10 text-white font-medium" : "text-zinc-500 hover:text-zinc-300"}`}
                  >
                    deploy.sh
                  </button>
                  <button
                    onClick={() => setActiveTab("agent")}
                    className={`text-xs px-2.5 py-1 rounded-md font-mono transition ${activeTab === "agent" ? "bg-white/10 text-white font-medium" : "text-zinc-500 hover:text-zinc-300"}`}
                  >
                    gemini_agent.py
                  </button>
                </div>
              </div>

              {/* Terminal Content */}
              <div className="p-6 font-mono text-xs sm:text-sm text-zinc-300 min-h-[200px] bg-black/60">
                {activeTab === "deploy" ? (
                  <div className="space-y-2.5">
                    <p className="text-zinc-500"># Set target GCP credentials</p>
                    <p className="flex items-center gap-2">
                      <span className="text-zinc-500">$</span>
                      <span>gcloud auth login</span>
                    </p>
                    <p className="text-zinc-500"># Configure cloud project</p>
                    <p className="flex items-center gap-2">
                      <span className="text-zinc-500">$</span>
                      <span>gcloud config set project gdg-mumbai-hub</span>
                    </p>
                    <p className="text-zinc-500"># Deploy container build directly to Cloud Run</p>
                    <p className="flex items-center gap-2">
                      <span className="text-zinc-500">$</span>
                      <span className="text-[#8ab4f8]">gcloud run deploy hackathon-portal --source .</span>
                    </p>
                    <div className="pt-2 text-[#34A853]">
                      <p>✓ Deployment complete!</p>
                      <p className="text-[11px] text-[#81c784] hover:underline cursor-pointer">
                        URL: https://hub-gcm-zla.a.run.app
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <p className="text-[#ff8a80]">from</p>
                    <p className="space-x-2">
                      <span className="text-white">google</span>
                      <span className="text-[#ff8a80]">import</span>
                      <span className="text-[#8ab4f8]">genai</span>
                    </p>
                    <br />
                    <p className="text-zinc-500"># Instantiate developer client</p>
                    <p className="space-x-2">
                      <span className="text-white">client = genai.</span>
                      <span className="text-[#ffd54f]">Client()</span>
                    </p>
                    <p className="text-zinc-500"># Call Gemini 2.5 Flash for code reasoning</p>
                    <p className="text-white">
                      response = client.models.generate_content(
                    </p>
                    <p className="pl-4 text-[#81c784]">
                      model=<span className="text-[#ffd54f]">&apos;gemini-2.5-flash&apos;</span>,
                    </p>
                    <p className="pl-4 text-[#81c784]">
                      contents=<span className="text-[#ffd54f]">&apos;Make a premium hackathon website&apos;</span>
                    </p>
                    <p className="text-white">)</p>
                    <p className="space-x-2">
                      <span className="text-[#ff8a80]">print</span>
                      <span>(response.text)</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Platform Stats Grid */}
      <section id="about" className="py-16 border-t border-white/10 bg-zinc-950/40 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center p-6 border-r border-white/5 last:border-0">
              <h3 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">12+</h3>
              <p className="text-xs font-mono uppercase tracking-widest text-[#8ab4f8] mt-2">Hackathons Hosted</p>
              <p className="text-sm text-zinc-500 mt-1">AI challenges, serverless days, and dev jams</p>
            </div>
            <div className="text-center p-6 border-r border-white/5 last:border-0">
              <h3 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">5,000+</h3>
              <p className="text-xs font-mono uppercase tracking-widest text-[#ff8a80] mt-2">Developers Registered</p>
              <p className="text-sm text-zinc-500 mt-1">Students, experts, and cloud architects in Mumbai</p>
            </div>
            <div className="text-center p-6 border-r border-white/5 last:border-0">
              <h3 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">250+</h3>
              <p className="text-xs font-mono uppercase tracking-widest text-[#ffd54f] mt-2">Projects Deployed</p>
              <p className="text-sm text-zinc-500 mt-1">Scalable apps built entirely on Google Cloud</p>
            </div>
            <div className="text-center p-6 last:border-0">
              <h3 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">₹25L+</h3>
              <p className="text-xs font-mono uppercase tracking-widest text-[#81c784] mt-2">Prizes Distributed</p>
              <p className="text-sm text-zinc-500 mt-1">Cash pools, cloud credits, devices & cool swag</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Hackathons Hub section */}
      <section id="events" className="py-24 border-t border-white/10 relative">
        <div className="max-w-7xl mx-auto px-6">
          
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div className="space-y-4 max-w-xl">
              <h2 className="text-xs font-mono uppercase tracking-widest text-[#8ab4f8]">Hackathon Hub</h2>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-white">Browse Competitions</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Filter and view current active hackathons you can register for, upcoming events on our timeline, and past achievements.
              </p>
            </div>

            {/* Client-side filter controls */}
            <div className="flex flex-wrap gap-2 bg-zinc-950 p-1.5 rounded-xl border border-white/10 self-start">
              {(["all", "active", "upcoming", "past"] as HackathonFilter[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedFilter(tab)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                    selectedFilter === tab
                      ? "bg-white text-black"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {tab === "all" ? "All Events" : `${tab} events`}
                </button>
              ))}
            </div>
          </div>

          {/* Grid of Hackathons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredHackathons.map((hackathon) => (
              <div
                key={hackathon.id}
                className={`group rounded-3xl border ${hackathon.accentGlow} bg-zinc-950 p-8 shadow-xl transition-all duration-300 hover:translate-y-[-4px] flex flex-col justify-between`}
              >
                <div className="space-y-6">
                  {/* Status header */}
                  <div className="flex items-center justify-between">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${hackathon.badgeColor}`}>
                      {hackathon.badgeText}
                    </span>
                    <span className="text-xs font-mono text-zinc-500">{hackathon.date}</span>
                  </div>

                  {/* Text details */}
                  <div className="space-y-2">
                    <h4 className="text-xl font-bold text-white group-hover:text-zinc-200 transition">
                      {hackathon.title}
                    </h4>
                    <p className="text-xs font-mono text-[#8ab4f8]">
                      {hackathon.subtitle}
                    </p>
                    <p className="text-sm text-zinc-400 leading-relaxed pt-2">
                      {hackathon.description}
                    </p>
                  </div>

                  {/* Specifications */}
                  <div className="grid grid-cols-3 gap-2 py-4 border-y border-white/5 text-xs text-zinc-300">
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-mono">Prize Pool</p>
                      <p className="font-semibold text-white mt-0.5">{hackathon.prizePool}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-mono">Format</p>
                      <p className="font-semibold text-white mt-0.5 truncate">{hackathon.mode.split(" ")[0]}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-mono">Team Limit</p>
                      <p className="font-semibold text-white mt-0.5">{hackathon.teamSize}</p>
                    </div>
                  </div>
                </div>

                {/* Bottom CTA */}
                <div className="pt-6 flex justify-end">
                  <Link
                    href={hackathon.link}
                    className={`inline-flex items-center text-xs font-semibold px-4 py-2.5 rounded-full transition gap-1 ${
                      hackathon.status === "active"
                        ? "bg-white text-black hover:bg-[#e8eaed]"
                        : hackathon.status === "upcoming"
                        ? "bg-zinc-900 text-zinc-300 border border-white/10 hover:border-white/20 hover:text-white"
                        : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {hackathon.ctaText}
                    <svg className="h-3 w-3 transform transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            ))}

            {filteredHackathons.length === 0 && (
              <div className="col-span-2 text-center py-16 border border-dashed border-white/10 rounded-3xl bg-zinc-950/40">
                <p className="text-zinc-500 text-sm">No hackathons found matching this filter.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Platform Features Section */}
      <section id="features" className="py-24 border-t border-white/10 bg-zinc-950/20 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center space-y-4 max-w-2xl mx-auto mb-20">
            <h2 className="text-xs font-mono uppercase tracking-widest text-[#ff8a80]">Unified Portal</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white">Engineered for builders.</h3>
            <p className="text-sm sm:text-base text-zinc-400">
              Unlike typical platforms, the GDG Cloud Mumbai portal provides deep cloud integrations and local resources to enhance your hacking experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {platformFeatures.map((feat, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl border border-white/[0.06] bg-zinc-950 hover:bg-zinc-900/60 transition duration-300 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="h-10 w-10 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-center">
                    {feat.icon}
                  </div>
                  <h4 className="text-base font-bold text-white">{feat.title}</h4>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">{feat.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portal FAQs Section */}
      <section id="faqs" className="py-24 border-t border-white/10 bg-zinc-950/40 relative">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-xs font-mono uppercase tracking-widest text-[#81c784]">Help Center</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white">Portal FAQs</h3>
            <p className="text-sm sm:text-base text-zinc-400">
              Got questions about team registration, cloud sandboxes, or submissions? We&apos;ve got answers.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;

              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-white/10 bg-zinc-950 overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left font-semibold text-white hover:bg-white/[0.02] transition"
                  >
                    <span className="text-sm sm:text-base">{faq.q}</span>
                    <svg
                      className={`h-5 w-5 text-zinc-400 transition-transform duration-300 shrink-0 ml-4 ${isOpen ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  <div
                    className={`transition-all duration-300 ease-in-out ${isOpen ? "max-h-[200px] opacity-100 border-t border-white/5" : "max-h-0 opacity-0 pointer-events-none"}`}
                  >
                    <p className="px-6 py-5 text-xs sm:text-sm text-zinc-400 leading-relaxed">
                      {faq.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final Call to Action Portal Promotion */}
      <section className="py-24 border-t border-white/10 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[40vw] rounded-full bg-[#4285F4]/5 blur-[120px] pointer-events-none" />

        <div className="max-w-4xl mx-auto px-6 text-center space-y-8 relative">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
            <div className="grid rotate-45 grid-cols-2 gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#4285F4]" />
              <span className="h-2 w-2 rounded-full bg-[#EA4335]" />
              <span className="h-2 w-2 rounded-full bg-[#FBBC04]" />
              <span className="h-2 w-2 rounded-full bg-[#34A853]" />
            </div>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Ready to deploy your next big idea?<br />
            Sign up for the portal today.
          </h2>
          
          <p className="text-sm sm:text-base text-zinc-400 max-w-lg mx-auto">
            Get instant access to team matchmaking, Google Cloud sandboxes, and register for any upcoming Mumbai hackathon.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth"
              className="h-12 px-8 rounded-full bg-white text-black hover:bg-[#e8eaed] text-sm font-semibold flex items-center justify-center transition shadow-lg shadow-white/5"
            >
              Sign Up Free
            </Link>
            <Link
              href="/auth"
              className="h-12 px-8 rounded-full bg-zinc-900 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white text-sm font-medium flex items-center justify-center transition"
            >
              Portal Login
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-zinc-500">
          <div className="flex items-center gap-3">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 6L1 12L7 18" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
              <path d="M17 6L23 12L17 18" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
              <path d="M14 4L10 20" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
            </svg>
            <span>© 2026 GDG Cloud Mumbai Portal. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-8">
            <a href="https://gdg.community.dev/gdg-cloud-mumbai/" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition">GDG Community</a>
            <a href="#" className="hover:text-zinc-300 transition">Code of Conduct</a>
            <a href="#" className="hover:text-zinc-300 transition">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
