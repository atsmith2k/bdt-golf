import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AnnouncementComposer } from "@/components/commissioner/announcement-composer";
import type { Season } from "@/lib/types";

const seasons: Season[] = [
  {
    id: "season-1",
    name: "2025 Season",
    year: 2025,
    isActive: true,
    startDate: "2025-01-01",
    endDate: undefined,
    createdAt: "2025-01-01",
    updatedAt: "2025-01-01",
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

describe("AnnouncementComposer", () => {
  it("publishes announcements via the admin API", async () => {
    const user = userEvent.setup();

    const mockFetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ announcement: { id: "a-1" } }),
      }),
    ) as unknown as typeof fetch;

    global.fetch = mockFetch;

    render(<AnnouncementComposer seasons={seasons} defaultSeasonId="season-1" />);

    await user.type(screen.getByLabelText(/Title/i), "Weekly recap");
    await user.type(screen.getByPlaceholderText(/Reminder/i), "Great job everyone!");

    await user.click(screen.getByRole("button", { name: /Publish/i }));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/admin/announcements",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(await screen.findByText(/Announcement published/i)).toBeInTheDocument();
  });
});
