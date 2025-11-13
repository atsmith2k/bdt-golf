import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InvitesClientView } from "@/components/commissioner/invites-client-view";
import type { OTPInvite } from "@/lib/types";

const baseInvites: OTPInvite[] = [
  {
    id: "invite-1",
    userId: "user-1",
    username: "alex",
    email: "alex@example.com",
    code: "ABC123",
    expiresAt: "2025-06-01T12:00:00.000Z",
    createdAt: "2025-05-01T12:00:00.000Z",
    createdBy: "commissioner-1",
  },
];

const teams = [
  { id: "team-1", name: "Fairway Flyers" },
  { id: "team-2", name: "Green Jackets" },
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

describe("InvitesClientView", () => {
  it("creates invites via the commissioner API", async () => {
    const user = userEvent.setup();

    const mockFetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            invites: [
              {
                id: "invite-2",
                userId: "user-2",
                username: "blake",
                email: "blake@example.com",
                code: "XYZ789",
                expiresAt: "2025-06-02T12:00:00.000Z",
                createdAt: "2025-05-02T12:00:00.000Z",
                createdBy: "commissioner-1",
              },
            ],
          }),
      }),
    ) as unknown as typeof fetch;

    global.fetch = mockFetch;

    render(<InvitesClientView invites={baseInvites} teams={teams} />);

    await user.click(screen.getByRole("button", { name: /create invite/i }));

    await user.type(screen.getByLabelText(/Display name/i), "Blake Fairway");
    await user.type(screen.getByLabelText(/^Email/i), "blake@example.com");
    await user.type(screen.getByLabelText(/^Username/i), "blake");
    await user.selectOptions(screen.getByLabelText(/Team/), "team-1");
    await user.selectOptions(screen.getByLabelText(/^Role/), "player");

    await user.click(screen.getByRole("button", { name: "Create invite" }));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/admin/invites",
      expect.objectContaining({
        method: "POST",
      }),
    );

    expect(await screen.findByText(/Invite issued for blake/i)).toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(within(table).getByText("XYZ789")).toBeInTheDocument();
  });
});

