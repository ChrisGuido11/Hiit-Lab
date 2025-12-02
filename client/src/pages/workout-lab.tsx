import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Zap, Flame, Infinity, RotateCw as Repeat, ArrowRight, RotateCw } from "lucide-react";
import MobileLayout from "@/components/layout/mobile-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { FRAMEWORK_CONFIGS, Framework, getAllFrameworks } from "@/../../shared/frameworks";
import type { GeneratedWorkout, WorkoutSession, Profile as ProfileModel } from "@/../../shared/schema";
import { getQueryFn } from "@/lib/queryClient";

// Icon mapping for frameworks
const FRAMEWORK_ICONS: Record<Framework, typeof Zap> = {
  EMOM: Zap,
  Tabata: Flame,
  AMRAP: Infinity,
  Circuit: Repeat,
};

function getWorkoutSummaryMeta(workout: GeneratedWorkout) {
  switch (workout.framework) {
    case "EMOM":
      return {
        formatLabel: "EMOM",
        countLabel: "minutes",
      };
    case "Tabata":
      return {
        formatLabel: "Tabata",
        countLabel: "intervals",
      };
    case "AMRAP":
      return {
        formatLabel: "AMRAP",
        countLabel: "exercises in circuit",
      };
    case "Circuit":
      return {
        formatLabel: "Circuit",
        countLabel: "intervals",
      };
    default:
      return {
        formatLabel: workout.framework,
        countLabel: "rounds",
      };
  }
}

