import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimelineFeed } from "@/components/league/timeline-feed";

const allResponse = {
  data: [
    {
      id: "event-1",
      type: "match_result",
      seasonId: "season-1",
      createdAt: "2025-05-01T12:00:00Z",
      payload: { title: "Match recorded", summary: "Team A vs Team B" },
    },
  ],
  nextCursor: null,
};

const mineResponse = {
  data: [
    {
      id: "event-3",
      type: "match_result",
      seasonId: "season-1",
      createdAt: "2025-05-03T12:00:00Z",
      payload: { title: "My latest match" },
    },
  ],
  nextCursor: null,
};

function mockFetch() {
  const fetchMock = jest.fn((input: RequestInfo) => {
    const url = typeof input === "string" ? input : input.url;
    if (url.includes("filter=all")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(allResponse),
      });
    }
    if (url.includes("filter=mine")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mineResponse),
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: [], nextCursor: null }),
    });
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function restoreFetch() {
  delete (global as { fetch?: typeof fetch }).fetch;
}

describe("TimelineFeed", () => {
  afterEach(() => {
    restoreFetch();
  });

  it("renders fetched events and disables team filter without assignment", async () => {
    mockFetch();
    render(<TimelineFeed />);

    expect(await screen.findByText("Match recorded")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /My team/i })).toBeDisabled();
  });

  it("switches to 'My matches' filter when selected", async () => {
    const fetchMock = mockFetch();
    render(<TimelineFeed />);

    expect(await screen.findByText("Match recorded")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /My matches/i }));

    expect(await screen.findByText("My latest match")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("filter=mine"),
      expect.objectContaining({ cache: "no-store" }),
    );
  });
});
