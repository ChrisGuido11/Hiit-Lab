import type { WorkoutSession, WorkoutRound, ExerciseStat, ExerciseMastery } from "@shared/schema";
import { storage } from "../storage";

/**
 * Calculate mastery score (0-100) for an exercise based on history and stats
 * Formula: (completionRate * 0.4) + (qualityScore * 0.3) + (consistencyScore * 0.2) + (progressionScore * 0.1)
 */
export function calculateMasteryScore(
  exerciseName: string,
  history: Array<WorkoutSession & { rounds: WorkoutRound[] }>,
  exerciseStats?: ExerciseStat[]
): number {
  // Find exercise-specific stats
  const stat = exerciseStats?.find(s => s.exerciseName === exerciseName);
  
  // Get all rounds for this exercise from history
  const exerciseRounds: Array<{ hitRate: number; skipped: boolean }> = [];
  
  for (const session of history) {
    for (const round of session.rounds) {
      if (round.exerciseName === exerciseName && !round.skipped) {
        const target = round.reps || 1;
        const actualValue = round.isHold
          ? round.actualSeconds ?? round.actualReps ?? target
          : round.actualReps ?? round.actualSeconds ?? target;
        const hitRate = Math.min(actualValue / target, 1.5);
        exerciseRounds.push({ hitRate, skipped: false });
      } else if (round.exerciseName === exerciseName && round.skipped) {
        exerciseRounds.push({ hitRate: 0, skipped: true });
      }
    }
  }

  if (exerciseRounds.length === 0 && !stat) {
    return 0; // No data, no mastery
  }

  // Completion rate (40% weight)
  const totalAttempts = stat ? stat.acceptCount + stat.skipCount : exerciseRounds.length;
  const successfulAttempts = stat ? stat.acceptCount : exerciseRounds.filter(r => !r.skipped).length;
  const completionRate = totalAttempts > 0 ? successfulAttempts / totalAttempts : 0;

  // Quality score (30% weight) - average hit rate
  let qualityScore = 1.0;
  if (stat && stat.completionCount > 0) {
    qualityScore = Math.min(stat.qualitySum / stat.completionCount, 1.5) / 1.5; // Normalize to 0-1
  } else if (exerciseRounds.length > 0) {
    const nonSkipped = exerciseRounds.filter(r => !r.skipped);
    if (nonSkipped.length > 0) {
      const avgHitRate = nonSkipped.reduce((sum, r) => sum + r.hitRate, 0) / nonSkipped.length;
      qualityScore = Math.min(avgHitRate / 1.5, 1.0); // Normalize to 0-1
    }
  }

  // Consistency score (20% weight) - inverse of variance
  let consistencyScore = 0.5; // Default if not enough data
  if (exerciseRounds.length >= 3) {
    const nonSkipped = exerciseRounds.filter(r => !r.skipped);
    if (nonSkipped.length >= 3) {
      const hitRates = nonSkipped.map(r => r.hitRate);
      const mean = hitRates.reduce((a, b) => a + b, 0) / hitRates.length;
      const variance = hitRates.reduce((sum, hr) => sum + Math.pow(hr - mean, 2), 0) / hitRates.length;
      const stdDev = Math.sqrt(variance);
      // Lower variance = higher consistency score (max 1.0, min 0.0)
      consistencyScore = Math.max(0, Math.min(1, 1 - (stdDev / mean)));
    }
  }

  // Progression score (10% weight) - trend over time
  let progressionScore = 0.5; // Default
  if (exerciseRounds.length >= 4) {
    const nonSkipped = exerciseRounds.filter(r => !r.skipped);
    if (nonSkipped.length >= 4) {
      // Simple linear regression to detect trend
      const recent = nonSkipped.slice(-6); // Last 6 attempts
      const n = recent.length;
      const sumX = (n * (n + 1)) / 2; // 1 + 2 + ... + n
      const sumY = recent.reduce((sum, r) => sum + r.hitRate, 0);
      const sumXY = recent.reduce((sum, r, i) => sum + (i + 1) * r.hitRate, 0);
      const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6; // 1^2 + 2^2 + ... + n^2
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      // Positive slope = improving, negative = declining
      progressionScore = Math.max(0, Math.min(1, 0.5 + slope * 2)); // Scale slope to 0-1 range
    }
  }

  // Calculate final mastery score
  const masteryScore = 
    (completionRate * 0.4) +
    (qualityScore * 0.3) +
    (consistencyScore * 0.2) +
    (progressionScore * 0.1);

  return Math.round(masteryScore * 100); // Return as 0-100
}

/**
 * Get difficulty adjustment multiplier based on mastery score
 * Higher mastery = can handle more difficulty
 */
export function getMasteryDifficultyAdjustment(masteryScore: number): number {
  // Mastery 0-50: reduce difficulty (0.85-1.0)
  // Mastery 50-75: normal difficulty (1.0)
  // Mastery 75-100: increase difficulty (1.0-1.15)
  if (masteryScore < 50) {
    return 0.85 + (masteryScore / 50) * 0.15; // 0.85 to 1.0
  } else if (masteryScore < 75) {
    return 1.0;
  } else {
    return 1.0 + ((masteryScore - 75) / 25) * 0.15; // 1.0 to 1.15
  }
}

/**
 * Update mastery scores after a workout session
 */
export async function updateMasteryScores(
  userId: string,
  session: WorkoutSession & { rounds: WorkoutRound[] },
  history: Array<WorkoutSession & { rounds: WorkoutRound[] }>,
  exerciseStats: ExerciseStat[]
): Promise<void> {
  // Get unique exercises from this session
  const exerciseNames = new Set(session.rounds.map(r => r.exerciseName));

  for (const exerciseName of exerciseNames) {
    const masteryScore = calculateMasteryScore(exerciseName, history, exerciseStats);
    
    // Get current mastery record to update attempt counts
    const existingMastery = await storage.getExerciseMastery(userId);
    const current = existingMastery.find(m => m.exerciseName === exerciseName);
    
    const roundsForExercise = session.rounds.filter(r => r.exerciseName === exerciseName);
    const successfulAttempts = roundsForExercise.filter(r => !r.skipped).length;
    const totalAttempts = roundsForExercise.length;

    await storage.upsertExerciseMastery(userId, {
      exerciseName,
      masteryScore,
      totalAttempts: (current?.totalAttempts ?? 0) + totalAttempts,
      successfulAttempts: (current?.successfulAttempts ?? 0) + successfulAttempts,
      lastUpdated: new Date(),
    });
  }
}

