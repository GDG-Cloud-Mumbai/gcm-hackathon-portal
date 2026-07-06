import type { Hackathon } from "./types";

export const DUMMY_HACKATHONS: Hackathon[] = [
  {
    hackathon_uuid: "01960000-0000-7000-8000-000000000001",
    name: "Cloud Community Hackathon 2026",
    tagline: "Build the future on Google Cloud",
    description:
      "A 24-hour hackathon for developers, designers, and innovators to build cloud-native solutions that solve real-world problems using Google Cloud technologies.",
    status: "active",
    starts_at: "2026-07-05T09:00:00Z",
    ends_at: "2026-07-06T09:00:00Z",
    registration_open: true,
    min_team_size: 1,
    max_team_size: 3,
    tracks: [
      {
        track_uuid: "01960000-0001-7000-8000-000000000001",
        name: "Cloud Infrastructure",
      },
      {
        track_uuid: "01960000-0001-7000-8000-000000000002",
        name: "AI & Machine Learning",
      },
    ],
  },
  {
    hackathon_uuid: "01960000-0000-7000-8000-000000000002",
    name: "AI Innovation Sprint",
    tagline: "Accelerate ideas with artificial intelligence",
    description:
      "A focused 48-hour sprint to build AI-powered applications using cutting-edge models, tools, and APIs. Open to all experience levels.",
    status: "upcoming",
    starts_at: "2026-08-15T10:00:00Z",
    ends_at: "2026-08-17T10:00:00Z",
    registration_open: true,
    min_team_size: 1,
    max_team_size: 3,
    tracks: [
      {
        track_uuid: "01960000-0002-7000-8000-000000000001",
        name: "Generative AI",
      },
      {
        track_uuid: "01960000-0002-7000-8000-000000000002",
        name: "Computer Vision",
      },
      {
        track_uuid: "01960000-0002-7000-8000-000000000003",
        name: "Natural Language Processing",
      },
    ],
  },
  {
    hackathon_uuid: "01960000-0000-7000-8000-000000000003",
    name: "Web Development Challenge",
    tagline: "Ship beautiful, fast, accessible web experiences",
    description:
      "A weekend hackathon focused on building polished web applications with modern tooling. Emphasis on performance, accessibility, and great UX.",
    status: "upcoming",
    starts_at: "2026-09-20T09:00:00Z",
    ends_at: "2026-09-21T21:00:00Z",
    registration_open: false,
    min_team_size: 1,
    max_team_size: 3,
    tracks: [
      {
        track_uuid: "01960000-0003-7000-8000-000000000001",
        name: "Frontend & Design",
      },
      {
        track_uuid: "01960000-0003-7000-8000-000000000002",
        name: "Full Stack",
      },
    ],
  },
];
