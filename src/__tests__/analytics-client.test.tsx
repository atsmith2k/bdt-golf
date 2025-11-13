import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import { AnalyticsClient } from "@/app/(app)/app/analytics/analytics-client";

const fallback: Record<string, unknown> = {
  "/api/analytics/players?seasonId=season-1&minMatches=0": {
    season: { id: "season-1", name: "2025 Season" },
    players: [
      {
        playerId: "player-1",
        displayName: "Alex Golfer",
        username: "alex",
        teamId: "team-1",
        teamName: "Fairway Flyers",
        matchesPlayed: 6,
        pointsTotal: 12.5,
        pointsPerMatch: 2.08,
        wins: 4,
        losses: 1,
        ties: 1,
        recentForm: [2.5, 1.5, 3, 2, 3.5],
      },
      {
        playerId: "player-2",
        displayName: "Blake Fairway",
        username: "blake",
        teamId: "team-2",
        teamName: "Green Jackets",
        matchesPlayed: 5,
        pointsTotal: 9.0,
        pointsPerMatch: 1.8,
        wins: 3,
        losses: 2,
        ties: 0,
        recentForm: [1, 2, 1.5, 2.5, 2],
      },
    ],
    teams: [
      {
        id: "team-1",
        name: "Fairway Flyers",
        color: "#123456",
      },
      {
        id: "team-2",
        name: "Green Jackets",
        color: "#654321",
      },
    ],
  },
  "/api/analytics/teams?seasonId=season-1": {
    season: { id: "season-1", name: "2025 Season" },
    teams: [
      {
        teamId: "team-1",
        seasonId: "season-1",
        name: "Fairway Flyers",
        color: "#123456",
        matchesPlayed: 6,
        pointsTotal: 25.0,
        pointsPerMatch: 4.17,
        wins: 5,
        losses: 1,
        ties: 0,
        recentMatches: ["2025-05-01", "2025-04-24"],
      },
    ],
  },
  "/api/analytics/participation?seasonId=season-1&limit=20": {
    season: { id: "season-1", name: "2025 Season" },
    totalMatches: 6,
    players: [
      {
        playerId: "player-1",
        displayName: "Alex Golfer",
        username: "alex",
        teamId: "team-1",
        teamName: "Fairway Flyers",
        matchesPlayed: 6,
        totalPoints: 12.5,
        participationRate: 1,
      },
      {
        playerId: "player-2",
        displayName: "Blake Fairway",
        username: "blake",
        teamId: "team-2",
        teamName: "Green Jackets",
        matchesPlayed: 5,
        totalPoints: 9.0,
        participationRate: 0.83,
      },
    ],
  },
  "/api/analytics/head-to-head?seasonId=season-1&playerId=player-1&opponentId=player-2": {
    season: { id: "season-1", name: "2025 Season" },
    player: { id: "player-1", displayName: "Alex Golfer", username: "alex", teamId: "team-1" },
    opponent: { id: "player-2", displayName: "Blake Fairway", username: "blake", teamId: "team-2" },
    summary: {
      matchesPlayed: 2,
      wins: 1,
      losses: 1,
      ties: 0,
      pointsFor: 5,
      pointsAgainst: 4,
      averageMargin: 0.5,
      lastMatchDate: "2025-05-01",
    },
    matches: [
      {
        id: "match-1",
        matchDate: "2025-05-01",
        course: "Pebble Beach",
        playerPoints: 3,
        opponentPoints: 1.5,
        result: "win",
      },
      {
        id: "match-2",
        matchDate: "2025-04-20",
        course: "Harbor Town",
        playerPoints: 2,
        opponentPoints: 2.5,
        result: "loss",
      },
    ],
    generatedAt: "2025-05-02T12:00:00.000Z",
  },
  "/api/analytics/head-to-head?seasonId=season-1&playerId=player-2&opponentId=player-1": {
    season: { id: "season-1", name: "2025 Season" },
    player: { id: "player-2", displayName: "Blake Fairway", username: "blake", teamId: "team-2" },
    opponent: { id: "player-1", displayName: "Alex Golfer", username: "alex", teamId: "team-1" },
    summary: {
      matchesPlayed: 2,
      wins: 1,
      losses: 1,
      ties: 0,
      pointsFor: 4,
      pointsAgainst: 5,
      averageMargin: -0.5,
      lastMatchDate: "2025-05-01",
    },
    matches: [
      {
        id: "match-1",
        matchDate: "2025-05-01",
        course: "Pebble Beach",
        playerPoints: 1.5,
        opponentPoints: 3,
        result: "loss",
      },
      {
        id: "match-2",
        matchDate: "2025-04-20",
        course: "Harbor Town",
        playerPoints: 2.5,
        opponentPoints: 2,
        result: "win",
      },
    ],
    generatedAt: "2025-05-02T12:00:00.000Z",
  },
};

let originalFetch: typeof fetch | undefined;

beforeAll(() => {
  originalFetch = global.fetch;
});

afterEach(() => {
  if (originalFetch) {
    global.fetch = originalFetch;
  } else {
    delete (global as { fetch?: typeof fetch }).fetch;
  }
});

function renderAnalytics(options?: { isCommissioner?: boolean }) {
  const fetchMock = jest.fn((input: RequestInfo) => {
    const url = typeof input === "string" ? input : input.url;
    const payload = fallback[url];
    if (payload) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(payload),
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  global.fetch = fetchMock as unknown as typeof fetch;

  return render(
    <SWRConfig value={{ provider: () => new Map(), fallback }}>
      <AnalyticsClient
        seasons={[
          { id: "season-1", name: "2025 Season", isActive: true },
          { id: "season-0", name: "2024 Season", isActive: false },
        ]}
        defaultSeasonId="season-1"
        isCommissioner={options?.isCommissioner ?? false}
      />
    </SWRConfig>,
  );
}

describe("AnalyticsClient", () => {
  it("renders player leaderboard by default and switches tabs", async () => {
    renderAnalytics();

    expect(await screen.findByText("Alex Golfer")).toBeInTheDocument();
    expect(screen.getAllByText("Fairway Flyers")[0]).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Team leaderboard" }));
    expect(await screen.findByText("#1")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Participation" }));
    expect(await screen.findByText(/Total matches logged/)).toBeInTheDocument();
  });

  it("exposes head-to-head analytics behind the commissioner beta toggle", async () => {
    renderAnalytics({ isCommissioner: true });

    expect(await screen.findByText("Alex Golfer")).toBeInTheDocument();

    const toggle = screen.getByRole("button", { name: /Head-to-head/i });
    await userEvent.click(toggle);

    expect(await screen.findByText("Matches played")).toBeInTheDocument();
    expect(screen.getByText("Swap players")).toBeInTheDocument();
    expect(screen.getByText("3.0 — 1.5")).toBeInTheDocument();
  });
});
