'use client';

import * as React from "react";
import useSWRInfinite from "swr/infinite";
import type { TimelineEvent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TimelineCard } from "./timeline-card";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";

type TimelineResponse = {
  data: TimelineEvent[];
  nextCursor: string | null;
};

const fetcher = async (url: string): Promise<TimelineResponse> => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(typeof payload.error === "string" ? payload.error : "Timeline failed to load.");
  }
  return response.json();
};

type FilterValue = "all" | "mine" | "team";

const FILTER_LABELS: Record<FilterValue, string> = {
  all: "All activity",
  mine: "My matches",
  team: "My team",
};

export function TimelineFeed({ teamId }: { teamId?: string }) {
  const [filter, setFilter] = React.useState<FilterValue>("all");

  const getKey = React.useCallback(
    (pageIndex: number, previousPageData: TimelineResponse | null) => {
      if (previousPageData && !previousPageData.nextCursor) {
        return null;
      }
      const cursorParam =
        pageIndex === 0 || !previousPageData?.nextCursor
          ? ""
          : `&cursor=${encodeURIComponent(previousPageData.nextCursor)}`;

      const teamParam = filter === "team" && teamId ? `&teamId=${teamId}` : "";

      if (filter === "team" && !teamId) {
        return null;
      }

      return `/api/timeline?filter=${filter}${teamParam}${cursorParam}`;
    },
    [filter, teamId],
  );

  const {
    data,
    error,
    isLoading,
    size,
    setSize,
    mutate,
    isValidating,
  } = useSWRInfinite<TimelineResponse>(getKey, fetcher, {
    revalidateOnFocus: false,
  });

  const events = React.useMemo(() => {
    if (!data) {
      return [];
    }
    return data.flatMap((page) => page.data ?? []);
  }, [data]);

  const hasMore = Boolean(data?.[data.length - 1]?.nextCursor);

  const isLoadingInitial = isLoading && !data;
  const isLoadingMore = isValidating && size > 0;

  React.useEffect(() => {
    setSize(1);
  }, [filter, setSize]);

  const handleFilterChange = (value: FilterValue) => {
    if (value === "team" && !teamId) {
      return;
    }
    setFilter(value);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {(Object.keys(FILTER_LABELS) as FilterValue[]).map((value) => {
          const selected = filter === value;
          const disabled = value === "team" && !teamId;
          return (
            <button
              key={value}
              type="button"
              onClick={() => handleFilterChange(value)}
              disabled={disabled}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--bdt-royal) / 0.45)]",
                selected
                  ? "border-[rgb(var(--bdt-royal) / 0.65)] bg-bdt-royal text-white shadow-[0_12px_28px_rgb(var(--bdt-navy) / 0.25)]"
                  : "border-[rgb(var(--bdt-royal) / 0.18)] bg-white text-[rgb(var(--bdt-navy) / 0.7)] hover:bg-[rgb(var(--bdt-royal) / 0.08)] hover:text-bdt-navy",
                disabled && "cursor-not-allowed opacity-40",
              )}
            >
              {FILTER_LABELS[value]}
              {value === "team" && !teamId ? (
                <span className="ml-2 text-xs font-semibold uppercase text-[rgb(var(--bdt-navy) / 0.45)]">
                  No team
                </span>
              ) : null}
            </button>
          );
        })}
        {filter === "team" && !teamId ? (
          <Badge variant="outline" className="text-xs font-medium">
            Assign a team to unlock this filter
          </Badge>
        ) : null}
      </div>

      {error ? (
        <Card>
          <CardContent className="space-y-3 py-6 text-sm text-bdt-red">
            <p>{error.message}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => mutate()}
              disabled={isValidating}
              className="w-fit"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {isLoadingInitial ? (
        <TimelineSkeleton />
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-[rgb(var(--bdt-navy) / 0.65)]">
            No activity yet. Record a match to get the league moving.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <TimelineCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {events.length > 0 ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setSize(size + 1)}
            disabled={!hasMore || isLoadingMore}
          >
            {isLoadingMore ? "Loading..." : hasMore ? "Load more" : "End of activity"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="border-[rgb(var(--bdt-royal) / 0.16)] bg-white/80 shadow-none backdrop-blur">
          <CardContent className="flex items-start gap-4 py-4">
            <div className="h-10 w-10 animate-pulse rounded-full bg-[rgb(var(--bdt-royal) / 0.12)]" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-1/3 animate-pulse rounded bg-[rgb(var(--bdt-royal) / 0.16)]" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-[rgb(var(--bdt-royal) / 0.12)]" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
