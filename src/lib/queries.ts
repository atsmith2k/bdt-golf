import { cache } from "react";
import { createServerSupabaseClient } from "./supabase/server";
import type {
  Announcement,
  LeagueConfig,
  MatchParticipant,
  MatchSummary,
  PlayerSeasonStats,
  TeamSeasonStats,
  TeamSummary,
  TimelineEvent,
  UserProfile,
  OTPInvite,
} from "./types";

type SeasonRow = {
  id: string;
  name: string;
  year?: number;
  start_date: string;
  end_date?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

type TeamRow = {
  id: string;
  name: string;
  slug?: string | null;
  color?: string | null;
  season_id: string;
  created_at?: string;
  updated_at?: string;
};

type UserRow = {
  id: string;
  username: string;
  display_name: string;
  email?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  handicap?: number | null;
  phone?: string | null;
  role: string;
  team_id?: string | null;
  created_at?: string;
  updated_at?: string;
  last_login_at?: string | null;
};

type MatchRow = {
  id: string;
  season_id: string;
  match_date: string;
  match_type: string;
  course?: string | null;
  notes?: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
  timeline_event_id?: string | null;
  match_participants?: MatchParticipantRow[];
};

type MatchParticipantRow = {
  id: string;
  match_id: string;
  user_id: string;
  team_id?: string | null;
  points_awarded?: number | null;
  strokes?: number | null;
  position?: number | null;
  created_at?: string;
  updated_at?: string;
  users?: UserRow;
};

type TimelineEventRow = {
  id: string;
  event_type: string;
  season_id?: string | null;
  payload?: Record<string, unknown> | null;
  created_at: string;
  created_by?: string | null;
  match_id?: string | null;
  announcement_id?: string | null;
};

type AnnouncementRow = {
  id: string;
  season_id: string;
  author_id: string;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
  updated_at?: string;
};

type OTPInviteRow = {
  id: string;
  username: string;
  email?: string | null;
  otp: string;
  expires_at: string;
  used?: boolean | null;
  consumed_at?: string | null;
  created_by: string;
  created_at: string;
};

const getSupabase = cache(() => createServerSupabaseClient());

export const getActiveSeason = cache(async (): Promise<SeasonRow | null> => {
  const supabase = getSupabase();
  const { data: activeSeasonData, error } = await supabase
    .from("seasons")
    .select("*")
    .eq("is_active", true)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[queries] active season fetch failed", error);
    throw new Error("Unable to load active season.");
  }

  const activeSeason = activeSeasonData as SeasonRow | null;

  if (activeSeason) {
    return activeSeason;
  }

  const { data: fallbackData } = await supabase
    .from("seasons")
    .select("*")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (fallbackData as SeasonRow | null) ?? null;
});

function mapUser(row: UserRow): UserProfile {
  return {
    id: row.id,
    username: row.username,
    email: row.email ?? undefined,
    fullName: row.display_name || row.username,
    avatarUrl: row.avatar_url ?? undefined,
    bio: row.bio ?? undefined,
    handicapIndex: row.handicap ?? undefined,
    phone: row.phone ?? undefined,
    role: row.role as UserProfile["role"],
    teamId: row.team_id ?? undefined,
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? row.created_at ?? "",
    lastLoginAt: row.last_login_at ?? undefined,
  };
}

