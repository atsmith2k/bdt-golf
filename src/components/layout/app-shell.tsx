'use client';

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Shield, Users2, X } from "lucide-react";
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

function NavLinks({
  links,
  pathname,
}: {
  links: NavItem[];
  pathname: string;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const isActive =
          link.href === "/app"
            ? pathname === "/app"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
              isActive
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-200/60 hover:text-slate-900",
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
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <div className="flex flex-col">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Active Season
          </span>
          <span className="text-sm font-semibold text-slate-900">
            {activeSeasonName ?? "League"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {activeTeamRecord && (
            <span className="hidden text-sm text-slate-500 sm:block">
              Team Record: {formatRecord(activeTeamRecord.wins, activeTeamRecord.losses, activeTeamRecord.ties)}
            </span>
          )}
          <Avatar
            name={user.fullName}
            className="h-9 w-9"
          />
          <Button variant="ghost" size="sm" className="gap-2 text-slate-500">
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto bg-slate-50 px-6 py-8">{children}</main>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white px-4 py-6 lg:flex">
        <Link href="/app" className="mb-8 inline-flex items-center gap-2">
          <Users2 className="h-6 w-6 text-slate-900" />
          <div>
            <p className="text-sm font-semibold text-slate-900">{APP_NAME}</p>
            <p className="text-xs text-slate-500">League HQ</p>
          </div>
        </Link>
        <div className="flex-1 space-y-8">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Overview
            </p>
            <NavLinks links={PRIMARY_ROUTES} pathname={pathname} />
          </div>
          {commissionerLinks.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Shield className="h-3 w-3" />
                Commissioner
              </p>
              <NavLinks links={commissionerLinks} pathname={pathname} />
            </div>
          )}
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <div className="flex items-center border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5 text-slate-700" />
          </Button>
          <div className="ml-3 flex flex-col">
            <span className="text-sm font-semibold text-slate-900">
              {APP_NAME}
            </span>
            <span className="text-xs text-slate-500">League HQ</span>
          </div>
        </div>
        {mobileOpen && (
          <div className="lg:hidden">
            <div className="fixed inset-0 z-40 bg-slate-900/40" />
            <div className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white p-6 shadow-xl">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users2 className="h-6 w-6 text-slate-900" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {APP_NAME}
                    </p>
                    <p className="text-xs text-slate-500">League HQ</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="h-4 w-4 text-slate-500" />
                </Button>
              </div>
              <div className="space-y-6 overflow-y-auto">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Overview
                  </p>
                  <NavLinks links={PRIMARY_ROUTES} pathname={pathname} />
                </div>
                {commissionerLinks.length > 0 && (
                  <div>
                    <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <Shield className="h-3 w-3" />
                      Commissioner
                    </p>
                    <NavLinks links={commissionerLinks} pathname={pathname} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {body}
      </div>
    </div>
  );
}
