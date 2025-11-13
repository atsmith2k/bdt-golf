'use client';

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Shield, X } from "lucide-react";
import { PRIMARY_ROUTES, COMMISSIONER_ROUTES, APP_NAME } from "@/lib/constants";
import type { NavItem, UserProfile } from "@/lib/types";
import { cn, formatRecord } from "@/lib/utils";
import { Avatar } from "../ui/avatar";
import { Button } from "../ui/button";

interface AppShellProps {
  children: React.ReactNode;
  user: UserProfile;
  activeTeamRecord?: { wins: number; losses: number; ties: number };
  activeSeasonName?: string;
}

type NavTone = "glass" | "surface";

function NavLinks({
  links,
  pathname,
  tone = "glass",
  onNavigate,
}: {
  links: NavItem[];
  pathname: string;
  tone?: NavTone;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const isActive =
          link.href === "/app"
            ? pathname === "/app"
            : pathname.startsWith(link.href);
        const baseClasses =
          tone === "glass"
            ? "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition"
            : "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition";
        const activeClasses =
          tone === "glass"
            ? "bg-white/22 text-white shadow-sm shadow-[0_8px_20px_rgba(0,0,0,0.16)] backdrop-blur"
            : "bg-[rgb(var(--bdt-royal) / 0.1)] text-bdt-navy shadow-[0_6px_18px_rgb(var(--bdt-navy) / 0.08)]";
        const inactiveClasses =
          tone === "glass"
            ? "text-white/80 hover:bg-white/12 hover:text-white"
            : "text-[rgb(var(--bdt-navy) / 0.7)] hover:bg-[rgb(var(--bdt-royal) / 0.12)] hover:text-bdt-navy";

        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              baseClasses,
              isActive ? activeClasses : inactiveClasses,
            )}
          >
            <span>{link.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children, user, activeTeamRecord, activeSeasonName }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const commissionerLinks = useMemo(() => {
    if (user.role !== "commissioner") {
      return [];
    }
    return COMMISSIONER_ROUTES;
  }, [user.role]);

  const body = (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-b-[rgb(var(--bdt-royal) / 0.12)] bg-white/90 px-6 py-4 backdrop-blur">
        <div className="flex flex-col">
          <span className="text-xs font-medium uppercase tracking-wide text-[rgb(var(--bdt-navy) / 0.55)]">
            Active Season
          </span>
          <span className="text-sm font-semibold text-bdt-navy">
            {activeSeasonName ?? "League"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {activeTeamRecord && (
            <span className="hidden text-sm text-[rgb(var(--bdt-navy) / 0.7)] sm:block">
              Team Record: {formatRecord(activeTeamRecord.wins, activeTeamRecord.losses, activeTeamRecord.ties)}
            </span>
          )}
          <Avatar
            name={user.fullName}
            className="h-9 w-9 border border-[rgb(var(--bdt-royal) / 0.25)] bg-white text-bdt-navy"
          />
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-bdt-royal hover:text-bdt-navy"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto bg-bdt-ice px-6 py-8">{children}</main>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-72 flex-col bg-bdt-navy-gradient px-6 py-8 text-white shadow-xl lg:flex">
        <Link
          href="/app"
          className="mb-10 inline-flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-2 transition hover:bg-white/10 hover:shadow-[0_18px_38px_rgba(2,34,84,0.28)]"
        >
          <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 shadow-[0_10px_22px_rgba(0,0,0,0.18)]">
            <Image
              src="/bdt-transparent-logo.png"
              alt="BDT Tour crest"
              width={40}
              height={56}
              className="h-9 w-auto"
              priority
            />
          </span>
          <div className="leading-tight">
            <p className="text-xs font-semibold uppercase tracking-[0.45em] text-bdt-red">
              BDT Tour
            </p>
            <p className="text-sm font-semibold text-white">{APP_NAME}</p>
          </div>
        </Link>
        <div className="flex-1 space-y-8">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/70">
              Overview
            </p>
            <NavLinks links={PRIMARY_ROUTES} pathname={pathname} />
          </div>
          {commissionerLinks.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/70">
                <Shield className="h-3 w-3" />
                Commissioner
              </p>
              <NavLinks links={commissionerLinks} pathname={pathname} />
            </div>
          )}
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <div className="flex items-center border-b border-b-[rgb(var(--bdt-royal) / 0.12)] bg-bdt-navy-gradient px-4 py-3 text-white lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            className="text-white hover:text-white"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="ml-3 flex items-center gap-3">
            <Image
              src="/bdt-transparent-logo.png"
              alt="BDT Tour crest"
              width={32}
              height={48}
              className="h-8 w-auto drop-shadow-lg"
              priority
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold uppercase tracking-[0.25em] text-bdt-red">
                BDT Tour
              </span>
              <span className="text-xs font-medium text-white/80">
                {APP_NAME}
              </span>
            </div>
          </div>
        </div>
        {mobileOpen && (
          <div className="lg:hidden">
            <div className="fixed inset-0 z-40 bg-slate-900/40" />
            <div className="fixed inset-y-0 left-0 z-50 flex w-[min(80vw,20rem)] max-w-sm flex-col overflow-y-auto rounded-r-3xl bg-white/95 pb-8 shadow-[0_30px_60px_rgba(2,34,84,0.38)] backdrop-blur">
              <div className="bg-gradient-to-br from-[rgb(var(--bdt-ice))] via-white to-white px-6 pb-4 pt-6 shadow-[0_12px_24px_rgb(var(--bdt-navy) / 0.08)]">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[rgb(var(--bdt-royal) / 0.12)] shadow-[0_10px_24px_rgb(var(--bdt-navy) / 0.1)]">
                      <Image
                        src="/bdt-transparent-logo.png"
                        alt="BDT Tour crest"
                        width={36}
                        height={52}
                        className="h-9 w-auto"
                        priority
                      />
                    </span>
                    <div className="leading-tight">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.38em] text-bdt-red">
                        BDT Tour
                      </p>
                      <p className="text-sm font-semibold text-bdt-navy">
                        {APP_NAME}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-full bg-[rgb(var(--bdt-ice))] text-bdt-royal hover:bg-[rgb(var(--bdt-royal) / 0.12)]"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs font-medium uppercase tracking-wide text-[rgb(var(--bdt-navy) / 0.55)]">
                  Navigation
                </p>
              </div>
              <div className="flex flex-1 flex-col px-6 py-6">
                <div className="space-y-6">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--bdt-navy) / 0.6)]">
                      Overview
                    </p>
                    <NavLinks
                      links={PRIMARY_ROUTES}
                      pathname={pathname}
                      tone="surface"
                      onNavigate={() => setMobileOpen(false)}
                    />
                  </div>
                  {commissionerLinks.length > 0 && (
                    <div>
                      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--bdt-navy) / 0.6)]">
                        <Shield className="h-3 w-3" />
                        Commissioner
                      </p>
                    <NavLinks
                      links={commissionerLinks}
                      pathname={pathname}
                      tone="surface"
                      onNavigate={() => setMobileOpen(false)}
                    />
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-auto px-6">
                <Link
                  href="/app"
                  onClick={() => setMobileOpen(false)}
                  className="mb-4 flex w-full items-center justify-center rounded-full bg-bdt-royal px-4 py-3 text-sm font-semibold text-white shadow-[0_20px_35px_rgb(var(--bdt-navy) / 0.28)] transition hover:bg-bdt-navy"
                >
                  Go to dashboard
                </Link>
                <div className="flex items-center justify-between rounded-2xl border border-[rgb(var(--bdt-royal) / 0.12)] bg-[rgb(var(--bdt-ice))] px-4 py-3 text-sm text-[rgb(var(--bdt-navy) / 0.75)]">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={user.fullName}
                      className="h-9 w-9 border-none bg-white text-bdt-navy shadow-[0_6px_16px_rgb(var(--bdt-navy) / 0.12)]"
                    />
                    <div className="flex flex-col leading-tight">
                      <span className="font-semibold text-bdt-navy">
                        {user.fullName}
                      </span>
                      <span className="text-xs uppercase tracking-wide text-[rgb(var(--bdt-navy) / 0.55)]">
                        Signed in
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 rounded-full bg-white/80 px-4 text-bdt-red hover:bg-white"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        {body}
      </div>
    </div>
  );
}
