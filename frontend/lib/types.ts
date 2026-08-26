// Derived directly from the FastAPI backend models.

export type GlobalRole = {
  name: "user" | "admin" | "superadmin";
};

export type AuthUser = {
  uuid: string;
  email: string;
  username: string | null;
  name: string;
  global_role: GlobalRole;
  created_at: string | null;
  last_login_at: string | null;
};

export type TeamMember = {
  uuid: string;
  username: string | null;
  name: string;
  is_leader: boolean;
};

export type MyTeam = {
  team_uuid: string;
  team_name: string;
  team_code: string;
  hackathon_uuid: string;
  track_uuid: string;
  is_leader: boolean;
  members: TeamMember[];
};

export type JoinRequestUser = {
  uuid: string;
  username: string | null;
  name: string;
};

export type JoinRequest = {
  request_id: string;
  user: JoinRequestUser;
  status: string;
  created_at: string | null;
};

export type Invitation = {
  invitation_id: string;
  team_uuid: string;
  team_name: string;
  status: string;
  created_at: string | null;
};

export type CreateTeamPayload = {
  hackathon_uuid: string;
  track_uuid: string;
  name: string;
  description: string;
  is_public: boolean;
  required_skills: string[];
};

export type TeamResponse = {
  uuid: string;
  name: string;
  team_code: string;
};

export type JoinTeamPayload = {
  team_code?: string;
};

export type InvitePayload = {
  user_uuid: string;
};

export type TransferLeadershipPayload = {
  member_uuid: string;
};

export type RemoveMemberPayload = {
  member_uuid: string;
};

export type Track = {
  track_uuid: string;
  name: string;
};

export type HackathonStatus = "upcoming" | "active" | "ended";

export type Hackathon = {
  hackathon_uuid: string;
  name: string;
  tagline: string;
  description: string;
  backend_status?: string;
  status: HackathonStatus;
  starts_at: string;
  ends_at: string;
  registration_start?: string;
  registration_end?: string;
  registration_open: boolean;
  max_team_size: number;
  min_team_size: number;
  tracks: Track[];
};

export type ParticipantSearchResult = {
  uuid: string;
  name: string;
  username: string | null;
  email: string;
};
