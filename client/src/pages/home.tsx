import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Play, TrendingUp, Flame, Clock, ArrowRight, RotateCw, Beaker, Flame as FlameIcon, Zap, Trophy, Target, Activity } from "lucide-react";
import MobileLayout from "@/components/layout/mobile-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import type {
  GeneratedWorkout,
  Profile as ProfileModel,
  TimeBlock,
  WorkoutSession,
} from "@/../../shared/schema";
import { getQueryFn } from "@/lib/queryClient";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis } from "recharts";

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

function getCurrentTimeBlock(): TimeBlock {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function formatTimeBlockLabel(block?: TimeBlock | null): string {
  if (!block) return "";
  return block.charAt(0).toUpperCase() + block.slice(1);
}

export default function Home() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [sessionIntent, setSessionIntent] = useState<{
    energyLevel?: "low" | "moderate" | "high";
    focusToday?: string;
    intentNote?: string;
  } | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [user, authLoading, toast]);

  const { data: profile, isLoading: profileLoading } = useQuery<ProfileModel | null>({
    queryKey: ["/api/profile"],
    enabled: !!user,
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const workoutUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (sessionIntent?.energyLevel) params.set("energyLevel", sessionIntent.energyLevel);
    if (sessionIntent?.focusToday) params.set("focusToday", sessionIntent.focusToday);
    if (sessionIntent?.intentNote) params.set("intentNote", sessionIntent.intentNote);
    const query = params.toString();
    return `/api/workout/generate${query ? `?${query}` : ""}`;
  }, [sessionIntent]);

  const { data: workout, isLoading: workoutLoading, refetch: regenerateWorkout } = useQuery<GeneratedWorkout>({
    queryKey: [workoutUrl],
    enabled: !!profile,
    retry: false,
  });

  const { data: history = [] } = useQuery<WorkoutSession[] | null>({
    queryKey: ["/api/workout/history"],
    enabled: !!user,
    queryFn: getQueryFn({ on401: "returnNull" }),
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

  const historyData = history ?? [];

  const sortedHistory = [...historyData].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const currentTimeBlock = getCurrentTimeBlock();
  const optimalTimeBlock = profile?.optimalTimeBlock;
  const timeBlockPerformance = profile?.timeBlockPerformance;
  const optimalBlockPerformance =
    optimalTimeBlock && timeBlockPerformance ? timeBlockPerformance[optimalTimeBlock] : undefined;
  const recommendedTimeBlock = workout?.recommendedTimeBlock ?? optimalTimeBlock ?? currentTimeBlock;

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
  let bestStreak = 0;
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
    bestStreak = Math.max(bestStreak, currentStreak);
    previousDate = currentDate;
  });

  const streakNextBadge = Math.max(currentStreak + 1, bestStreak + 1);

  const weeklyVolumeData = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const key = dateKey(date);
    const minutes = sortedHistory
      .filter((session) => dateKey(new Date(session.createdAt)) === key)
      .reduce((sum, session) => sum + session.durationMinutes, 0);

    return {
      day: date.toLocaleDateString(undefined, { weekday: "short" }),
      minutes,
    };
  });

  const weeklyMinutes = weeklyVolumeData.reduce((sum, day) => sum + day.minutes, 0);

  const rpeTrendData = sortedHistory
    .filter((session) => typeof session.perceivedExertion === "number")
    .slice(0, 7)
    .reverse()
    .map((session, index) => ({
      label: `S${index + 1}`,
      rpe: session.perceivedExertion ?? 0,
      difficulty: session.difficultyTag,
      date: new Date(session.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
    }));

  const averageRpe =
    rpeTrendData.length > 0
      ? rpeTrendData.reduce((sum, entry) => sum + entry.rpe, 0) / rpeTrendData.length
      : null;

  const rpeChange =
    rpeTrendData.length > 1
      ? rpeTrendData[rpeTrendData.length - 1].rpe - rpeTrendData[0].rpe
      : 0;

  const weeklySessions = sortedHistory.filter(
    (session) => new Date(session.createdAt).getTime() >= weekStart.getTime()
  );

  const recentActivity = weeklySessions.length > 0 ? weeklySessions : sortedHistory.slice(0, 5);

  const totalWorkouts = historyData.length;
  const totalMinutes = historyData.reduce((sum, session) => sum + session.durationMinutes, 0);

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

  const handleTemplateSelect = (templateId: string) => {
    const template = streakSaverTemplates.find((item) => item.id === templateId);
    if (!template) return;
    setActiveTemplateId(template.id);
    setSessionIntent({
      energyLevel: template.energyLevel,
      focusToday: template.focusToday,
      intentNote: template.intentNote,
    });
    regenerateWorkout();
  };

  const handleResetTemplate = () => {
    setActiveTemplateId(null);
    setSessionIntent(null);
    regenerateWorkout();
  };

  if (authLoading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </MobileLayout>
    );
  }

  if (profileLoading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading profile...</div>
        </div>
      </MobileLayout>
    );
  }

  if (!profile) {
    return (
      <MobileLayout hideNav>
        <div className="flex items-center justify-center h-full p-6 text-center">
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Welcome!</h2>
            <p className="text-muted-foreground mb-6">Complete your profile to start training</p>
            <Link href="/onboarding">
              <Button className="bg-primary text-black hover:bg-primary/90">
                Complete Onboarding
              </Button>
            </Link>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="p-6 pb-24 space-y-10">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-muted-foreground font-medium uppercase tracking-wider text-sm">{getTimeGreeting()}</p>
            <h1 className="text-4xl font-bold text-white leading-none mt-1">
              READY TO <br/>
              <span className="text-primary neon-text">SWEAT?</span>
            </h1>
          </div>
        </div>

        {/* Main Action Card - Daily WOD */}
        {workoutLoading ? (
          <Card className="p-6 bg-card/50 border-border/50 h-48 flex items-center justify-center">
            <div className="text-muted-foreground">Generating workout...</div>
          </Card>
        ) : workout ? (
          <Card className="relative overflow-hidden border-0 group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent z-0" />
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517963879466-cd11fa9e5d34?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-20" />

            <div className="relative z-10 p-6 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="bg-primary/20 backdrop-blur-sm px-3 py-1 rounded text-primary text-xs font-bold uppercase tracking-wider border border-primary/20">
                  Daily WOD
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    regenerateWorkout();
                  }}
                  className="text-muted-foreground hover:text-primary"
                  data-testid="button-regenerate"
                >
                  <RotateCw size={16} />
                </Button>
              </div>

              <div>
                <h2 className="text-3xl font-bold text-white mb-1 uppercase">
                  {workout.focusLabel}
                </h2>
                <p className="text-primary text-sm font-bold mb-4 uppercase tracking-wider">
                  {workout.framework}
                </p>
                <p className="text-gray-300 text-sm mb-4">
                  {workout.durationMinutes} Min • {workout.rounds.length} Exercises • {workout.difficultyTag}
                </p>

                {/* PR Opportunities */}
                {personalRecords && workout && (() => {
                  const prMap = new Map(personalRecords.map((pr: any) => [pr.exerciseName, pr]));
                  const prOpportunities = workout.rounds.filter((round: any) => {
                    const pr = prMap.get(round.exerciseName);
                    if (!pr) return true; // No PR exists, any performance is opportunity
                    const currentPR = round.isHold ? pr.bestSeconds : pr.bestReps;
                    if (currentPR === null) return true;
                    const target = round.reps || 1;
                    return target >= (currentPR * 0.9); // Within 10% of PR
                  }).slice(0, 3);
                  
                  return prOpportunities.length > 0 ? (
                    <div className="mb-3 p-2 bg-primary/10 border border-primary/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Trophy className="w-3 h-3 text-primary" />
                        <p className="text-[10px] uppercase font-bold text-primary tracking-wider">PR Opportunities</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {prOpportunities.length} exercise{prOpportunities.length > 1 ? 's' : ''} close to personal records
                      </p>
                    </div>
                  ) : null;
                })()}

                {/* Recovery Hints */}
                {recovery && Object.keys(recovery).length > 0 && (() => {
                  const lowRecovery = Object.entries(recovery).filter(([_, score]) => score < 0.5).slice(0, 2);
                  return lowRecovery.length > 0 ? (
                    <div className="mb-3 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-3 h-3 text-amber-400" />
                        <p className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Recovery Note</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Some muscle groups may need more rest
                      </p>
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Start Button - Always visible at bottom */}
              <div className="mt-6">
                <Link href="/workout">
                  <Button
                    className="w-full h-14 bg-primary text-black hover:bg-primary/90 font-bold uppercase tracking-wider text-lg shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30"
                    data-testid="button-start-workout"
                  >
                    <Play className="w-5 h-5 mr-2 fill-current" /> Start Workout
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        ) : null}

        {/* Workout Lab CTA */}
        <Link href="/workout-lab">
          <Card className="p-5 bg-gradient-to-r from-secondary/50 to-secondary/30 border-border/50 cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <Beaker className="text-primary w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-0.5">Workout Lab</h3>
                  <p className="text-xs text-muted-foreground">
                    Choose from 4 training frameworks
                  </p>
                </div>
              </div>
              <ArrowRight className="text-muted-foreground w-5 h-5" />
            </div>
          </Card>
        </Link>

        {/* Stats Row */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Card className="p-4 bg-card/50 border-border/50 flex flex-col justify-between">
            <TrendingUp className="text-primary w-6 h-6 mb-3" />
            <div>
              <span className="text-3xl font-display font-bold">{totalWorkouts}</span>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Workouts</p>
            </div>
          </Card>
          <Card className="p-4 bg-card/50 border-border/50 flex flex-col justify-between">
            <Clock className="text-primary w-6 h-6 mb-3" />
            <div>
              <span className="text-3xl font-display font-bold">{totalMinutes}</span>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Minutes</p>
            </div>
          </Card>
        </div>

        {/* Streaks & Weekly Stats */}
        <div className="grid gap-4">
          <Card className="p-4 bg-card/50 border-border/50 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setIsStreakModalOpen(true)}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase font-bold text-primary tracking-wider">Streaks</p>
                <h3 className="text-xl font-bold text-white">{currentStreak || 0}-Day Current Streak</h3>
                <p className="text-sm text-muted-foreground">
                  Best streak: {bestStreak || 0} days. Keep going to hit {streakNextBadge}!
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                    Active
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase text-gray-200">
                    Personal Best: {bestStreak || 0}d
                  </span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-secondary/60 border border-border/60 flex items-center justify-center" data-testid="button-streak-modal">
                <FlameIcon className="text-primary" />
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 bg-card/50 border-border/50">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs uppercase font-bold text-primary tracking-wider">Weekly Volume</p>
                  <h3 className="text-lg font-bold text-white">{weeklyMinutes} Min</h3>
                  <p className="text-xs text-muted-foreground">Last 7 days</p>
                </div>
                <div className="px-3 py-1 rounded-full bg-secondary/40 text-xs font-bold uppercase text-gray-200">
                  {weeklySessions.length} Sessions
                </div>
              </div>
              <ChartContainer
                config={{ minutes: { label: "Minutes", color: "hsl(var(--primary))" } }}
                className="h-32"
              >
                <BarChart data={weeklyVolumeData} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                  <Bar dataKey="minutes" fill="var(--color-minutes)" radius={[6, 6, 6, 6]} />
                </BarChart>
              </ChartContainer>
            </Card>

            <Card className="p-4 bg-card/50 border-border/50">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs uppercase font-bold text-primary tracking-wider">RPE Trend</p>
                  <h3 className="text-lg font-bold text-white">
                    {averageRpe !== null ? averageRpe.toFixed(1) : "-"} Avg RPE
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {rpeTrendData.length} recent sessions • {rpeChange > 0 ? "Increasing" : rpeChange < 0 ? "Easing" : "Stable"}
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase text-gray-200">
                  Difficulty: {rpeChange > 0 ? "Climbing" : rpeChange < 0 ? "Dropping" : "Steady"}
                </div>
              </div>
              <ChartContainer
                config={{ rpe: { label: "RPE", color: "hsl(var(--primary))" } }}
                className="h-32"
              >
                <LineChart data={rpeTrendData} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent labelKey="date" />} />
                  <Line
                    type="monotone"
                    dataKey="rpe"
                    stroke="var(--color-rpe)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "var(--color-rpe)" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ChartContainer>
            </Card>
          </div>
        </div>

        {/* Recent Activity Preview */}
        {historyData.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl text-white">Recent Activity</h3>
              <Link href="/profile">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary">
                  View Details
                </Button>
              </Link>
            </div>

            <div className="space-y-3">
              {recentActivity.map((session) => (
                <Card key={session.id} className="p-4 bg-card/30 border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded bg-secondary/50 flex items-center justify-center font-display text-xl font-bold text-muted-foreground">
                      {session.durationMinutes}
                    </div>
                    <div>
                      <h4 className="text-lg leading-none mb-1 capitalize">{session.focusLabel}</h4>
                      <p className="text-xs text-muted-foreground">
                        {session.framework} • {new Date(session.createdAt).toLocaleDateString()} • {session.difficultyTag}
                      </p>
                      {session.perceivedExertion ? (
                        <p className="text-[11px] text-gray-400">RPE {session.perceivedExertion} • {session.durationMinutes} min</p>
                      ) : (
                        <p className="text-[11px] text-gray-400">{session.durationMinutes} min completed</p>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="text-muted-foreground w-5 h-5" />
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* On Fire Streak Modal */}
      <Sheet open={isStreakModalOpen} onOpenChange={setIsStreakModalOpen}>
        <SheetContent side="bottom" className="bg-card border-border/50 sm:max-w-md sm:rounded-t-3xl">
          <SheetHeader className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/40 to-primary/20 flex items-center justify-center border border-primary/50">
                <FlameIcon className="text-primary w-8 h-8" />
              </div>
              <div>
                <SheetTitle className="text-3xl font-display text-white">YOU'RE ON FIRE!</SheetTitle>
                <SheetDescription className="text-primary font-bold mt-1">{currentStreak || 0} Day Streak</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-6">
            {/* Current Streak */}
            <div className="space-y-2">
              <p className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Current Streak</p>
              <div className="grid grid-cols-3 gap-3">
                <Card className="p-4 bg-primary/10 border-primary/30 text-center">
                  <div className="text-3xl font-display font-bold text-primary">{currentStreak || 0}</div>
                  <p className="text-xs text-muted-foreground uppercase mt-1">Days</p>
                </Card>
                <Card className="p-4 bg-secondary/40 border-border/50 text-center">
                  <div className="text-3xl font-display font-bold text-white">{totalWorkouts}</div>
                  <p className="text-xs text-muted-foreground uppercase mt-1">Workouts</p>
                </Card>
                <Card className="p-4 bg-secondary/40 border-border/50 text-center">
                  <div className="text-3xl font-display font-bold text-white">{totalMinutes}</div>
                  <p className="text-xs text-muted-foreground uppercase mt-1">Minutes</p>
                </Card>
              </div>
            </div>

            {/* Personal Records */}
            <div className="space-y-3">
              <p className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Personal Records</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/30">
                  <div className="flex items-center gap-3">
                    <Zap className="text-primary w-5 h-5" />
                    <span className="text-sm font-bold">Best Streak</span>
                  </div>
                  <span className="text-lg font-display font-bold text-primary">{bestStreak || 0}d</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/30">
                  <div className="flex items-center gap-3">
                    <Zap className="text-primary w-5 h-5" />
                    <span className="text-sm font-bold">Next Badge</span>
                  </div>
                  <span className="text-lg font-display font-bold text-primary">{streakNextBadge}d</span>
                </div>
              </div>
            </div>

            {/* Motivation */}
            <div className="p-4 rounded-lg bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/30">
              <p className="text-sm text-white text-center leading-relaxed font-medium">
                {currentStreak >= 7 ? "🔥 You're crushing it! Keep the momentum going!" : currentStreak >= 3 ? "💪 Great work! You're building consistency!" : "🚀 Keep showing up - streaks build champions!"}
              </p>
            </div>

            <Button
              className="w-full bg-primary text-black hover:bg-primary/90 font-bold uppercase tracking-wider"
              onClick={() => setIsStreakModalOpen(false)}
            >
              Keep Going
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </MobileLayout>
  );
}
