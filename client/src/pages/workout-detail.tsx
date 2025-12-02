import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Play, RotateCw, Zap, Flame, Infinity, Repeat, Trophy, Target, Activity } from "lucide-react";
import MobileLayout from "@/components/layout/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FRAMEWORK_CONFIGS, Framework } from "@/../../shared/frameworks";
import type { GeneratedWorkout } from "@/../../shared/schema";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

type WorkoutDetailData = GeneratedWorkout & { notes?: string; perceivedExertion?: number; createdAt?: string };

// Icon mapping for frameworks
const FRAMEWORK_ICONS: Record<Framework, typeof Zap> = {
  EMOM: Zap,
  Tabata: Flame,
  AMRAP: Infinity,
  Circuit: Repeat,
};

export default function WorkoutDetail() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [historyWorkout, setHistoryWorkout] = useState<WorkoutDetailData | null>(null);

  const { data: workout, isLoading, refetch } = useQuery<GeneratedWorkout>({
    queryKey: ["/api/workout/generate"],
  });

  const { data: personalRecords = [] } = useQuery<any[]>({
    queryKey: ["/api/personal-records"],
    enabled: !!user,
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: mastery = [] } = useQuery<any[]>({
    queryKey: ["/api/mastery"],
    enabled: !!user,
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: recovery = {} } = useQuery<Record<string, number>>({
    queryKey: ["/api/recovery"],
    enabled: !!user,
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem("selectedHistorySession");
      if (raw) {
        const parsed = JSON.parse(raw) as WorkoutDetailData;
        setHistoryWorkout(parsed);
      }
    } catch (error) {
      console.warn("Unable to load stored workout detail", error);
    }
  }, []);

  const activeWorkout = historyWorkout ?? workout;

  // Get framework config if available
  const frameworkConfig = activeWorkout?.framework
    ? FRAMEWORK_CONFIGS[activeWorkout.framework as Framework]
    : null;
  const FrameworkIcon = activeWorkout?.framework
    ? FRAMEWORK_ICONS[activeWorkout.framework as Framework]
    : null;

  if (isLoading && !historyWorkout) {
    return (
      <MobileLayout hideNav>
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </MobileLayout>
    );
  }

  if (!activeWorkout) {
    return (
      <MobileLayout hideNav>
        <div className="flex items-center justify-center h-full p-6 text-center">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">No Workout Ready</h2>
            <p className="text-muted-foreground max-w-xs mx-auto">
              Let&rsquo;s build your next HIIT session. Generate a workout to view the full details and start training.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                onClick={() => setLocation("/workout-lab")}
                className="bg-primary text-black"
                data-testid="button-generate-workout"
              >
                Generate a Workout
              </Button>
              <Button variant="outline" onClick={() => setLocation("/")}>
                Go Home
              </Button>
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout hideNav>
      <div className="h-full flex flex-col bg-black">
        {/* Header */}
        <div className="p-4 flex justify-between items-center border-b border-border/20">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} data-testid="button-back">
            <ArrowLeft />
          </Button>
          <h2 className="text-sm font-bold uppercase tracking-widest">Workout Preview</h2>
          <Button variant="ghost" size="icon" onClick={() => refetch()} data-testid="button-regenerate">
            <RotateCw size={20} />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Framework Header */}
          {frameworkConfig && FrameworkIcon && (
            <Card className="p-4 bg-gradient-to-br from-primary/20 to-transparent border-primary/30">
              <div className="flex items-start gap-3 mb-3">
                <div className="h-12 w-12 rounded-lg bg-primary/20 border border-primary flex items-center justify-center flex-shrink-0">
                  <FrameworkIcon className="text-primary w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-white">{frameworkConfig.fullName}</h2>
                    <Badge variant="outline" className="text-xs">
                      {frameworkConfig.name}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {frameworkConfig.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="secondary" className="text-xs">
                  {frameworkConfig.keyFeature}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    frameworkConfig.intensityLevel === "high"
                      ? "border-red-500/50 text-red-400"
                      : frameworkConfig.intensityLevel === "moderate"
                      ? "border-yellow-500/50 text-yellow-400"
                      : "border-green-500/50 text-green-400"
                  }
                >
                  {frameworkConfig.intensityLevel} intensity
                </Badge>
              </div>
            </Card>
          )}

          {/* Summary */}
          <div className="text-center space-y-2">
            <h1 className="text-5xl font-display font-bold text-white uppercase">{activeWorkout.focusLabel}</h1>
            <p className="text-xl text-muted-foreground">
              {activeWorkout.durationMinutes} Min {frameworkConfig?.name ?? "HIIT"}
            </p>
            <div className="inline-block px-4 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-sm font-bold uppercase">
              {activeWorkout.difficultyTag}
            </div>
          </div>

          {(activeWorkout as WorkoutDetailData)?.notes || (activeWorkout as WorkoutDetailData)?.perceivedExertion ? (
            <Card className="p-4 bg-card/40 border-border/50 text-left space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase text-muted-foreground">Session feedback</p>
                {(activeWorkout as WorkoutDetailData)?.perceivedExertion ? (
                  <Badge variant="secondary" className="text-xs">
                    RPE {(activeWorkout as WorkoutDetailData).perceivedExertion}
                  </Badge>
                ) : null}
              </div>
              {(activeWorkout as WorkoutDetailData)?.notes ? (
                <p className="text-sm text-white leading-relaxed">{(activeWorkout as WorkoutDetailData).notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No notes recorded for this workout.</p>
              )}
            </Card>
          ) : null}

          {/* Exercise List */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Exercises</h3>
            {activeWorkout.rounds.map((round: any, idx: number) => {
              const pr = personalRecords.find((pr: any) => pr.exerciseName === round.exerciseName);
              const masteryRecord = mastery.find((m: any) => m.exerciseName === round.exerciseName);
              const recoveryScore = recovery[round.targetMuscleGroup];
              const isPROpportunity = pr ? (round.isHold 
                ? (pr.bestSeconds === null || round.reps >= (pr.bestSeconds * 0.9))
                : (pr.bestReps === null || round.reps >= (pr.bestReps * 0.9))
              ) : true;

              return (
                <Card key={idx} className="p-4 bg-card/40 border-border/40">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center font-display text-lg font-bold text-primary">
                        {round.minuteIndex}
                      </div>
                      <div>
                        <h4 className="font-bold text-white">{round.exerciseName}</h4>
                        <p className="text-xs text-muted-foreground capitalize">{round.targetMuscleGroup}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {activeWorkout.framework === "Tabata" ? (
                        <>
                          <span className="text-2xl font-display font-bold text-white">{activeWorkout.workSeconds ?? 20}s</span>
                          <p className="text-xs text-muted-foreground uppercase">
                            Interval • {activeWorkout.sets || 8} rounds
                          </p>
                          {round.reps ? (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Target ~{round.reps} reps
                            </p>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <span className="text-2xl font-display font-bold text-white">{round.reps}</span>
                          <p className="text-xs text-muted-foreground uppercase">
                            {(round as any).isHold ? "Seconds" : (round as any).alternatesSides ? `Reps (${round.reps / 2}/leg)` : "Reps"}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* PR and Mastery indicators */}
                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    {isPROpportunity && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/20 rounded text-[10px]">
                        <Trophy className="w-3 h-3 text-primary" />
                        <span className="text-primary font-bold">PR Opportunity</span>
                      </div>
                    )}
                    {masteryRecord && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-secondary/30 border border-border/40 rounded text-[10px]">
                        <Target className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Mastery: {Math.round(masteryRecord.masteryScore)}%</span>
                      </div>
                    )}
                    {recoveryScore !== undefined && recoveryScore < 0.5 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded text-[10px]">
                        <Activity className="w-3 h-3 text-amber-400" />
                        <span className="text-amber-400">Low Recovery</span>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="p-6 border-t border-border/20">
          <Button
            className="w-full h-14 text-lg font-bold uppercase tracking-wider bg-primary text-black hover:bg-primary/90"
            onClick={() => setLocation("/workout/runner")}
            data-testid="button-start-workout"
          >
            <Play className="w-5 h-5 mr-2 fill-current" />
            Start {activeWorkout.framework || "HIIT"}
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}
