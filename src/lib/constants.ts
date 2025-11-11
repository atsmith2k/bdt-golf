import type { MatchFormat, NavItem } from "./types";

export const APP_NAME = "BDT Golf League";
export const APP_TAGLINE = "Your league's single source of truth.";

export const PRIMARY_ROUTES: NavItem[] = [
  { title: "Home", href: "/app" },
  { title: "Match Entry", href: "/app/matches/new" },
  { title: "Teams", href: "/app/teams" },
  { title: "Players", href: "/app/players" },
  { title: "Analytics", href: "/app/analytics" },
];

export const COMMISSIONER_ROUTES: NavItem[] = [
  { title: "Commissioner Panel", href: "/app/commissioner", requiresCommissioner: true },
  { title: "Invites & OTPs", href: "/app/commissioner/invites", requiresCommissioner: true },
];

export const MATCH_FORMATS: { value: MatchFormat; label: string }[] = [
  { value: "stroke_play", label: "Stroke Play" },
  { value: "match_play", label: "Match Play" },
  { value: "skins", label: "Skins" },
  { value: "scramble", label: "Scramble" },
  { value: "best_ball", label: "Best Ball" },
  { value: "alternate_shot", label: "Alternate Shot" },
];

export const DEFAULT_TIMEZONE = "America/Chicago";

