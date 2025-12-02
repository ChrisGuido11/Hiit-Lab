import { useMemo } from "react";
import { CalendarCheck2, CalendarClock, Flame, PauseCircle, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { GeneratedWorkout, WorkoutRound, WorkoutSession } from "@/../../shared/schema";
import {
  type MuscleBucket,
  type VolumeBreakdown,
  calculateVolumeFromRounds,
  describeVolumeGaps,
  mergeVolumeTotals,
  primaryFocus,
} from "@/utils/muscle-balance";

export type WorkoutSessionWithRounds = WorkoutSession & { rounds: WorkoutRound[] };

interface PlannerProps {
  history: WorkoutSessionWithRounds[];
  generatedWorkout?: GeneratedWorkout;
}

type PlannerDayStatus = "completed" | "planned" | "rest";

interface PlannerDay {
  date: Date;
  label: string;
  status: PlannerDayStatus;
  focus: MuscleBucket | "balanced";
  volume: VolumeBreakdown;
  source?: string;
}

function getWeekStart(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : 1);
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function dayKey(date: Date): string {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized.toISOString();
}

function buildContrastFocus(previous: MuscleBucket | null, totals: VolumeBreakdown): MuscleBucket | "balanced" {
  const totalEffort = Object.values(totals).reduce((sum, value) => sum + value, 0);

  if (!previous) {
    const bias = primaryFocus(totals);
    return totalEffort === 0 || bias === "other" ? "balanced" : bias;
  }
  if (previous === "legs") return totals.push < totals.pull ? "push" : "pull";
  if (previous === "push") return "legs";
  if (previous === "pull") return "legs";
  return "core";
}

function formatFocusLabel(focus: PlannerDay["focus"]): string {
  if (focus === "balanced") return "Balanced";
  return focus.charAt(0).toUpperCase() + focus.slice(1);
}

function buildPlannerDays(
  history: WorkoutSessionWithRounds[],
  generatedWorkout?: GeneratedWorkout,
): PlannerDay[] {
  const today = new Date();
  const start = getWeekStart(today);
  const days = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });

  const sessionsByDay = new Map<string, WorkoutSessionWithRounds>();
  history.forEach((session) => {
    const key = dayKey(new Date(session.createdAt));
    sessionsByDay.set(key, session);
  });

  let runningFocus: MuscleBucket | null = null;
  let runningTotals: VolumeBreakdown = { push: 0, pull: 0, legs: 0, core: 0, other: 0 };

  return days.map((date) => {
    const key = dayKey(date);
    const session = sessionsByDay.get(key);

    if (session) {
      const volume = calculateVolumeFromRounds(session.rounds);
      runningTotals = mergeVolumeTotals(runningTotals, volume);
      const focus = primaryFocus(volume);
      runningFocus = focus;

      return {
        date,
        label: date.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }),
        status: "completed" as PlannerDayStatus,
        focus,
        volume,
        source: session.focusLabel,
      };
    }

    const isToday = dayKey(date) === dayKey(today);
    const shouldPlan = date >= today;

    if (isToday && generatedWorkout) {
      const volume = calculateVolumeFromRounds(generatedWorkout.rounds as unknown as WorkoutRound[]);
      runningTotals = mergeVolumeTotals(runningTotals, volume);
      const focus = primaryFocus(volume);
      runningFocus = focus;
      return {
        date,
        label: date.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }),
        status: "planned",
        focus,
        volume,
        source: generatedWorkout.focusLabel,
      };
    }

    if (shouldPlan) {
      const focus = buildContrastFocus(runningFocus, runningTotals);
      const defaultVolume: VolumeBreakdown = { push: 0, pull: 0, legs: 0, core: 0, other: 0 };
      if (focus !== "balanced") {
        defaultVolume[focus] = 30;
      } else {
        defaultVolume.push = defaultVolume.pull = defaultVolume.legs = 10;
      }
      runningTotals = mergeVolumeTotals(runningTotals, defaultVolume);
      runningFocus = focus === "balanced" ? runningFocus : focus;

      return {
        date,
        label: date.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }),
        status: "planned",
        focus,
        volume: defaultVolume,
        source: focus === "balanced" ? "Deload" : "Contrast focus",
      };
    }

    return {
      date,
      label: date.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }),
      status: "rest",
      focus: "balanced",
      volume: { push: 0, pull: 0, legs: 0, core: 0, other: 0 },
      source: "Rest day",
    };
  });
}

function VolumeChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <span className="h-2 w-2 rounded-full bg-primary" />
      <span className="font-semibold text-white">{label}</span>
      <span>{value.toFixed(0)}u</span>
    </div>
  );
}

function StatusIcon({ status }: { status: PlannerDayStatus }) {
  if (status === "completed") return <CalendarCheck2 className="w-4 h-4 text-primary" />;
  if (status === "planned") return <CalendarClock className="w-4 h-4 text-amber-400" />;
  return <PauseCircle className="w-4 h-4 text-muted-foreground" />;
}

export function WeeklyPlanner({ history, generatedWorkout }: PlannerProps) {
  const days = useMemo(() => buildPlannerDays(history, generatedWorkout), [history, generatedWorkout]);
  const completedVolume = useMemo(() => {
    return history.reduce((totals, session) => mergeVolumeTotals(totals, calculateVolumeFromRounds(session.rounds)), {
      push: 0,
      pull: 0,
      legs: 0,
      core: 0,
      other: 0,
    });
  }, [history]);

  const plannedVolume = useMemo(() => {
    const plannedDays = days.filter((day) => day.status === "planned");
    return plannedDays.reduce((totals, day) => mergeVolumeTotals(totals, day.volume), {
      push: 0,
      pull: 0,
      legs: 0,
      core: 0,
      other: 0,
    });
  }, [days]);

  const balanceGaps = describeVolumeGaps(mergeVolumeTotals(completedVolume, plannedVolume));

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-card/60 border-border/60">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs uppercase text-muted-foreground font-bold tracking-wider">Weekly Planner</p>
            <h3 className="text-xl font-bold text-white">Contrast-protected split</h3>
          </div>
          <Badge variant="outline" className="bg-primary/10 border-primary/40 text-primary">
            <Sparkles className="w-3 h-3 mr-1" />
            Auto-balanced
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {days.map((day) => (
            <Card key={day.label} className="p-3 bg-background/60 border-border/40">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <StatusIcon status={day.status} />
                  <p className="text-sm font-semibold text-white">{day.label}</p>
                </div>
                <Badge variant="outline" className="text-xs capitalize">
                  {day.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{day.source ?? ""}</p>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="capitalize" variant={day.status === "completed" ? "default" : "secondary"}>
                  {formatFocusLabel(day.focus)}
                </Badge>
                {day.focus === "balanced" ? <Flame className="w-4 h-4 text-muted-foreground" /> : null}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <VolumeChip label="Push" value={day.volume.push} />
                <VolumeChip label="Pull" value={day.volume.pull} />
                <VolumeChip label="Legs" value={day.volume.legs} />
                <VolumeChip label="Core" value={day.volume.core} />
              </div>
            </Card>
          ))}
        </div>
      </Card>

      <Card className="p-4 bg-primary/5 border-primary/30">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs uppercase text-primary font-bold tracking-wider">Recap & Preview</p>
            <h3 className="text-lg font-bold text-white">Volume balance</h3>
          </div>
          <Badge variant="outline" className="border-primary/40 text-primary">Balance check</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground mb-1">Completed</p>
            <div className="space-y-1">
              <VolumeChip label="Push" value={completedVolume.push} />
              <VolumeChip label="Pull" value={completedVolume.pull} />
              <VolumeChip label="Legs" value={completedVolume.legs} />
              <VolumeChip label="Core" value={completedVolume.core} />
            </div>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Planned</p>
            <div className="space-y-1">
              <VolumeChip label="Push" value={plannedVolume.push} />
              <VolumeChip label="Pull" value={plannedVolume.pull} />
              <VolumeChip label="Legs" value={plannedVolume.legs} />
              <VolumeChip label="Core" value={plannedVolume.core} />
            </div>
          </div>
        </div>

        {balanceGaps.length ? (
          <div className="mt-3 p-3 rounded-lg bg-background/60 border border-dashed border-primary/40 text-sm text-primary">
            Mind the gap: {balanceGaps.map(formatFocusLabel).join(", ")} need attention. Contrast days will bias toward these.
          </div>
        ) : (
          <div className="mt-3 p-3 rounded-lg bg-background/60 border border-dashed border-emerald-400/40 text-sm text-emerald-300">
            Balanced week ahead. Keep the streak alive!
          </div>
        )}
      </Card>
    </div>
  );
}
