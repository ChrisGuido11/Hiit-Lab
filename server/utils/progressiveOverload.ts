import type { WorkoutSession, WorkoutRound, ExerciseMastery } from "@shared/schema";
import { summarizeSessionPerformance } from "./personalization";

export interface ProgressiveOverloadAdjustment {
  exerciseName: string;
  repAdjustment: number; // Percentage increase (0.05 = 5%)
  secondsAdjustment: number; // Seconds increase for holds
}

/**
 * Detect if user consistently overperforms on an exercise
 * Trigger: 3+ consecutive sessions with hit rate > 1.1
 */
export function detectConsistentOverperformance(
  sessions: Array<WorkoutSession & { rounds: WorkoutRound[] }>,
  exerciseName: string,
  windowSize: number = 3
): boolean {
  const exerciseSessions: Array<{ hitRate: number; sessionDate: Date }> = [];
  
  // Get all sessions with this exercise, sorted by date
  for (const session of sessions) {
    const rounds = session.rounds.filter(r => r.exerciseName === exerciseName && !r.skipped);
    if (rounds.length === 0) continue;
    
    // Calculate average hit rate for this exercise in this session
    let totalHitRate = 0;
    let count = 0;
    
    for (const round of rounds) {
      const target = round.reps || 1;
      const actualValue = round.isHold
        ? round.actualSeconds ?? round.actualReps ?? target
        : round.actualReps ?? round.actualSeconds ?? target;
      const hitRate = Math.min(actualValue / target, 1.5);
      totalHitRate += hitRate;
      count += 1;
    }
    
    if (count > 0) {
      exerciseSessions.push({
        hitRate: totalHitRate / count,
        sessionDate: new Date(session.createdAt),
      });
    }
  }
  
  // Sort by date (most recent first)
  exerciseSessions.sort((a, b) => b.sessionDate.getTime() - a.sessionDate.getTime());
  
  // Check last N sessions
  const recentSessions = exerciseSessions.slice(0, windowSize);
  if (recentSessions.length < windowSize) {
    return false; // Not enough data
  }
  
  // All recent sessions must have hit rate > 1.1
  return recentSessions.every(s => s.hitRate > 1.1);
}

/**
 * Calculate progressive overload adjustment for an exercise
 */
export function calculateProgressiveOverloadAdjustment(
  exerciseName: string,
  sessions: Array<WorkoutSession & { rounds: WorkoutRound[] }>,
  masteryScore: number | null
): ProgressiveOverloadAdjustment | null {
  // Check if exercise qualifies for progressive overload
  if (!detectConsistentOverperformance(sessions, exerciseName)) {
    return null;
  }
  
  // Get average overperformance
  let totalOverperformance = 0;
  let count = 0;
  let isHold = false;
  
  for (const session of sessions.slice(0, 5)) { // Last 5 sessions
    const rounds = session.rounds.filter(r => r.exerciseName === exerciseName && !r.skipped);
    if (rounds.length === 0) continue;
    
    for (const round of rounds) {
      isHold = round.isHold || false;
      const target = round.reps || 1;
      const actualValue = round.isHold
        ? round.actualSeconds ?? round.actualReps ?? target
        : round.actualReps ?? round.actualSeconds ?? target;
      const overperformance = (actualValue / target) - 1.0; // 0.1 = 10% over
      totalOverperformance += overperformance;
      count += 1;
    }
  }
  
  if (count === 0) {
    return null;
  }
  
  const avgOverperformance = totalOverperformance / count;
  
  // Calculate adjustment based on overperformance and mastery
  // Higher mastery = can handle larger increases
  const masteryMultiplier = masteryScore !== null 
    ? 0.8 + (masteryScore / 100) * 0.4 // 0.8 to 1.2
    : 1.0;
  
  // Adjustment: 5-10% for reps, 2-5 seconds for holds
  // Cap at 20% increase from baseline
  if (isHold) {
    const secondsIncrease = Math.min(5, Math.max(2, avgOverperformance * 10 * masteryMultiplier));
    return {
      exerciseName,
      repAdjustment: 0,
      secondsAdjustment: Math.round(secondsIncrease),
    };
  } else {
    const repIncreasePercent = Math.min(0.20, Math.max(0.05, avgOverperformance * 0.5 * masteryMultiplier));
    return {
      exerciseName,
      repAdjustment: repIncreasePercent,
      secondsAdjustment: 0,
    };
  }
}

/**
 * Apply progressive overload adjustments to a workout
 */
export function applyProgressiveOverload(
  workout: { rounds: Array<{ exerciseName: string; reps: number; isHold?: boolean }> },
  sessions: Array<WorkoutSession & { rounds: WorkoutRound[] }>,
  masteryScores: Map<string, number>
): void {
  const adjustments = new Map<string, ProgressiveOverloadAdjustment>();
  
  // Calculate adjustments for each exercise
  for (const round of workout.rounds) {
    if (adjustments.has(round.exerciseName)) continue;
    
    const masteryScore = masteryScores.get(round.exerciseName) ?? null;
    const adjustment = calculateProgressiveOverloadAdjustment(
      round.exerciseName,
      sessions,
      masteryScore
    );
    
    if (adjustment) {
      adjustments.set(round.exerciseName, adjustment);
    }
  }
  
  // Apply adjustments to workout rounds
  for (const round of workout.rounds) {
    const adjustment = adjustments.get(round.exerciseName);
    if (!adjustment) continue;
    
    if (round.isHold) {
      // For holds, increase seconds
      round.reps = Math.max(1, round.reps + adjustment.secondsAdjustment);
    } else {
      // For reps, increase by percentage
      const increase = Math.round(round.reps * adjustment.repAdjustment);
      round.reps = Math.max(1, round.reps + increase);
    }
  }
}

/**
 * Get all exercises that qualify for progressive overload
 */
export function getExercisesForProgressiveOverload(
  sessions: Array<WorkoutSession & { rounds: WorkoutRound[] }>,
  masteryScores: Map<string, number>
): Array<{ exerciseName: string; adjustment: ProgressiveOverloadAdjustment }> {
  const exercises = new Set<string>();
  const results: Array<{ exerciseName: string; adjustment: ProgressiveOverloadAdjustment }> = [];
  
  // Get all unique exercises from recent sessions
  for (const session of sessions.slice(0, 10)) {
    for (const round of session.rounds) {
      exercises.add(round.exerciseName);
    }
  }
  
  // Check each exercise
  for (const exerciseName of exercises) {
    const masteryScore = masteryScores.get(exerciseName) ?? null;
    const adjustment = calculateProgressiveOverloadAdjustment(
      exerciseName,
      sessions,
      masteryScore
    );
    
    if (adjustment) {
      results.push({ exerciseName, adjustment });
    }
  }
  
  return results;
}

