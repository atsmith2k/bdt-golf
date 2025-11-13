import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TeamManager } from "@/components/commissioner/team-manager";
import type { Season, TeamSummary, UserProfile } from "@/lib/types";

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: jest.fn(),
  }),
}));

const seasons: Season[] = [
  {
    id: "season-1",
    name: "2025 Season",
    year: 2025,
    isActive: true,
    startDate: "2025-01-01",
    endDate: undefined,
    createdAt: "",
    updatedAt: "",
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

const players: UserProfile[] = [
  {
    id: "player-1",
    username: "alex",
    fullName: "Alex Golfer",
    role: "player",
    createdAt: "",
    updatedAt: "",
    teamId: undefined,
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

describe("TeamManager", () => {
  it("creates a team via the admin API", async () => {
    const user = userEvent.setup();

    const mockFetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ team: { id: "team-2" } }),
      }),
    ) as unknown as typeof fetch;

    global.fetch = mockFetch;

    render(
      <TeamManager
        seasons={seasons}
        activeSeasonId="season-1"
        teams={teams}
        players={players}
      />,
    );

    await user.type(screen.getByPlaceholderText("Pinseekers"), "Green Jackets");
    await user.type(screen.getByPlaceholderText("#2563eb"), "#654321");
    await user.click(screen.getByRole("button", { name: /Create team/i }));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/admin/teams",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(await screen.findByText(/Team created/i)).toBeInTheDocument();
  });

  it("assigns a player to a team", async () => {
    const user = userEvent.setup();

    const mockFetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ user: { id: "player-1", team_id: "team-1" } }),
      }),
    ) as unknown as typeof fetch;

    global.fetch = mockFetch;

    render(
      <TeamManager
        seasons={seasons}
        activeSeasonId="season-1"
        teams={teams}
        players={players}
      />,
    );

    const playerSelects = screen.getAllByLabelText(/^Player$/i);
    await user.selectOptions(playerSelects[0], "player-1");
    const teamSelects = screen.getAllByLabelText(/^Team$/i);
    await user.selectOptions(teamSelects[0], "team-1");
    await user.click(screen.getByRole("button", { name: /Assign player/i }));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/admin/users/player-1/team",
      expect.objectContaining({
        method: "PATCH",
      }),
    );
    expect(await screen.findByText(/Player assigned to team/i)).toBeInTheDocument();
  });
});
