import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MatchCorrectionsPanel } from "@/components/commissioner/match-corrections";
import type { MatchSummary, MatchParticipant, TeamSummary } from "@/lib/types";

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: jest.fn(),
  }),
}));

const participants: MatchParticipant[] = [
  {
    id: "mp-1",
    matchId: "match-1",
    userId: "player-1",
    teamId: "team-1",
    pointsAwarded: 3,
    strokes: undefined,
    position: 1,
    isWinner: true,
    createdAt: "2025-05-01T00:00:00.000Z",
    updatedAt: "2025-05-01T00:00:00.000Z",
    user: {
      id: "player-1",
      username: "alex",
      fullName: "Alex Golfer",
      role: "player",
      createdAt: "",
      updatedAt: "",
    },
  },
];

const teams: TeamSummary[] = [
  {
    id: "team-1",
    seasonId: "season-1",
    name: "Fairway Flyers",
    slug: "fairway-flyers",
    color: "#123456",
    points: 0,
    wins: 0,
    losses: 0,
    ties: 0,
    createdAt: "",
    updatedAt: "",
  },
];

const matches: MatchSummary[] = [
  {
    id: "match-1",
    seasonId: "season-1",
    playedOn: "2025-05-01",
    format: "stroke_play",
    status: "submitted",
    courseName: "Pebble Beach",
    notes: "Original entry",
    totalPoints: 3,
    participatingTeams: teams,
    participants,
  },
];

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
  jest.clearAllMocks();
});

describe("MatchCorrectionsPanel", () => {
  it("requires a reason before voiding a match", async () => {
    const user = userEvent.setup();
    render(<MatchCorrectionsPanel matches={matches} />);

    await user.click(screen.getByRole("button", { name: /Void match/i }));

    expect(
      screen.getByText(/Provide a reason before voiding a match/i),
    ).toBeInTheDocument();
  });

  it("sends a PATCH request when voiding a match", async () => {
    const user = userEvent.setup();

    const mockFetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: "voided", notes: "[VOID]" }),
      }),
    ) as unknown as typeof fetch;

    global.fetch = mockFetch;

    render(<MatchCorrectionsPanel matches={matches} />);

    await user.type(screen.getByPlaceholderText(/Explain why/i), "Scoring error");
    await user.click(screen.getByRole("button", { name: /Void match/i }));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/admin/matches/match-1",
      expect.objectContaining({
        method: "PATCH",
      }),
    );
    expect(await screen.findByText(/Match voided/i)).toBeInTheDocument();
  });
});
