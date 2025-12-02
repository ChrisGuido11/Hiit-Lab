import type { WorkoutSession, WorkoutRound, WeeklyPeriodization } from "@shared/schema";
import { storage } from "../storage";

/**
 * Get the start of the week (Monday) for a given date
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Calculate weekly volume per muscle group
 */
export async function calculateWeeklyVolume(
  userId: string,
  weekStart: Date
): Promise<Record<string, { volume: number; sessions: number }>> {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  
  // Get all sessions for this week
  const allSessions = await storage.getWorkoutSessions(userId);
  const weekSessions = allSessions.filter(session => {
    const sessionDate = new Date(session.createdAt);
    return sessionDate >= weekStart && sessionDate < weekEnd;
  });
  
  const volumeMap: Record<string, { volume: number; sessions: number }> = {};
  const sessionIds = new Set<string>();
  
  for (const session of weekSessions) {
    sessionIds.add(session.id);
    
    for (const round of session.rounds) {
      if (round.skipped) continue;
      
      const muscleGroup = round.targetMuscleGroup;
      if (!volumeMap[muscleGroup]) {
        volumeMap[muscleGroup] = { volume: 0, sessions: 0 };
      }
      
      // Volume = reps * sets (or seconds for holds)
      const volume = round.isHold 
        ? (round.actualSeconds ?? round.reps ?? 0)
        : (round.actualReps ?? round.reps ?? 0);
      
      volumeMap[muscleGroup].volume += volume;
    }
  }
  
  // Count unique sessions per muscle group
  for (const session of weekSessions) {
    const muscleGroupsInSession = new Set(session.rounds.map(r => r.targetMuscleGroup));
    for (const mg of muscleGroupsInSession) {
      if (volumeMap[mg]) {
        volumeMap[mg].sessions += 1;
      }
    }
  }
  
  return volumeMap;
}

/**
 * Get muscle group volume for a specific week
 */
export async function getMuscleGroupVolume(
  userId: string,
  muscleGroup: string,
  weekStart?: Date
): Promise<{ volume: number; sessions: number }> {
  const week = weekStart || getWeekStart(new Date());
  const periodization = await storage.getWeeklyPeriodization(userId, week);
  
  if (periodization && periodization.muscleGroupVolume[muscleGroup]) {
    return periodization.muscleGroupVolume[muscleGroup];
  }
  
  // Calculate on the fly if not stored
  const volumeMap = await calculateWeeklyVolume(userId, week);
  return volumeMap[muscleGroup] || { volume: 0, sessions: 0 };
}

/**
 * Determine if volume needs balancing for a muscle group
 */
export function shouldBalanceVolume(
  muscleGroup: string,
  currentVolume: number,
  targetVolume: number,
  tolerance: number = 0.2 // 20% tolerance
): boolean {
  if (targetVolume === 0) return false; // No target set
  return currentVolume < targetVolume * (1 - tolerance);
}

/**
 * Update weekly volume tracking after a workout
 */
export async function updateWeeklyVolume(
  userId: string,
  session: WorkoutSession,
  rounds: WorkoutRound[]
): Promise<void> {
  const weekStart = getWeekStart(new Date(session.createdAt));
  
  // Calculate current week's volume
  const volumeMap = await calculateWeeklyVolume(userId, weekStart);
  
  // Update or create periodization record
  await storage.upsertWeeklyPeriodization(userId, {
    weekStart,
    muscleGroupVolume: volumeMap,
    updatedAt: new Date(),
  });
}

/**
 * Get contrast day recommendation (e.g., upper/lower split)
 */
export async function getContrastDayRecommendation(
  userId: string,
  currentWeek?: Date
): Promise<{ recommended: string[]; avoid: string[] } | null> {
  const weekStart = currentWeek ? getWeekStart(currentWeek) : getWeekStart(new Date());
  const periodization = await storage.getWeeklyPeriodization(userId, weekStart);
  
  if (!periodization) {
    return null; // Not enough data
  }
  
  const volumeMap = periodization.muscleGroupVolume;
  
  // Define muscle group categories
  const upperBody = ["chest", "back", "shoulders", "triceps", "biceps"];
  const lowerBody = ["legs", "core"];
  const cardio = ["cardio", "full-body"];
  
  // Calculate total volume per category
  const upperVolume = upperBody.reduce((sum, mg) => sum + (volumeMap[mg]?.volume || 0), 0);
  const lowerVolume = lowerBody.reduce((sum, mg) => sum + (volumeMap[mg]?.volume || 0), 0);
  const cardioVolume = cardio.reduce((sum, mg) => sum + (volumeMap[mg]?.volume || 0), 0);
  
  // Find which category is underworked
  const maxVolume = Math.max(upperVolume, lowerVolume, cardioVolume);
  const threshold = maxVolume * 0.3; // 30% of max volume
  
  const recommended: string[] = [];
  const avoid: string[] = [];
  
  if (upperVolume < threshold && lowerVolume > threshold) {
    // Lower body is overworked, recommend upper body
    recommended.push(...upperBody);
    avoid.push(...lowerBody);
  } else if (lowerVolume < threshold && upperVolume > threshold) {
    // Upper body is overworked, recommend lower body
    recommended.push(...lowerBody);
    avoid.push(...upperBody);
  } else if (cardioVolume < threshold && (upperVolume > threshold || lowerVolume > threshold)) {
    // Strength is overworked, recommend cardio
    recommended.push(...cardio);
    avoid.push(...upperBody, ...lowerBody);
  }
  
  if (recommended.length === 0) {
    return null; // Volume is balanced
  }
  
  return { recommended, avoid };
}

/**
 * Get volume bias multiplier for exercise selection
 * Higher multiplier = muscle group needs more volume
 */
export async function getVolumeBias(
  userId: string,
  muscleGroup: string,
  weekStart?: Date
): Promise<number> {
  const week = weekStart || getWeekStart(new Date());
  const volume = await getMuscleGroupVolume(userId, muscleGroup, week);
  
  // Get average volume across all muscle groups for comparison
  const periodization = await storage.getWeeklyPeriodization(userId, week);
  if (!periodization) {
    return 1.0; // No data, neutral bias
  }
  
  const allVolumes = Object.values(periodization.muscleGroupVolume).map(v => v.volume);
  const avgVolume = allVolumes.length > 0 
    ? allVolumes.reduce((a, b) => a + b, 0) / allVolumes.length 
    : 0;
  
  if (avgVolume === 0) {
    return 1.0; // No volume data, neutral
  }
  
  // If this muscle group has less than average volume, boost it
  const ratio = volume.volume / avgVolume;
  if (ratio < 0.5) return 1.5; // Significantly underworked
  if (ratio < 0.8) return 1.2; // Slightly underworked
  if (ratio > 1.5) return 0.7; // Overworked, reduce selection
  if (ratio > 1.2) return 0.9; // Slightly overworked
  
  return 1.0; // Balanced
}

