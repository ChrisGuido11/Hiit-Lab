import type { WorkoutSession } from "@shared/schema";
import type { GeneratedWorkout } from "@shared/schema";

export interface StreakStatus {
  currentStreak: number;
  bestStreak: number;
  daysSinceLastWorkout: number;
  streakIsFragile: boolean;
}

/**
 * Get streak status from workout history
 */
export function getStreakStatus(
  history: WorkoutSession[]
): StreakStatus {
  // Filter to completed sessions only
  const completedSessions = history.filter(s => s.completed);
  
  if (completedSessions.length === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      daysSinceLastWorkout: Infinity,
      streakIsFragile: true,
    };
  }
  
  // Get unique workout days
  const dateKey = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };
  
  const uniqueWorkoutDays = Array.from(
    new Set(completedSessions.map(s => dateKey(new Date(s.createdAt))))
  ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  
  // Calculate current streak
  let currentStreak = 0;
  let bestStreak = 0;
  let previousDate: Date | null = null;
  
  for (const day of uniqueWorkoutDays) {
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
  }
  
  // Calculate days since last workout
  const lastWorkoutDate = new Date(uniqueWorkoutDays[0]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  lastWorkoutDate.setHours(0, 0, 0, 0);
  const daysSinceLastWorkout = Math.floor(
    (today.getTime() - lastWorkoutDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Streak is fragile if it's short or user hasn't worked out in a while
  const streakIsFragile = currentStreak <= 2 || daysSinceLastWorkout >= 3;
  
  return {
    currentStreak,
    bestStreak,
    daysSinceLastWorkout,
    streakIsFragile,
  };
}

/**
 * Determine if workout should be adjusted for streak
 */
export function shouldAdjustForStreak(
  streak: number,
  daysSinceLast: number,
  streakIsFragile: boolean
): boolean {
  // Adjust if streak is fragile or user is at risk of breaking it
  return streakIsFragile || daysSinceLast >= 2;
}

/**
 * Apply streak-aware adjustments to workout
 * Makes workout easier/shorter when streak is fragile to help user maintain it
 */
export function applyStreakAdjustments(
  workout: GeneratedWorkout,
  streakStatus: StreakStatus
): GeneratedWorkout {
  if (!shouldAdjustForStreak(
    streakStatus.currentStreak,
    streakStatus.daysSinceLastWorkout,
    streakStatus.streakIsFragile
  )) {
    return workout; // No adjustments needed
  }
  
  const adjustedWorkout = { ...workout };
  
  // Reduce duration by 10-20% to make it more achievable
  const durationReduction = streakStatus.streakIsFragile ? 0.2 : 0.1;
  adjustedWorkout.durationMinutes = Math.max(
    6,
    Math.round(workout.durationMinutes * (1 - durationReduction))
  );
  
  // Reduce reps by 5-10% to make exercises easier
  const repReduction = streakStatus.streakIsFragile ? 0.1 : 0.05;
  adjustedWorkout.rounds = workout.rounds.map(round => ({
    ...round,
    reps: Math.max(1, Math.round(round.reps * (1 - repReduction))),
  }));
  
  // Add hint to rationale
  if (adjustedWorkout.rationale) {
    adjustedWorkout.rationale.intensity = 
      `${adjustedWorkout.rationale.intensity} Streak-aware: Adjusted for ${streakStatus.currentStreak}-day streak to keep momentum going.`;
  }
  
  return adjustedWorkout;
}

/**
 * Get streak motivation message
 */
export function getStreakMotivationMessage(streakStatus: StreakStatus): string | null {
  if (streakStatus.currentStreak === 0) {
    return "Start your streak today!";
  }
  
  if (streakStatus.streakIsFragile) {
    if (streakStatus.daysSinceLastWorkout >= 3) {
      return "Your streak is at risk! Let's get back on track.";
    }
    return `Keep your ${streakStatus.currentStreak}-day streak alive!`;
  }
  
  if (streakStatus.currentStreak >= 7) {
    return `🔥 Amazing ${streakStatus.currentStreak}-day streak! Keep it going!`;
  }
  
  if (streakStatus.currentStreak >= 3) {
    return `💪 Great ${streakStatus.currentStreak}-day streak! Building consistency!`;
  }
  
  return null;
}

