import { cache } from "react";
import { createServerSupabaseClient } from "./supabase/server";
import { mapOtpInvite, type OtpInviteRow } from "./invites";
import { mapAuditLog, type AuditLogRow } from "./audit";
import type {
  Announcement,
  LeagueConfig,
  MatchDetail,
  MatchParticipant,
  MatchReporter,
  MatchSummary,
  PlayerSeasonStats,
  Season,
  TeamSeasonStats,
  TeamSummary,
  TimelineEvent,
  UserProfile,
  OTPInvite,
  AuditLogEntry,
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
  ghin?: string | null;
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
  visibility?: string | null;
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

const getSupabase = cache(() => createServerSupabaseClient());

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

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
    return null;
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
    ghin: row.ghin ?? undefined,
    handicapIndex: row.handicap ?? undefined,
    phone: row.phone ?? undefined,
    role: row.role as UserProfile["role"],
    teamId: row.team_id ?? undefined,
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? row.created_at ?? "",
    lastLoginAt: row.last_login_at ?? undefined,
  };
}

function mapSeasonRow(row: SeasonRow): Season {
  const start = row.start_date ? new Date(row.start_date) : new Date();
  return {
    id: row.id,
    name: row.name,
    year: row.year ?? start.getFullYear(),
    isActive: row.is_active,
    startDate: row.start_date,
    endDate: row.end_date ?? undefined,
    createdAt: row.created_at ?? row.start_date,
    updatedAt: row.updated_at ?? row.start_date,
  };
}

function createBaseTeamSummary(row: TeamRow): TeamSummary {
  return {
    id: row.id,
    seasonId: row.season_id,
    name: row.name,
    slug: row.slug ?? row.name.toLowerCase().replace(/\s+/g, "-"),
    color: row.color ?? undefined,
    points: 0,
    wins: 0,
    losses: 0,
    ties: 0,
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? row.created_at ?? "",
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
      seasonId: match.season_id,
      playedOn: match.match_date,
      format: match.match_type as MatchSummary["format"],
      status: match.status as MatchSummary["status"],
      courseName: match.course ?? undefined,
      notes: match.notes ?? undefined,
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

  const [activeSeasonRow, { data: seasonsData, error: seasonsError }, { data: usersData, error: usersError }] =
    await Promise.all([
      getActiveSeason(),
      supabase.from("seasons").select("*").order("start_date", { ascending: false }),
      supabase.from("users").select("*"),
    ]);

  if (seasonsError) {
    console.error("[queries] seasons error", seasonsError);
  }
  if (usersError) {
    console.error("[queries] users error", usersError);
  }

  const seasonsRows = (seasonsData ?? []) as SeasonRow[];
  const seasons = seasonsRows.map(mapSeasonRow);
  const activeSeason = activeSeasonRow ?? seasonsRows[0] ?? null;
  const userRows = (usersData ?? []) as UserRow[];

  if (!activeSeason) {
    return {
      seasons,
      activeSeasonId: null,
      teams: [],
      players: userRows.map(mapUser),
      matches: [],
      playerStats: [],
      teamStats: [],
      timeline: [],
      announcements: [],
    };
  }

  const [
    { data: teamsData, error: teamsError },
    { data: matchesData, error: matchesError },
    { data: timelineData, error: timelineError },
    { data: announcementsData, error: announcementsError },
  ] = await Promise.all([
    supabase.from("teams").select("*").eq("season_id", activeSeason.id),
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
      .eq("season_id", activeSeason.id)
      .order("match_date", { ascending: false }),
    supabase
      .from("timeline_events")
      .select("*")
      .eq("season_id", activeSeason.id)
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("announcements")
      .select("*")
      .eq("season_id", activeSeason.id)
      .order("created_at", { ascending: false }),
  ]);

  if (teamsError) {
    console.error("[queries] teams error", teamsError);
  }
  if (matchesError) {
    console.error("[queries] matches error", matchesError);
  }
  if (timelineError) {
    console.error("[queries] timeline error", timelineError);
  }
  if (announcementsError) {
    console.error("[queries] announcements error", announcementsError);
  }

  const teamsRows = (teamsData ?? []) as TeamRow[];
  const matchRows = (matchesData ?? []) as MatchRow[];
  const timelineRows = (timelineData ?? []) as TimelineEventRow[];
  const announcementRows = (announcementsData ?? []) as AnnouncementRow[];

  // Normalize avatar URLs: if a user avatar_url looks like a storage path, create a signed URL for server-side rendering.
  try {
    await Promise.all(
      userRows.map(async (u) => {
        if (!u.avatar_url) return;
        const looksLikePath = !/^https?:\/\//i.test(u.avatar_url);
        if (!looksLikePath) return;
        try {
          const { data: signed, error: signErr } = await supabase.storage.from("avatars").createSignedUrl(u.avatar_url, 60 * 60);
          if (!signErr && signed?.signedUrl) {
            u.avatar_url = signed.signedUrl;
          }
        } catch {
          // ignore
        }
      }),
    );
  } catch (err) {
    // ignore
  }

  const baseTeams = teamsRows.map(createBaseTeamSummary);
  const derived = calculateLeagueStats({
    season: activeSeason,
    teams: teamsRows,
    users: userRows,
    matches: matchRows,
  });

  const mergedTeamsMap = new Map<string, TeamSummary>();
  baseTeams.forEach((team) => mergedTeamsMap.set(team.id, team));
  derived.teams.forEach((team) => mergedTeamsMap.set(team.id, team));

  return {
    seasons,
    activeSeasonId: activeSeason.id,
    teams: Array.from(mergedTeamsMap.values()),
    players: derived.users,
    matches: derived.matches,
    playerStats: derived.playerStats,
    teamStats: derived.teamStats,
    timeline: timelineRows.map(mapTimeline),
    announcements: announcementRows.map(mapAnnouncement),
  };
});