export default function WorkoutLab() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedFramework, setSelectedFramework] = useState<Framework | null>(null);
  const [generatedWorkout, setGeneratedWorkout] = useState<GeneratedWorkout | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [sessionIntent, setSessionIntent] = useState<{
    energyLevel?: "low" | "moderate" | "high";
    focusToday?: string;
    intentNote?: string;
  } | null>(null);

  const { data: profile } = useQuery<ProfileModel | null>({
    queryKey: ["/api/profile"],
    enabled: !!user,
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: history = [] } = useQuery<WorkoutSession[] | null>({
    queryKey: ["/api/workout/history"],
    enabled: !!user,
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const historyData = history ?? [];
  const sortedHistory = [...historyData].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);

  const dateKey = (date: Date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized.toDateString();
  };

  const uniqueWorkoutDays = Array.from(
    new Set(sortedHistory.map((session) => dateKey(new Date(session.createdAt))))
  ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  let currentStreak = 0;
  let previousDate: Date | null = null;

  uniqueWorkoutDays.forEach((day) => {
    const currentDate = new Date(day);
    if (!previousDate) {
      currentStreak = 1;
    } else {
      const diffDays = Math.round(
        (previousDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      currentStreak = diffDays === 1 ? currentStreak + 1 : 1;
    }
    previousDate = currentDate;
  });

  const weeklySessions = sortedHistory.filter(
    (session) => new Date(session.createdAt).getTime() >= weekStart.getTime()
  );

  const daysSinceLastWorkout = useMemo(() => {
    if (!sortedHistory[0]) return Infinity;
    const last = new Date(sortedHistory[0].createdAt);
    const diffMs = today.getTime() - last.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }, [sortedHistory, today]);

  const plannedSessionsPerWeek = useMemo(() => {
    const level = profile?.fitnessLevel?.toLowerCase();
    if (level === "advanced") return 5;
    if (level === "intermediate") return 4;
    return 3;
  }, [profile?.fitnessLevel]);

  const missedPlannedSessions = Math.max(plannedSessionsPerWeek - weeklySessions.length, 0);
  const streakIsFragile = currentStreak <= 2 || daysSinceLastWorkout >= 3;

  const dropOffRisk = useMemo(() => {
    const reasons: string[] = [];
    if (missedPlannedSessions >= 2) reasons.push("Missed multiple planned sessions this week");
    if (daysSinceLastWorkout >= 4) reasons.push("No check-ins for 4+ days");
    if (currentStreak <= 1) reasons.push("Streak reset risk");

    let level: "low" | "medium" | "high" = "low";
    if (reasons.length >= 2 || daysSinceLastWorkout >= 5) level = "high";
    else if (reasons.length === 1 || streakIsFragile) level = "medium";

    return { level, reasons };
  }, [currentStreak, daysSinceLastWorkout, missedPlannedSessions, streakIsFragile]);

  const streakSaverTemplates = [
    {
      id: "express-reset",
      title: "10-min streak saver",
      detail: "Low-impact EMOM to keep the chain alive",
      energyLevel: "low" as const,
      focusToday: "quick cardio + core",
      intentNote: "Short + easy on purpose—just move and finish",
      badge: "10 min",
    },
    {
      id: "mobility-breath",
      title: "Mobility & breath",
      detail: "Gentle flow to recover and log the day",
      energyLevel: "low" as const,
      focusToday: "mobility and breathwork",
      intentNote: "Restore, stretch, and keep streak momentum",
      badge: "Light day",
    },
    {
      id: "low-impact-circuit",
      title: "Low-impact circuit",
      detail: "12-min circuit with easier ramps to stay engaged",
      energyLevel: "moderate" as const,
      focusToday: "low impact full body",
      intentNote: "Ease back in without crushing intensity",
      badge: "12 min",
    },
  ];

  // Generate workout for selected framework
  const generateMutation = useMutation({
    mutationFn: async (framework: Framework) => {
      const res = await fetch(`/api/workout/generate?framework=${framework}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to generate workout");
      return res.json() as Promise<GeneratedWorkout>;
    },
    onSuccess: (data, framework) => {
      setGeneratedWorkout(data);
      setSelectedFramework(framework);

      // Cache the workout for detail screen
      queryClient.setQueryData(["/api/workout/generate"], data);

      const meta = getWorkoutSummaryMeta(data);
      toast({
        title: `${meta.formatLabel} Workout Generated!`,
        description: `${data.durationMinutes} min • ${data.rounds.length} ${meta.countLabel}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Could not generate workout",
        variant: "destructive",
      });
    },
  });

  const handleFrameworkSelect = (framework: Framework) => {
    generateMutation.mutate(framework);
  };

  const handleRegenerate = () => {
    if (selectedFramework) {
      generateMutation.mutate(selectedFramework);
    }
  };

  const handleStartWorkout = () => {
    if (generatedWorkout) {
      setLocation("/workout");
    }
  };

  const handleProfileSetup = () => {
    setLocation("/onboarding");
  };

  const handleReturnHome = () => {
    setLocation("/");
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = streakSaverTemplates.find((item) => item.id === templateId);
    if (!template) return;
    setActiveTemplateId(template.id);
    setSessionIntent({
      energyLevel: template.energyLevel,
      focusToday: template.focusToday,
      intentNote: template.intentNote,
    });
    generateMutation.mutate("EMOM"); // Default to EMOM for streak savers
  };

  const handleResetTemplate = () => {
    setActiveTemplateId(null);
    setSessionIntent(null);
  };

  if (!profile) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center h-full p-6 text-center">
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-3">Complete Your Profile</h2>
              <p className="text-muted-foreground">Set up your profile to access the Workout Lab</p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                className="w-full bg-primary text-black hover:bg-primary/90 font-bold"
                onClick={handleProfileSetup}
              >
                Start Profile Setup
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground hover:text-primary"
                onClick={handleReturnHome}
              >
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="p-6 pb-24 space-y-6">
        {/* Header */}
        <div>
          <p className="text-muted-foreground font-medium uppercase tracking-wider text-sm">
            Workout Lab
          </p>
          <h1 className="text-4xl font-bold text-white leading-tight mt-1">
            CHOOSE YOUR <br />
            <span className="text-primary neon-text">FRAMEWORK</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            Select a training style and generate a personalized AI workout
          </p>
        </div>

        {/* Framework Grid */}
        <div className="grid grid-cols-2 gap-4">
          {getAllFrameworks().map((frameworkId) => {
            const config = FRAMEWORK_CONFIGS[frameworkId];
            const Icon = FRAMEWORK_ICONS[frameworkId];
            const isSelected = selectedFramework === frameworkId;
            const isGenerating = generateMutation.isPending && generateMutation.variables === frameworkId;

            return (
              <Card
                key={frameworkId}
                className={cn(
                  "relative overflow-hidden border cursor-pointer transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20",
                  isSelected && "border-primary shadow-lg shadow-primary/30"
                )}
                onClick={() => handleFrameworkSelect(frameworkId)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative z-10 p-5 flex flex-col h-48 justify-between">
                  <div className="flex justify-between items-start">
                    <div className={cn(
                      "w-12 h-12 rounded-lg flex items-center justify-center transition-colors",
                      isSelected ? "bg-primary/20 border border-primary" : "bg-secondary/50"
                    )}>
                      <Icon className={cn(
                        "w-6 h-6 transition-colors",
                        isSelected ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>

                    {isSelected && (
                      <Badge variant="default" className="bg-primary text-black text-xs">
                        Selected
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">
                      {config.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {config.shortDescription}
                    </p>

                    <div className="flex gap-2 text-xs">
                      <Badge variant="outline" className="text-[10px] px-2 py-0">
                        {config.defaultDuration} min
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-2 py-0",
                          config.intensityLevel === "high" && "border-red-500/50 text-red-400",
                          config.intensityLevel === "moderate" && "border-yellow-500/50 text-yellow-400",
                          config.intensityLevel === "low" && "border-green-500/50 text-green-400"
                        )}
                      >
                        {config.intensityLevel}
                      </Badge>
                    </div>
                  </div>
                </div>

                {isGenerating && (
                  <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
                    <div className="text-sm text-primary animate-pulse">Generating...</div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Generated Workout Preview */}
        {generatedWorkout && selectedFramework && (
          <Card className="relative overflow-hidden border-0 mt-6">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent z-0" />

            <div className="relative z-10 p-6 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{FRAMEWORK_CONFIGS[selectedFramework].icon}</span>
                    <h2 className="text-2xl font-bold text-white uppercase">
                      {FRAMEWORK_CONFIGS[selectedFramework].fullName}
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {FRAMEWORK_CONFIGS[selectedFramework].description}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={generateMutation.isPending}
                  className="text-muted-foreground hover:text-primary"
                >
                  <RotateCw size={16} className={cn(generateMutation.isPending && "animate-spin")} />
                </Button>
              </div>

              <div className="bg-black/30 backdrop-blur-sm rounded-lg p-4 mb-4">
                <h3 className="text-xl font-bold text-white mb-2">
                  {generatedWorkout.focusLabel} HIIT
                </h3>
                <p className="text-gray-300 text-sm mb-3">
                  {generatedWorkout.durationMinutes} Min • {generatedWorkout.rounds.length} Exercises • {generatedWorkout.difficultyTag}
                </p>

                {/* Exercise Preview (first 3) */}
                <div className="space-y-2">
                  {generatedWorkout.rounds.slice(0, 3).map((round, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-white">{round.exerciseName}</span>
                      <span className="text-muted-foreground">{round.reps} reps</span>
                    </div>
                  ))}
                  {generatedWorkout.rounds.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      + {generatedWorkout.rounds.length - 3} more exercises
                    </p>
                  )}
                </div>
              </div>

              <Button
                className="w-full bg-primary text-black hover:bg-primary/90 font-bold uppercase tracking-wider"
                onClick={handleStartWorkout}
              >
                View Full Workout <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        )}

        {/* Info Card - Show when no workout generated */}
        {!generatedWorkout && (
          <Card className="p-5 bg-card/30 border-border/50">
            <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-wider">
              How It Works
            </h3>
            <ol className="text-sm text-muted-foreground space-y-2">
              <li className="flex gap-2">
                <span className="text-primary font-bold">1.</span>
                <span>Tap a framework above to generate a personalized workout</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">2.</span>
                <span>Review the AI-generated plan based on your goals and equipment</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">3.</span>
                <span>Hit regenerate if you want a different variation</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">4.</span>
                <span>Start your workout when ready!</span>
              </li>
            </ol>
          </Card>
        )}

        {/* Framework Descriptions */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Framework Guide
          </h3>
          {getAllFrameworks().map((frameworkId) => {
            const config = FRAMEWORK_CONFIGS[frameworkId];
            return (
              <Card key={frameworkId} className="p-4 bg-card/30 border-border/50">
                <div className="flex items-start gap-3">
                  <span className="text-xl">{config.icon}</span>
                  <div className="flex-1">
                    <h4 className="font-bold text-white text-sm mb-1">{config.fullName}</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      {config.keyFeature}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {config.bestFor.slice(0, 2).map((goal) => (
                        <Badge key={goal} variant="secondary" className="text-[10px] px-2 py-0">
                          {goal}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Drop-off Risk */}
        <Card className="p-4 bg-gradient-to-r from-secondary/40 to-card/70 border-border/60 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-bold tracking-wider text-primary">Drop-off Risk</p>
              <h3 className="text-xl font-bold text-white">{dropOffRisk.level === "high" ? "High" : dropOffRisk.level === "medium" ? "Medium" : "Low"} risk</h3>
              <p className="text-xs text-muted-foreground">{plannedSessionsPerWeek} planned sessions / week • Missed {missedPlannedSessions} so far</p>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                dropOffRisk.level === "high"
                  ? "bg-red-500/20 text-red-200 border border-red-500/40"
                  : dropOffRisk.level === "medium"
                    ? "bg-amber-500/20 text-amber-100 border border-amber-500/30"
                    : "bg-emerald-500/20 text-emerald-100 border border-emerald-500/30"
              }`}
            >
              {dropOffRisk.level} risk
            </div>
          </div>
          <div className="text-sm text-gray-300 space-y-2">
            {dropOffRisk.reasons.length > 0 ? (
              <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                {dropOffRisk.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-xs">You're on track—keep logging consistent check-ins.</p>
            )}
            <p className="text-[13px] text-white">
              Days since last workout: {Number.isFinite(daysSinceLastWorkout) ? daysSinceLastWorkout : "-"}. {streakIsFragile ? "Let's keep the streak safe." : "Momentum is stable."}
            </p>
          </div>
        </Card>

        {/* Streak Saver */}
        {streakIsFragile && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase font-bold text-primary tracking-wider">Streak Saver</p>
                <h3 className="text-lg font-bold text-white">Choose a lighter template to stay engaged</h3>
                <p className="text-xs text-muted-foreground">Auto-loads lower intensity + mobility friendly workouts.</p>
              </div>
              {activeTemplateId && (
                <Button size="sm" variant="outline" className="text-xs" onClick={handleResetTemplate}>
                  Exit Streak Saver
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {streakSaverTemplates.map((template) => (
                <Card
                  key={template.id}
                  className={`p-4 border ${
                    activeTemplateId === template.id ? "border-primary shadow-lg shadow-primary/20" : "border-border/50"
                  } bg-card/60 hover:border-primary/60 transition-colors cursor-pointer`}
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-base font-bold text-white mb-1">{template.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{template.detail}</p>
                    </div>
                    <span className="text-[11px] px-2 py-1 rounded-full bg-primary/15 text-primary font-bold uppercase tracking-wide">{template.badge}</span>
                  </div>
                  <div className="mt-3 text-[11px] text-gray-300 space-y-1">
                    <p>Energy: {template.energyLevel.toUpperCase()}</p>
                    <p>Focus: {template.focusToday}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