function calculateLeagueStats({
  season,
  teams,
  users,
  matches,
}: {
  season: SeasonRow;
  teams: TeamRow[];
  users: UserRow[];
  matches: MatchRow[];
}) {
  const userMap = new Map<string, UserProfile>();
  users.forEach((user) => {
    userMap.set(user.id, mapUser(user));
  });

  const teamMap = new Map<string, TeamSummary>();
  teams.forEach((team) => {
    teamMap.set(team.id, {
      id: team.id,
      seasonId: team.season_id,
      name: team.name,
      slug: team.slug ?? team.name.toLowerCase().replace(/\s+/g, "-"),
      color: team.color ?? undefined,
      points: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      createdAt: team.created_at ?? "",
      updatedAt: team.updated_at ?? team.created_at ?? "",
    });
  });

  const playerStatsMap = new Map<string, PlayerSeasonStats & { formPoints: { value: number; playedOn: string }[] }>();
  const teamStatsMap = new Map<string, TeamSeasonStats>();

  const matchSummaries: MatchSummary[] = matches.map((match) => {
    const participants: MatchParticipant[] = (match.match_participants ?? []).map((participant) => {
      const user = participant.users ? mapUser(participant.users) : userMap.get(participant.user_id);
      if (user) {
        userMap.set(user.id, user);
      }
      return {
        id: participant.id,
        matchId: participant.match_id,
        userId: participant.user_id,
        teamId: participant.team_id ?? undefined,
        pointsAwarded: participant.points_awarded ?? 0,
        strokes: participant.strokes ?? undefined,
        position: participant.position ?? undefined,
        isWinner: false,
        createdAt: participant.created_at ?? match.created_at ?? match.match_date,
        updatedAt: participant.updated_at ?? participant.created_at ?? match.match_date,
        user,
      };
    });

    const teamPoints = new Map<string, number>();
    participants.forEach((participant) => {
      if (!participant.teamId) {
        return;
      }
      teamPoints.set(
        participant.teamId,
        (teamPoints.get(participant.teamId) ?? 0) + participant.pointsAwarded,
      );
    });

    const teamEntries = Array.from(teamPoints.entries());
    const maxPoints = teamEntries.length > 0 ? Math.max(...teamEntries.map((entry) => entry[1])) : 0;
    const winningTeamIds = new Set(
      teamEntries.filter(([, total]) => total === maxPoints).map(([teamId]) => teamId),
    );
    const isTie = winningTeamIds.size > 1;

    const totalPoints = teamEntries.reduce((sum, [, total]) => sum + total, 0);

    participants.forEach((participant) => {
      if (!participant.teamId) return;
      participant.isWinner = !isTie && winningTeamIds.has(participant.teamId);
    });

    teamEntries.forEach(([teamId, total]) => {
      const existingTeam = teamMap.get(teamId);
      if (!existingTeam) return;
      existingTeam.points += total;

      const teamStats =
        teamStatsMap.get(teamId) ??
        {
          teamId,
          seasonId: season.id,
          matchesPlayed: 0,
          pointsTotal: 0,
          pointsPerMatch: 0,
          wins: 0,
          losses: 0,
          ties: 0,
        };

      teamStats.matchesPlayed += 1;
      teamStats.pointsTotal += total;
      if (isTie) {
        teamStats.ties += 1;
      } else if (winningTeamIds.has(teamId)) {
        teamStats.wins += 1;
      } else {
        teamStats.losses += 1;
      }
      teamStats.pointsPerMatch = teamStats.pointsTotal / teamStats.matchesPlayed;
      teamStatsMap.set(teamId, teamStats);
    });

    participants.forEach((participant) => {
      const stats =
        playerStatsMap.get(participant.userId) ??
        {
          userId: participant.userId,
          seasonId: season.id,
          matchesPlayed: 0,
          pointsTotal: 0,
          pointsPerMatch: 0,
          wins: 0,
          losses: 0,
          ties: 0,
          form: [],
          formPoints: [],
        };

      stats.matchesPlayed += 1;
      stats.pointsTotal += participant.pointsAwarded;
      stats.pointsPerMatch = stats.pointsTotal / stats.matchesPlayed;
      if (participant.isWinner) {
        stats.wins += 1;
      } else if (isTie) {
        stats.ties += 1;
      } else {
        stats.losses += 1;
      }
      stats.formPoints.push({
        value: participant.pointsAwarded,
        playedOn: match.match_date,
      });

      playerStatsMap.set(participant.userId, stats);
    });

    return {
      id: match.id,
      playedOn: match.match_date,
      format: match.match_type as MatchSummary["format"],
      status: match.status as MatchSummary["status"],
      courseName: match.course ?? undefined,
      totalPoints,
      participatingTeams: teamEntries
        .map(([teamId]) => teamMap.get(teamId))
        .filter((team): team is TeamSummary => Boolean(team)),
      participants,
    };
  });

  const playerStats: PlayerSeasonStats[] = Array.from(playerStatsMap.values()).map((stats) => {
    const sortedForm = stats.formPoints
      .sort((a, b) => new Date(b.playedOn).getTime() - new Date(a.playedOn).getTime())
      .slice(0, 5)
      .map((item) => item.value);
    return {
      userId: stats.userId,
      seasonId: stats.seasonId,
      matchesPlayed: stats.matchesPlayed,
      pointsTotal: stats.pointsTotal,
      pointsPerMatch: stats.pointsPerMatch,
      wins: stats.wins,
      losses: stats.losses,
      ties: stats.ties,
      form: sortedForm,
    };
  });

  const teamStats: TeamSeasonStats[] = Array.from(teamStatsMap.values());

  teamStats.forEach((stats) => {
    stats.pointsPerMatch = stats.matchesPlayed > 0 ? stats.pointsTotal / stats.matchesPlayed : 0;
    const summary = teamMap.get(stats.teamId);
    if (summary) {
      summary.wins = stats.wins;
      summary.losses = stats.losses;
      summary.ties = stats.ties;
      summary.points = stats.pointsTotal;
    }
  });

  return {
    users: Array.from(userMap.values()),
    teams: Array.from(teamMap.values()),
    matches: matchSummaries,
    playerStats,
    teamStats,
  };
}