export async function getMatchDetail(matchId: string): Promise<MatchDetail | null> {
  if (!matchId) {
    return null;
  }

  const supabase = getSupabase();
  const activeSeason = await getActiveSeason();
  if (!activeSeason) {
    return null;
  }

  const { data: matchData, error: matchError } = await supabase
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
    .eq("id", matchId)
    .eq("season_id", activeSeason.id)
    .maybeSingle();

  if (matchError) {
    console.error("[queries] match detail fetch error", matchError);
    return null;
  }

  if (!matchData) {
    return null;
  }

  const matchRow = matchData as MatchRow;
  const participantRows = (matchRow.match_participants ?? []) as MatchParticipantRow[];

  const participants: MatchParticipant[] = participantRows.map((participant) => {
    const pointsAwarded = toNumber(participant.points_awarded);
    const strokesValue =
      participant.strokes === null || participant.strokes === undefined ? undefined : toNumber(participant.strokes);
    const positionValue =
      participant.position === null || participant.position === undefined
        ? undefined
        : Number(participant.position);
    const position = positionValue !== undefined && Number.isFinite(positionValue) ? positionValue : undefined;
    const user = participant.users ? mapUser(participant.users as UserRow) : undefined;

    return {
      id: participant.id,
      matchId: participant.match_id,
      userId: participant.user_id,
      teamId: participant.team_id ?? undefined,
      pointsAwarded,
      strokes: strokesValue,
      position,
      isWinner: false,
      createdAt: participant.created_at ?? matchRow.match_date,
      updatedAt: participant.updated_at ?? participant.created_at ?? matchRow.match_date,
      user,
    };
  });

  const teamIds = Array.from(
    new Set(
      participants
        .map((participant) => participant.teamId)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  let teamLookup = new Map<string, TeamSummary>();
  if (teamIds.length > 0) {
    const { data: teamData, error: teamError } = await supabase.from("teams").select("*").in("id", teamIds);
    if (teamError) {
      console.error("[queries] match detail team fetch error", teamError);
    } else {
      const summaries = (teamData ?? []) as TeamRow[];
      teamLookup = new Map(
        summaries.map((row) => {
          const summary = createBaseTeamSummary(row);
          return [summary.id, summary];
        }),
      );
    }
  }

  const teamPoints = new Map<string, number>();
  participants.forEach((participant) => {
    if (!participant.teamId) {
      return;
    }
    const current = teamPoints.get(participant.teamId) ?? 0;
    teamPoints.set(participant.teamId, current + participant.pointsAwarded);
  });

  const teamEntries = Array.from(teamPoints.entries());
  const maxPoints = teamEntries.length > 0 ? Math.max(...teamEntries.map(([, total]) => total)) : 0;
  const winningTeamIds = new Set(
    teamEntries
      .filter(([, total]) => total === maxPoints)
      .map(([teamId]) => teamId),
  );
  const isTie = winningTeamIds.size > 1;

  participants.forEach((participant) => {
    if (!participant.teamId) {
      participant.isWinner = false;
      return;
    }
    participant.isWinner = !isTie && winningTeamIds.has(participant.teamId);
  });

  const teamResults = teamEntries
    .map(([teamId, points]) => {
      const summary = teamLookup.get(teamId);
      return {
        teamId,
        name: summary?.name ?? "Unknown team",
        slug: summary?.slug,
        color: summary?.color,
        points,
        isWinner: !isTie && winningTeamIds.has(teamId),
      };
    })
    .sort((a, b) => b.points - a.points);

  const totalPoints = participants.reduce((sum, participant) => sum + participant.pointsAwarded, 0);

  const [{ data: timelineData, error: timelineError }, { data: auditData, error: auditError }] = await Promise.all([
    supabase
      .from("timeline_events")
      .select("*")
      .eq("match_id", matchRow.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("audit_logs")
      .select("*, actor:users!audit_logs_actor_id_fkey(id, display_name)")
      .eq("entity_type", "match")
      .eq("entity_id", matchRow.id)
      .order("created_at", { ascending: false }),
  ]);

  const timelineEvents = timelineError
    ? []
    : ((timelineData ?? []) as TimelineEventRow[]).map((event) => mapTimeline(event));

  const auditLogs = auditError
    ? []
    : ((auditData ?? []) as AuditLogRow[]).map((row) => mapAuditLog(row));

  let reportedBy: MatchReporter | undefined;
  if (matchRow.created_by) {
    const { data: reporterData, error: reporterError } = await supabase
      .from("users")
      .select("*")
      .eq("id", matchRow.created_by)
      .maybeSingle();

    if (reporterError) {
      console.error("[queries] match detail reporter fetch error", reporterError);
    } else if (reporterData) {
      const profile = mapUser(reporterData as UserRow);
      reportedBy = {
        id: profile.id,
        fullName: profile.fullName,
        username: profile.username,
        email: profile.email,
      };
    }
  }

  return {
    id: matchRow.id,
    seasonId: matchRow.season_id,
    season: mapSeasonRow(activeSeason),
    playedOn: matchRow.match_date,
    format: matchRow.match_type as MatchDetail["format"],
    status: matchRow.status as MatchDetail["status"],
    visibility: (matchRow.visibility ?? "private") as MatchDetail["visibility"],
    courseName: matchRow.course ?? undefined,
    notes: matchRow.notes ?? undefined,
    totalPoints,
    createdAt: matchRow.created_at ?? matchRow.match_date,
    updatedAt: matchRow.updated_at ?? matchRow.created_at ?? matchRow.match_date,
    reportedBy,
    participants,
    teamResults,
    timelineEvents,
    auditLogs,
  };
}

export async function getOtpInvites(): Promise<OTPInvite[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("one_time_passwords")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[queries] invites error", error);
    return [];
  }

  const inviteRows = (data ?? []) as OtpInviteRow[];

  return inviteRows.map(mapOtpInvite);
}

type AuditLogFilter = {
  limit?: number;
  entityType?: string;
  startDate?: string;
  endDate?: string;
};

export async function getAuditLogs(filters: AuditLogFilter = {}): Promise<AuditLogEntry[]> {
  const supabase = getSupabase();
  const limit = Math.min(200, Math.max(1, filters.limit ?? 25));
  let query = supabase
    .from("audit_logs")
    .select("*, actor:users!audit_logs_actor_id_fkey(id, display_name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filters.entityType) {
    query = query.eq("entity_type", filters.entityType);
  }
  if (filters.startDate) {
    query = query.gte("created_at", filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte("created_at", filters.endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[queries] audit logs error", error);
    return [];
  }

  return (data ?? []).map((row) => mapAuditLog(row as AuditLogRow));
}

export async function getUserProfile() {
  const supabase = getSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    if (error.message?.includes("Auth session missing") || (error as { status?: number }).status === 400) {
      return null;
    }
    console.error("[queries] auth user error", error);
    return null;
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
    return null;
  }

  const profileRow = data as UserRow | null;

  return profileRow ? mapUser(profileRow) : null;
}
