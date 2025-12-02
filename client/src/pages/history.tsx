import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import MobileLayout from "@/components/layout/mobile-layout";
import { Card } from "@/components/ui/card";
import { Award } from "lucide-react";
import type { WorkoutRound, WorkoutSession } from "@/../../shared/schema";

type HistorySession = WorkoutSession & { rounds: WorkoutRound[] };

export default function History() {
  const [, setLocation] = useLocation();

  const { data: history, isLoading, refetch } = useQuery<HistorySession[]>({
    queryKey: ["/api/workout/history"],
    queryFn: async () => {
      const res = await fetch("/api/workout/history", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load history");
      return res.json();
    },
  });

  useEffect(() => {
    if (history && history.length) {
      // clear selected detail when new data arrives
      window.sessionStorage.removeItem("selectedHistorySession");
    }
  }, [history]);

  const formatDate = (value: string) => {
    const date = new Date(value);
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <MobileLayout>
      <div className="p-6 pb-24 space-y-6">
        <h1 className="text-3xl font-bold text-white mb-6">ACTIVITY</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card className="p-4 bg-primary/10 border-primary/20 flex flex-col items-center justify-center py-6">
            <span className="text-4xl font-display font-bold text-primary neon-text">{history?.length ?? 0}</span>
            <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground">This Week</span>
          </Card>
          <Card className="p-4 bg-card/50 border-border/50 flex flex-col items-center justify-center py-6">
            <span className="text-4xl font-display font-bold text-white">12</span>
            <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Streak</span>
          </Card>
        </div>

        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Recent Workouts</h2>
          <button
            onClick={() => refetch()}
            className="text-xs text-primary underline underline-offset-4"
            disabled={isLoading}
          >
            Refresh
          </button>
        </div>

        <div className="space-y-3">
          {isLoading && (
            <Card className="p-4 bg-card/40 border-border/40 text-center text-muted-foreground">Loading...</Card>
          )}
          {!isLoading && (!history || history.length === 0) && (
            <Card className="p-4 bg-card/40 border-border/40 text-center text-muted-foreground">
              Log a workout to see your history here.
            </Card>
          )}
          {history?.map((session) => (
            <Card
              key={session.id}
              className="p-4 bg-card/40 border-border/40 flex flex-col gap-2 cursor-pointer hover:border-primary/40"
              onClick={() => {
                window.sessionStorage.setItem("selectedHistorySession", JSON.stringify(session));
                setLocation("/workout/detail");
              }}
            >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4 items-start">
                    <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center">
                      <Award className="text-muted-foreground w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{session.focusLabel}</h3>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(session.createdAt as unknown as string)} • {session.durationMinutes} min
                      </p>
                      {session.notes ? (
                        <p className="text-xs text-muted-foreground italic">“{session.notes}”</p>
                      ) : null}
                      {session.prHighlights && session.prHighlights.length ? (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {session.prHighlights.slice(0, 2).map((highlight) => (
                            <span
                              key={highlight}
                              className="text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/40"
                            >
                              {highlight}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                <div className="text-right text-xs text-muted-foreground space-y-1">
                  <p className="font-bold uppercase text-white">{session.difficultyTag}</p>
                  <p>RPE: {session.perceivedExertion ?? "-"}</p>
                  <p>Rounds: {session.rounds.length}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </MobileLayout>
  );
}
