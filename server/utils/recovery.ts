import type { WorkoutSession, WorkoutRound, MuscleGroupRecovery } from "@shared/schema";
import { storage } from "../storage";

/**
 * Calculate recovery score for a muscle group
 * Formula: min(1.0, hoursSinceLastWorkout / (baseRecoveryHours * intensityMultiplier))
 * - Base recovery: 48 hours for strength, 24 hours for cardio
 * - Intensity multiplier: 0.7 (low), 1.0 (moderate), 1.5 (high)
 */
export function calculateRecoveryScore(
  muscleGroup: string,
  lastWorkedAt: Date,
  intensity: number, // 0-1, workout intensity
  baseRecoveryHours: number = 48 // Default for strength movements
): number {
  const now = new Date();
  const hoursSinceLastWorkout = (now.getTime() - lastWorkedAt.getTime()) / (1000 * 60 * 60);
  
  // Adjust base recovery based on intensity
  // Higher intensity = longer recovery needed
  const intensityMultiplier = 0.7 + (intensity * 0.8); // 0.7 to 1.5
  const adjustedRecoveryHours = baseRecoveryHours * intensityMultiplier;
  
  // Recovery score: 0 = just worked, 1 = fully recovered
  const recoveryScore = Math.min(1.0, hoursSinceLastWorkout / adjustedRecoveryHours);
  
  return recoveryScore;
}

/**
 * Get base recovery hours for a muscle group based on its type
 */
function getBaseRecoveryHours(muscleGroup: string): number {
  const cardioGroups = ["cardio", "full-body"];
  const strengthGroups = ["chest", "back", "legs", "shoulders", "triceps", "biceps", "core"];
  
  if (cardioGroups.includes(muscleGroup.toLowerCase())) {
    return 24; // Cardio recovers faster
  } else if (strengthGroups.includes(muscleGroup.toLowerCase())) {
    return 48; // Strength needs more recovery
  }
  
  return 36; // Default for other groups
}

/**
 * Get current recovery scores for all muscle groups
 */
export async function getRecoveryScores(
  userId: string,
  muscleGroups?: string[]
): Promise<Map<string, number>> {
  const recoveryRecords = await storage.getMuscleGroupRecovery(userId);
  const recoveryMap = new Map<string, number>();
  
  // If specific muscle groups requested, only return those
  const groupsToCheck = muscleGroups || Array.from(new Set(recoveryRecords.map(r => r.muscleGroup)));
  
  for (const group of groupsToCheck) {
    const record = recoveryRecords.find(r => r.muscleGroup === group);
    
    if (record) {
      // Recalculate recovery score based on current time
      const baseRecoveryHours = getBaseRecoveryHours(group);
      const recoveryScore = calculateRecoveryScore(
        group,
        new Date(record.lastWorkedAt),
        record.workoutIntensity,
        baseRecoveryHours
      );
      recoveryMap.set(group, recoveryScore);
    } else {
      // No record = fully recovered (never worked or old data)
      recoveryMap.set(group, 1.0);
    }
  }
  
  return recoveryMap;
}

/**
 * Calculate workout intensity from session data
 */
function calculateWorkoutIntensity(session: WorkoutSession, rounds: WorkoutRound[]): number {
  // Factors: RPE, difficulty tag, completion rate
  let intensity = 0.5; // Default moderate
  
  // RPE contribution (40%)
  if (session.perceivedExertion !== null) {
    intensity = (session.perceivedExertion / 5) * 0.4;
  }
  
  // Difficulty tag contribution (30%)
  const difficultyMultiplier = {
    "beginner": 0.6,
    "intermediate": 1.0,
    "advanced": 1.4,
  };
  intensity += (difficultyMultiplier[session.difficultyTag as keyof typeof difficultyMultiplier] / 1.4) * 0.3;
  
  // Completion rate contribution (30%)
  const completedRounds = rounds.filter(r => !r.skipped).length;
  const completionRate = rounds.length > 0 ? completedRounds / rounds.length : 1.0;
  intensity += completionRate * 0.3;
  
  return Math.min(1.0, Math.max(0.0, intensity));
}

/**
 * Update recovery scores after a workout
 */
export async function updateRecoveryAfterWorkout(
  userId: string,
  session: WorkoutSession,
  rounds: WorkoutRound[]
): Promise<void> {
  const intensity = calculateWorkoutIntensity(session, rounds);
  
  // Get unique muscle groups from this workout
  const muscleGroups = new Set(rounds.map(r => r.targetMuscleGroup));
  
  for (const muscleGroup of muscleGroups) {
    const baseRecoveryHours = getBaseRecoveryHours(muscleGroup);
    
    // Recovery score starts at 0 (just worked)
    await storage.upsertMuscleGroupRecovery(userId, {
      muscleGroup,
      recoveryScore: 0.0,
      lastWorkedAt: new Date(session.createdAt),
      workoutIntensity: intensity,
      updatedAt: new Date(),
    });
  }
  
  // Also update recovery for other muscle groups (they continue recovering)
  const allRecoveryRecords = await storage.getMuscleGroupRecovery(userId);
  const workedGroups = new Set(muscleGroups);
  
  for (const record of allRecoveryRecords) {
    if (!workedGroups.has(record.muscleGroup)) {
      // Recalculate recovery for groups not worked today
      const baseRecoveryHours = getBaseRecoveryHours(record.muscleGroup);
      const recoveryScore = calculateRecoveryScore(
        record.muscleGroup,
        new Date(record.lastWorkedAt),
        record.workoutIntensity,
        baseRecoveryHours
      );
      
      await storage.upsertMuscleGroupRecovery(userId, {
        muscleGroup: record.muscleGroup,
        recoveryScore,
        lastWorkedAt: new Date(record.lastWorkedAt),
        workoutIntensity: record.workoutIntensity,
        updatedAt: new Date(),
      });
    }
  }
}

/**
 * Determine if a muscle group should be avoided due to insufficient recovery
 */
export function shouldAvoidMuscleGroup(
  muscleGroup: string,
  recoveryScore: number,
  threshold: number = 0.5 // Default: need 50% recovery
): boolean {
  return recoveryScore < threshold;
}

/**
 * Get recovery penalty multiplier for exercise selection
 * Lower recovery = higher penalty (less likely to be selected)
 */
export function getRecoveryPenalty(recoveryScore: number): number {
  if (recoveryScore >= 0.8) return 1.0; // Fully recovered, no penalty
  if (recoveryScore >= 0.5) return 0.7; // Partially recovered, slight penalty
  if (recoveryScore >= 0.3) return 0.4; // Low recovery, moderate penalty
  return 0.1; // Very low recovery, heavy penalty
}

