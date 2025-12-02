import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Brain, CheckCircle2, Share2, Star, Trophy, Target, Activity } from "lucide-react";
import { motion } from "framer-motion";
import MobileLayout from "@/components/layout/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { GeneratedWorkout } from "@/../../shared/schema";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

type RoundActual = {
  actualReps?: number;
  actualSeconds?: number;
  skipped?: boolean;
};

export default function WorkoutComplete() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRPE, setSelectedRPE] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [roundsExpanded, setRoundsExpanded] = useState(false);
  const [roundActuals, setRoundActuals] = useState<Record<number, RoundActual>>({});
  const [newPRs, setNewPRs] = useState<string[]>([]);
  const [intervalsExpanded, setIntervalsExpanded] = useState(false);

  const updateRoundActual = (minuteIndex: number, data: RoundActual) => {
    setRoundActuals((previous: Record<number, RoundActual>) => ({ ...previous, [minuteIndex]: { ...previous[minuteIndex], ...data } }));
  };

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

  const { data: workout, isLoading: isFallbackLoading } = useQuery<GeneratedWorkout | null>({
    queryKey: ["/api/workout/generate"],
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem("latestWorkoutCompletion");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.roundActuals) {
        setRoundActuals(parsed.roundActuals as Record<number, RoundActual>);
      }
      if (!workout && parsed.workout) {
        queryClient.setQueryData(["/api/workout/generate"], parsed.workout as GeneratedWorkout);
      }
    } catch (error) {
      console.warn("Unable to load completion snapshot", error);
    }
  }, [queryClient, workout]);

  const saveWorkoutMutation = useMutation({
    mutationFn: async ({ rpe, notes: sessionNotes }: { rpe: number; notes?: string }) => {
      if (!workout) throw new Error("No workout data");

      const payloadRounds = workout.rounds.map((round) => {
        const actual = roundActuals[round.minuteIndex] || {};
        return {
          ...round,
          actualReps: round.isHold ? undefined : actual.actualReps ?? round.reps,
          actualSeconds: round.isHold ? actual.actualSeconds ?? round.reps : actual.actualSeconds,
          skipped: Boolean(actual.skipped),
        };
      });

      const res = await fetch("/api/workout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          framework: workout.framework,
          durationMinutes: workout.durationMinutes,
          difficultyTag: workout.difficultyTag,
          focusLabel: workout.focusLabel,
          perceivedExertion: rpe,
          rounds: payloadRounds,
          notes,
        }),
        credentials: "include",
      });
      
      if (!res.ok) {
        const responseData = await res.json().catch(() => null);
        const message =
          (responseData && (responseData.message || responseData.error)) ||
          "We couldn't log this session. Please try again.";

        throw new Error(message);
      }

      return res.json();
    },
    onSuccess: async () => {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("latestWorkoutCompletion");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/workout/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/personal-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mastery"] });
      
      // Check for new PRs
      const updatedPRs = await fetch("/api/personal-records", { credentials: "include" })
        .then(res => res.ok ? res.json() : [])
        .catch(() => []);
      
      if (workout && updatedPRs.length > 0) {
        const workoutExercises = new Set(workout.rounds.map((r: any) => r.exerciseName));
        const newPRExercises = updatedPRs
          .filter((pr: any) => workoutExercises.has(pr.exerciseName))
          .map((pr: any) => pr.exerciseName);
        
        if (newPRExercises.length > 0) {
          setNewPRs(newPRExercises);
          toast({
            title: "🎉 New Personal Records!",
            description: `You set ${newPRExercises.length} new PR${newPRExercises.length > 1 ? 's' : ''}!`,
          });
          // Don't redirect immediately if PRs were set - let user see the celebration
          setTimeout(() => setLocation("/"), 3000);
          return;
        }
      }
      
      // Clear the workout cache completely so it doesn't show old workouts
      queryClient.removeQueries({ queryKey: ["/api/workout/generate"] });
      toast({
        title: "Workout logged!",
        description: "We use your sessions to personalize and improve your plan.",
      });
      setTimeout(() => setLocation("/"), 1000);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const shareSummary = useMemo(() => {
    if (!workout) return "";

    const roundsSummary = workout.rounds
      .map(
        (round) =>
          `• Min ${round.minuteIndex}: ${round.exerciseName} (${round.reps} reps, ${round.targetMuscleGroup})`,
      )
      .join("\n");

    const noteLine = notes.trim() ? `\nNotes: ${notes.trim()}` : "";

    return [
      "Workout Complete!",
      `Focus: ${workout.focusLabel}`,
      `Framework: ${workout.framework}`,
      `Duration: ${workout.durationMinutes} minutes`,
      "Rounds:",
      roundsSummary,
      noteLine,
    ]
      .filter(Boolean)
      .join("\n");
  }, [notes, workout]);

  const handleSave = () => {
    if (selectedRPE) {
      saveWorkoutMutation.mutate({ rpe: selectedRPE, notes });
    }
  };

  const handleShare = async () => {
    if (!shareSummary) return;

    try {
      if (navigator.share) {
        await navigator.share({ title: "Workout Summary", text: shareSummary });
        toast({ title: "Shared!", description: "Workout summary shared successfully." });
        return;
      }

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareSummary);
        toast({ title: "Copied!", description: "Workout summary copied to clipboard." });
        return;
      }

      toast({
        title: "Sharing unavailable",
        description: "Clipboard access is not available on this device.",
        variant: "destructive",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to share right now.";
      toast({ title: "Share failed", description: message, variant: "destructive" });
    }
  };

  if (!workout && isFallbackLoading) {
    return (
      <MobileLayout hideNav>
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </MobileLayout>
    );
  }

  if (!workout) {
    return (
      <MobileLayout hideNav>
        <div className="flex items-center justify-center h-full">
          <Button onClick={() => setLocation("/")} className="bg-primary text-black">
            Go Home
          </Button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout hideNav>
      <div className="min-h-full flex flex-col items-center p-6 pt-8 pb-32 text-center space-y-8 bg-black">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary neon-border"
        >
          <CheckCircle2 className="w-16 h-16 text-primary" />
        </motion.div>
        
        <div>
          <h1 className="text-5xl font-bold text-white mb-2">CRUSHED IT!</h1>
          <p className="text-xl text-muted-foreground">Workout Complete</p>
        </div>

        {/* PR Celebration */}
        {newPRs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
          >
            <Card className="p-6 bg-gradient-to-r from-primary/20 to-primary/10 border-primary/40">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Trophy className="w-8 h-8 text-primary" />
                <h2 className="text-2xl font-bold text-primary">New Personal Records!</h2>
              </div>
              <div className="space-y-2">
                {newPRs.map((exerciseName) => (
                  <div key={exerciseName} className="flex items-center justify-center gap-2 p-2 bg-primary/10 rounded">
                    <Star className="w-4 h-4 text-primary fill-primary" />
                    <span className="font-bold text-white">{exerciseName}</span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Mastery Progress */}
        {mastery && mastery.length > 0 && workout && (() => {
          const workoutExercises = new Set(workout.rounds.map((r: any) => r.exerciseName));
          const relevantMastery = mastery.filter((m: any) => workoutExercises.has(m.exerciseName));
          const improvedMastery = relevantMastery.filter((m: any) => m.masteryScore >= 70);
          
          return improvedMastery.length > 0 ? (
            <Card className="p-4 bg-card/40 border-border/40 w-full">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-white">Mastery Progress</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {improvedMastery.length} exercise{improvedMastery.length > 1 ? 's' : ''} showing strong mastery (70%+)
              </p>
            </Card>
          ) : null;
        })()}

        <div className="grid grid-cols-2 gap-4 w-full">
          <Card className="p-4 bg-card border-border/50 text-center">
            <span className="text-3xl font-display font-bold text-white">{workout.durationMinutes}</span>
            <p className="text-xs uppercase text-muted-foreground">Minutes</p>
          </Card>
          <Card className="p-4 bg-card border-border/50 text-center">
            <span className="text-3xl font-display font-bold text-white">{workout.durationMinutes * 15}</span>
            <p className="text-xs uppercase text-muted-foreground">Est. Cals</p>
          </Card>
        </div>

        <div className="w-full rounded-xl border border-primary/40 bg-primary/5 p-4 text-left flex gap-3 items-start">
          <div className="p-2 rounded-full bg-primary/20 border border-primary/40">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">Help the coach learn</p>
            <p className="text-sm text-muted-foreground">
              Logging your workout teaches the AI what works for you so upcoming sessions get
              smarter and more personalized.
            </p>
          </div>
        </div>

        {/* RPE Selection */}
        <div className="w-full space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-bold text-white mb-1">How hard was it?</h3>
            <p className="text-sm text-muted-foreground">Rate your perceived exertion (1-5)</p>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((rpe) => (
              <button
                key={rpe}
                onClick={() => setSelectedRPE(rpe)}
                className={cn(
                  "aspect-square rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1",
                  selectedRPE === rpe
                    ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(0,229,255,0.2)]"
                    : "border-border/50 bg-card/50 hover:border-primary/50"
                )}
                data-testid={`rpe-${rpe}`}
              >
                <Star className={cn(
                  "w-6 h-6",
                  selectedRPE === rpe ? "text-primary fill-primary" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "text-lg font-display font-bold",
                  selectedRPE === rpe ? "text-primary" : "text-muted-foreground"
                )}>
                  {rpe}
                </span>
              </button>
            ))}
          </div>

          <div className="flex justify-between text-xs text-muted-foreground px-1">
            <span>Too Easy</span>
            <span>Perfect</span>
            <span>Too Hard</span>
          </div>
        </div>

        {/* Interval Logging Section */}
        <div className="w-full space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-bold text-white mb-1">Log Your Intervals</h3>
            <p className="text-sm text-muted-foreground">Tell the coach how it actually went.</p>
          </div>

          <Card className="w-full bg-card border-border/50 p-4 space-y-3 text-left">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase text-muted-foreground">Adjust Actual Performance</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs text-primary hover:text-primary"
                onClick={() => setIntervalsExpanded((previous) => !previous)}
              >
                {intervalsExpanded ? "Hide all" : "View all"}
              </Button>
            </div>

            <div className="space-y-2">
              {(intervalsExpanded ? workout.rounds : workout.rounds.slice(0, 3)).map((round) => {
                const currentActual = roundActuals[round.minuteIndex] || {};
                return (
                  <div
                    key={`${round.minuteIndex}-${round.exerciseName}`}
                    className="space-y-3 rounded-xl border border-border/40 bg-muted/5 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{round.exerciseName}</p>
                        <p className="text-xs text-muted-foreground">
                          Minute {round.minuteIndex} • Target: {round.reps} {(round as any).isHold ? "seconds" : "reps"}
                        </p>
                      </div>
                      <Button
                        variant={currentActual.skipped ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          updateRoundActual(round.minuteIndex, {
                            skipped: !currentActual.skipped,
                            actualReps: (round as any).isHold ? undefined : round.reps,
                            actualSeconds: (round as any).isHold ? round.reps : undefined,
                          })
                        }
                      >
                        {currentActual.skipped ? "Skipped" : "Mark Skip"}
                      </Button>
                    </div>

                    {!currentActual.skipped ? (
                      <div className="flex items-center gap-3">
                        <Label className="text-sm text-muted-foreground whitespace-nowrap">
                          Actual {(round as any).isHold ? "seconds" : "reps"}
                        </Label>
                        <input
                          type="number"
                          min={0}
                          className="w-28 rounded-lg border border-border/50 bg-card px-3 py-2 text-white"
                          value={
                            (round as any).isHold
                              ? currentActual.actualSeconds ?? round.reps
                              : currentActual.actualReps ?? round.reps
                          }
                          onChange={(event) => {
                            const value = Math.max(0, Number(event.target.value));
                            updateRoundActual(round.minuteIndex, {
                              actualReps: (round as any).isHold ? currentActual.actualReps : value,
                              actualSeconds: (round as any).isHold ? value : currentActual.actualSeconds,
                              skipped: false,
                            });
                          }}
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">We'll down-weight this move in future plans.</p>
                    )}
                  </div>
                );
              })}
              {!intervalsExpanded && workout.rounds.length > 3 ? (
                <p className="text-xs text-muted-foreground text-center">
                  +{workout.rounds.length - 3} more intervals
                </p>
              ) : null}
            </div>
          </Card>
        </div>

        <Card className="w-full bg-card border-border/50 p-4 space-y-4 text-left">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs uppercase text-muted-foreground">Focus</p>
              <p className="text-lg font-semibold text-white">{workout.focusLabel}</p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-xs uppercase text-muted-foreground">Framework</p>
              <p className="text-lg font-semibold text-white">{workout.framework}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase text-muted-foreground">Round Recap</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs text-primary hover:text-primary"
                onClick={() => setRoundsExpanded((previous) => !previous)}
              >
                {roundsExpanded ? "Hide details" : "View details"}
              </Button>
            </div>
            <div className="space-y-2">
              {(roundsExpanded ? workout.rounds : workout.rounds.slice(0, 2)).map((round) => (
                <div
                  key={`${round.minuteIndex}-${round.exerciseName}`}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border/40 bg-card/40 p-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">Minute {round.minuteIndex}</p>
                    <p className="text-sm text-muted-foreground">{round.exerciseName}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-white">{round.reps} reps</p>
                    <p className="capitalize">{round.targetMuscleGroup}</p>
                    <p className="capitalize">{round.difficulty}</p>
                  </div>
                </div>
              ))}
              {!roundsExpanded && workout.rounds.length > 2 ? (
                <p className="text-xs text-muted-foreground text-center">
                  +{workout.rounds.length - 2} more rounds — keep exploring!
                </p>
              ) : null}
            </div>
          </div>
        </Card>

        <div className="w-full space-y-3 text-left">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Session Notes (optional)</p>
              <p className="text-xs text-muted-foreground">Capture how you felt or adjustments you made.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-primary/50 text-primary"
              onClick={handleShare}
              disabled={!shareSummary || saveWorkoutMutation.isPending}
            >
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
          </div>
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="What stood out about this workout?"
            className="bg-card border-border/50 text-white placeholder:text-muted-foreground"
            rows={3}
          />
        </div>

        <div className="fixed bottom-0 left-0 right-0 px-6 pb-6 pt-4 bg-gradient-to-t from-black via-black/95 to-transparent">
          <Button
            className="w-full h-14 text-lg font-bold uppercase tracking-wider bg-primary text-black hover:bg-primary/90"
            onClick={handleSave}
            disabled={!selectedRPE || saveWorkoutMutation.isPending}
            data-testid="button-save"
          >
            {saveWorkoutMutation.isPending ? "Logging..." : "Log Workout"}
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}
