// Domain model definitions for the BDT Golf League application.
// These mirror the implementation plan and keep frontend + backend contracts in sync.

export type Role = "player" | "commissioner";

export type MatchStatus = "scheduled" | "submitted" | "validated" | "voided";

export type MatchVisibility = "private" | "public";

export type MatchFormat =
  | "stroke_play"
  | "match_play"
  | "skins"
  | "scramble"
  | "best_ball"
  | "alternate_shot";

export type TimelineEventType =
  | "match_result"
  | "announcement"
  | "season_event"
  | "system";

export interface Season {
  id: string;
  name: string;
  year: number;
  isActive: boolean;
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamSummary {
  id: string;
  seasonId: string;
  name: string;
  slug: string;
  color?: string;
  points: number;
  wins: number;
  losses: number;
  ties: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  fullName: string;
  avatarUrl?: string;
  bio?: string;
  handicapIndex?: number;
  phone?: string;
  role: Role;
  teamId?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface MatchParticipant {
  id: string;
  matchId: string;
  userId: string;
  teamId?: string;
  pointsAwarded: number;
  strokes?: number;
  position?: number;
  isWinner: boolean;
  createdAt: string;
  updatedAt: string;
  user?: UserProfile;
}

export interface Match {
  id: string;
  seasonId: string;
  playedOn: string;
  reportedBy: string;
  format: MatchFormat;
  status: MatchStatus;
  visibility: MatchVisibility;
  courseName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  participants: MatchParticipant[];
  timelineEventId?: string;
}

export interface MatchSummary {
  id: string;
  seasonId: string;
  playedOn: string;
  format: MatchFormat;
  status: MatchStatus;
  courseName?: string;
  notes?: string;
  totalPoints: number;
  participatingTeams: TeamSummary[];
  participants: MatchParticipant[];
}

export interface Announcement {
  id: string;
  seasonId: string;
  authorId: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  seasonId: string;
  createdAt: string;
  payload: Record<string, unknown>;
  matchId?: string;
  announcementId?: string;
}

export interface PlayerSeasonStats {
  userId: string;
  seasonId: string;
  matchesPlayed: number;
  pointsTotal: number;
  pointsPerMatch: number;
  wins: number;
  losses: number;
  ties: number;
  form: number[];
}

export interface TeamSeasonStats {
  teamId: string;
  seasonId: string;
  matchesPlayed: number;
  pointsTotal: number;
  pointsPerMatch: number;
  wins: number;
  losses: number;
  ties: number;
  streak?: string;
}

export interface OTPInvite {
  id: string;
  userId: string;
  username: string;
  email?: string;
  code: string;
  expiresAt: string;
  consumedAt?: string;
  createdBy: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorId?: string;
  actorName?: string;
  eventType: string;
  entityType: string;
  entityId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface LeagueConfig {
  seasons: Season[];
  activeSeasonId: string | null;
  timeline: TimelineEvent[];
  teams: TeamSummary[];
  players: UserProfile[];
  matches: MatchSummary[];
  playerStats: PlayerSeasonStats[];
  teamStats: TeamSeasonStats[];
  announcements: Announcement[];
}

export interface NavItem {
  title: string;
  href: string;
  icon?: string;
  requiresCommissioner?: boolean;
}