function mapTimeline(event: TimelineEventRow): TimelineEvent {
  return {
    id: event.id,
    type: event.event_type as TimelineEvent["type"],
    seasonId: event.season_id ?? "",
    createdAt: event.created_at,
    payload: event.payload ?? {},
    matchId: event.match_id ?? undefined,
    announcementId: event.announcement_id ?? undefined,
  };
}

function mapAnnouncement(row: AnnouncementRow): Announcement {
  return {
    id: row.id,
    seasonId: row.season_id,
    authorId: row.author_id,
    title: row.title,
    body: row.body,
    pinned: row.pinned,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

export const getLeagueConfig = cache(async (): Promise<LeagueConfig> => {
  const supabase = getSupabase();
  const season = await getActiveSeason();

  if (!season) {
    throw new Error("No season configured. Create a season in Supabase first.");
  }

  const [
    { data: teamsData, error: teamsError },
    { data: usersData, error: usersError },
    { data: matchesData, error: matchesError },
    { data: timelineData, error: timelineError },
    { data: announcementsData, error: announcementsError },
  ] = await Promise.all([
    supabase
      .from("teams")
      .select("*")
      .eq("season_id", season.id),
    supabase.from("users").select("*"),
    supabase
      .from("matches")
      .select(
        `
        *,
        match_participants (
          *,
          users (*)
        )
        `,
      )
      .eq("season_id", season.id)
      .order("match_date", { ascending: false }),
    supabase
      .from("timeline_events")
      .select("*")
      .eq("season_id", season.id)
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("announcements")
      .select("*")
      .eq("season_id", season.id)
      .order("created_at", { ascending: false }),
  ]);

  if (teamsError) {
    console.error("[queries] teams error", teamsError);
    throw new Error("Unable to load teams.");
  }
  if (usersError) {
    console.error("[queries] users error", usersError);
    throw new Error("Unable to load users.");
  }
  if (matchesError) {
    console.error("[queries] matches error", matchesError);
    throw new Error("Unable to load matches.");
  }
  if (timelineError) {
    console.error("[queries] timeline error", timelineError);
  }
  if (announcementsError) {
    console.error("[queries] announcements error", announcementsError);
  }

  const teamsRows = (teamsData ?? []) as TeamRow[];
  const userRows = (usersData ?? []) as UserRow[];
  const matchRows = (matchesData ?? []) as MatchRow[];
  const timelineRows = (timelineData ?? []) as TimelineEventRow[];
  const announcementRows = (announcementsData ?? []) as AnnouncementRow[];

  const derived = calculateLeagueStats({
    season,
    teams: teamsRows,
    users: userRows,
    matches: matchRows,
  });

  return {
    seasons: [
      {
        id: season.id,
        name: season.name,
        year: season.year ?? new Date(season.start_date).getFullYear(),
        isActive: season.is_active,
        startDate: season.start_date,
        endDate: season.end_date ?? undefined,
        createdAt: season.created_at ?? season.start_date,
        updatedAt: season.updated_at ?? season.start_date,
      },
    ],
    activeSeasonId: season.id,
    teams: derived.teams,
    players: derived.users,
    matches: derived.matches,
    playerStats: derived.playerStats,
    teamStats: derived.teamStats,
    timeline: timelineRows.map(mapTimeline),
    announcements: announcementRows.map(mapAnnouncement),
  };
});

export async function getOtpInvites(): Promise<OTPInvite[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("one_time_passwords")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[queries] invites error", error);
    throw new Error("Unable to load OTP invites.");
  }

  const inviteRows = (data ?? []) as OTPInviteRow[];

  return inviteRows.map((row) => ({
    id: row.id,
    username: row.username,
    email: row.email ?? undefined,
    code: row.otp,
    expiresAt: row.expires_at,
    consumedAt: row.consumed_at ?? undefined,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }));
}

export async function getUserProfile() {
  const supabase = getSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("[queries] auth user error", error);
    throw new Error("Unable to load authenticated user.");
  }

  if (!user) {
    return null;
  }

  const { data, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[queries] profile fetch error", profileError);
    throw new Error("Unable to load user profile.");
  }

  const profileRow = data as UserRow | null;

  return profileRow ? mapUser(profileRow) : null;
}
