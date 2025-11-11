import { CalendarDays, Megaphone, Trophy } from "lucide-react";
import type { TimelineEvent } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const iconMap: Record<string, React.ReactNode> = {
  match_result: <Trophy className="h-4 w-4 text-amber-500" />,
  announcement: <Megaphone className="h-4 w-4 text-sky-600" />,
  season_event: <CalendarDays className="h-4 w-4 text-emerald-600" />,
  system: <CalendarDays className="h-4 w-4 text-slate-500" />,
};

export function TimelineCard({ event }: { event: TimelineEvent }) {
  const icon = iconMap[event.type] ?? iconMap.system;
  const title =
    typeof event.payload.title === "string"
      ? event.payload.title
      : event.type === "match_result"
        ? "Match result"
        : "League update";
  const body =
    typeof event.payload.summary === "string"
      ? event.payload.summary
      : typeof event.payload.body === "string"
        ? event.payload.body
        : "";

  return (
    <Card className="border-slate-200 shadow-none">
      <CardContent className="flex items-start gap-4 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            <Badge variant="outline">{formatDate(event.createdAt)}</Badge>
          </div>
          {body ? (
            <p className="mt-2 text-sm text-slate-600">{body}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

