import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TeamsClient } from "@/app/(app)/app/teams/teams-client";

const seasons = [
  { id: "season-1", name: "2025 Season", isActive: true },
  { id: "season-2", name: "2024 Season", isActive: false },
];

function mockTeamsFetch() {
  return jest.fn((input: RequestInfo) => {
    const url = typeof input === "string" ? input : input.url;
    if (url.includes("seasonId=season-1")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            season: { id: "season-1", name: "2025 Season", isActive: true },
            teams: [
              {
                id: "team-1",
                name: "Fairway Flyers",
                slug: "fairway-flyers",
                color: "#123456",
                seasonId: "season-1",
                points: 12,
                wins: 4,
                losses: 1,
                ties: 0,
                matchesPlayed: 5,
                pointsPerMatch: 2.4,
                rosterSize: 4,
              },
            ],
            seasons,
          }),
      });
    }
    if (url.includes("seasonId=season-2")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            season: { id: "season-2", name: "2024 Season", isActive: false },
            teams: [
              {
                id: "team-2",
                name: "Rough Riders",
                slug: "rough-riders",
                color: "#654321",
                seasonId: "season-2",
                points: 9,
                wins: 3,
                losses: 2,
                ties: 0,
                matchesPlayed: 5,
                pointsPerMatch: 1.8,
                rosterSize: 3,
              },
            ],
            seasons,
          }),
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ season: null, teams: [], seasons }),
    });
  });
}

describe("TeamsClient", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = mockTeamsFetch();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    delete (global as { fetch?: typeof fetch }).fetch;
    fetchMock.mockReset();
  });

  it("renders teams for the default season", async () => {
    render(<TeamsClient seasons={seasons} defaultSeasonId="season-1" />);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/teams?seasonId=season-1",
      expect.objectContaining({ cache: "no-store" }),
    );
    expect(await screen.findByText("Fairway Flyers")).toBeInTheDocument();
    expect(screen.getAllByText(/Matches/i).length).toBeGreaterThan(0);
  });

  it("switches seasons when selector changes", async () => {
    render(<TeamsClient seasons={seasons} defaultSeasonId="season-1" />);

    await screen.findByText("Fairway Flyers");

    await userEvent.selectOptions(screen.getByLabelText(/Season/i), "season-2");

    expect(await screen.findByText("Rough Riders")).toBeInTheDocument();
  });
});
