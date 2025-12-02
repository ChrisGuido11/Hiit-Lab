import type { WorkoutSession, WorkoutRound, WorkoutFramework, FrameworkPreference } from "@shared/schema";
import { storage } from "../storage";
import { summarizeSessionPerformance } from "./personalization";

/**
 * Calculate framework preference score based on session history
 * Formula: (completionRate * 0.4) + (averageHitRate * 0.3) + (invertedRPE * 0.2) + (recency * 0.1)
 */
export function calculateFrameworkScore(
  framework: WorkoutFramework,
  sessions: Array<WorkoutSession & { rounds: WorkoutRound[] }>
): {
  preferenceScore: number; // 0-1
  completionRate: number; // 0-1
  averageRpe: number | null;
} {
  const frameworkSessions = sessions.filter(s => s.framework === framework);
  
  if (frameworkSessions.length === 0) {
    return {
      preferenceScore: 0.5, // Neutral if no data
      completionRate: 1.0,
      averageRpe: null,
    };
  }
  
  // Completion rate (40% weight)
  const completedSessions = frameworkSessions.filter(s => s.completed).length;
  const completionRate = completedSessions / frameworkSessions.length;
  
  // Average hit rate (30% weight)
  let totalHitRate = 0;
  let hitRateCount = 0;
  const rpeValues: number[] = [];
  
  for (const session of frameworkSessions) {
    if (!session.completed) continue;
    
    const summary = summarizeSessionPerformance(session.rounds, session.perceivedExertion);
    totalHitRate += summary.averageHitRate;
    hitRateCount += 1;
    
    if (summary.averageRpe !== null) {
      rpeValues.push(summary.averageRpe);
    }
  }
  
  const averageHitRate = hitRateCount > 0 ? totalHitRate / hitRateCount : 1.0;
  const normalizedHitRate = Math.min(averageHitRate / 1.5, 1.0); // Normalize to 0-1
  
  // Average RPE (20% weight, inverted - lower RPE is better)
  const averageRpe = rpeValues.length > 0 
    ? rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length 
    : null;
  const invertedRpe = averageRpe !== null ? 1 - (averageRpe / 5) : 0.5; // Invert: 5 RPE = 0, 1 RPE = 0.8
  
  // Recency (10% weight) - more recent sessions weighted higher
  const now = new Date().getTime();
  let recencyScore = 0;
  let recencyCount = 0;
  
  for (const session of frameworkSessions.slice(0, 5)) { // Last 5 sessions
    const daysAgo = (now - new Date(session.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const recency = Math.max(0, 1 - (daysAgo / 30)); // Decay over 30 days
    recencyScore += recency;
    recencyCount += 1;
  }
  
  const averageRecency = recencyCount > 0 ? recencyScore / recencyCount : 0.5;
  
  // Calculate final preference score
  const preferenceScore = 
    (completionRate * 0.4) +
    (normalizedHitRate * 0.3) +
    (invertedRpe * 0.2) +
    (averageRecency * 0.1);
  
  return {
    preferenceScore: Math.max(0, Math.min(1, preferenceScore)),
    completionRate,
    averageRpe,
  };
}

/**
 * Get all framework preferences for a user
 */
export async function getFrameworkPreferences(userId: string): Promise<Map<WorkoutFramework, FrameworkPreference>> {
  const preferences = await storage.getFrameworkPreferences(userId);
  const preferenceMap = new Map<WorkoutFramework, FrameworkPreference>();
  
  for (const pref of preferences) {
    preferenceMap.set(pref.framework, pref);
  }
  
  return preferenceMap;
}

/**
 * Update framework preference after workout completion
 */
export async function updateFrameworkPreference(
  userId: string,
  session: WorkoutSession & { rounds: WorkoutRound[] },
  allSessions: Array<WorkoutSession & { rounds: WorkoutRound[] }>
): Promise<void> {
  const frameworkSessions = allSessions.filter(s => s.framework === session.framework);
  const score = calculateFrameworkScore(session.framework, frameworkSessions);
  
  await storage.upsertFrameworkPreference(userId, {
    framework: session.framework,
    preferenceScore: score.preferenceScore,
    completionRate: score.completionRate,
    averageRpe: score.averageRpe,
    lastUsedAt: new Date(session.createdAt),
    updatedAt: new Date(),
  });
}

/**
 * Select framework with user preferences and exploration
 */
export function selectFrameworkWithPreferences(
  goalFramework: WorkoutFramework | null,
  userPreferences: Map<WorkoutFramework, FrameworkPreference>,
  explorationRate: number = 0.15 // 15% chance to explore
): WorkoutFramework {
  const frameworks: WorkoutFramework[] = ["EMOM", "Tabata", "AMRAP", "Circuit"];
  
  // Exploration: randomly select a framework
  if (Math.random() < explorationRate) {
    return frameworks[Math.floor(Math.random() * frameworks.length)];
  }
  
  // If goal framework has preference data, use it if it's good
  if (goalFramework) {
    const pref = userPreferences.get(goalFramework);
    if (pref && pref.preferenceScore >= 0.6) {
      return goalFramework;
    }
  }
  
  // Select framework with highest preference score
  let bestFramework: WorkoutFramework = goalFramework || "EMOM";
  let bestScore = 0;
  
  for (const framework of frameworks) {
    const pref = userPreferences.get(framework);
    const score = pref?.preferenceScore ?? 0.5;
    
    if (score > bestScore) {
      bestScore = score;
      bestFramework = framework;
    }
  }
  
  return bestFramework;
}

/**
 * Get framework preference multiplier for workout generation
 * Higher preference = more likely to be selected
 */
export function getFrameworkPreferenceMultiplier(
  framework: WorkoutFramework,
  userPreferences: Map<WorkoutFramework, FrameworkPreference>
): number {
  const pref = userPreferences.get(framework);
  if (!pref) {
    return 1.0; // Neutral if no data
  }
  
  // Convert 0-1 preference score to 0.7-1.3 multiplier range
  return 0.7 + (pref.preferenceScore * 0.6);
}

