// CHANGE SUMMARY (2025-11-29):
// - Imported EquipmentId, getEquipmentRichness, and migrateEquipment from centralized config.
// - Exercise catalog now uses typed EquipmentId[] for requiredEquipment field.
// - AI generator filters exercises by user's available equipment with improved type safety.
// - Added equipment richness logic to adjust difficulty based on equipment availability.
// - Maintains backward compatibility with legacy equipment keys via migration.
// - Integrated goal personalization system - uses primaryGoal and goalWeights to bias exercise selection.
// - Added exercise category tags (compound, cardio, plyometric, mobility) for goal-based filtering.
// - Duration now respects goal preferences (e.g., shorter for metcon, longer for endurance).
// - Exercise selection weighted by goal exercise bias (e.g., more cardio for fat loss, more compounds for strength).

import type { EquipmentId } from "@shared/equipment";
import { getEquipmentRichness, migrateEquipment } from "@shared/equipment";
import type { PrimaryGoalId } from "@shared/goals";
import { getPrimaryGoalConfig, getCombinedExerciseBias, migrateLegacyGoal } from "@shared/goals";
import type { GeneratedWorkout, SessionIntent } from "@shared/schema";
import type { PersonalizationInsights, SessionPerformanceSummary } from "./personalization";
import { calculateMuscleGroupLoad, derivePrimaryMuscleGroups } from "./personalization";

interface Exercise {
  name: string;
  muscleGroup: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  equipment: EquipmentId[]; // Typed equipment requirements
  reps: { beginner: number; intermediate: number; advanced: number };
  isHold?: boolean; // For time-based exercises (measured in seconds, not reps)
  alternatesSides?: boolean; // For exercises that alternate sides (lunges, etc.) - reps are per side
  // Category tags for goal-based exercise selection
  categories: {
    compound: boolean;   // Multi-joint compound movements
    cardio: boolean;     // Cardio/conditioning exercises
    plyometric: boolean; // Explosive/jump movements
    mobility: boolean;   // Stretching/mobility work
  };
}

/**
 * EXERCISE LIBRARY
 * =================
 * Comprehensive exercise database for EMOM workout generation.
 * All exercises now use typed EquipmentId[] for type-safe equipment requirements.
 * Each exercise has category tags (compound, cardio, plyometric, mobility) for goal-based filtering.
 *
 * Total: 50+ exercises across 20 equipment categories
 */
const EXERCISES: Exercise[] = [
  // Bodyweight (9 exercises)
  { name: "Burpees", muscleGroup: "full-body", difficulty: "intermediate", equipment: ["bodyweight"], reps: { beginner: 8, intermediate: 12, advanced: 15 }, categories: { compound: true, cardio: true, plyometric: true, mobility: false } },
  { name: "Air Squats", muscleGroup: "legs", difficulty: "beginner", equipment: ["bodyweight"], reps: { beginner: 15, intermediate: 25, advanced: 35 }, categories: { compound: true, cardio: false, plyometric: false, mobility: false } },
  { name: "Push-ups", muscleGroup: "chest", difficulty: "beginner", equipment: ["bodyweight"], reps: { beginner: 10, intermediate: 20, advanced: 30 }, categories: { compound: true, cardio: false, plyometric: false, mobility: false } },
  { name: "Mountain Climbers", muscleGroup: "core", difficulty: "intermediate", equipment: ["bodyweight"], reps: { beginner: 20, intermediate: 30, advanced: 40 }, categories: { compound: false, cardio: true, plyometric: false, mobility: false } },
  { name: "Plank Hold", muscleGroup: "core", difficulty: "beginner", equipment: ["bodyweight"], reps: { beginner: 30, intermediate: 45, advanced: 60 }, isHold: true, categories: { compound: false, cardio: false, plyometric: false, mobility: true } },
  { name: "Jumping Jacks", muscleGroup: "cardio", difficulty: "beginner", equipment: ["bodyweight"], reps: { beginner: 20, intermediate: 30, advanced: 40 }, categories: { compound: false, cardio: true, plyometric: true, mobility: false } },
  { name: "Lunges", muscleGroup: "legs", difficulty: "beginner", equipment: ["bodyweight"], reps: { beginner: 12, intermediate: 16, advanced: 24 }, alternatesSides: true, categories: { compound: true, cardio: false, plyometric: false, mobility: false } },
  { name: "High Knees", muscleGroup: "cardio", difficulty: "beginner", equipment: ["bodyweight"], reps: { beginner: 20, intermediate: 30, advanced: 40 }, categories: { compound: false, cardio: true, plyometric: true, mobility: false } },
  { name: "Squat Jumps", muscleGroup: "legs", difficulty: "intermediate", equipment: ["bodyweight"], reps: { beginner: 8, intermediate: 12, advanced: 16 }, categories: { compound: true, cardio: false, plyometric: true, mobility: false } },

  // Dumbbells (6 exercises)
  { name: "Dumbbell Thrusters", muscleGroup: "full-body", difficulty: "advanced", equipment: ["dumbbells"], reps: { beginner: 8, intermediate: 12, advanced: 15 }, categories: { compound: true, cardio: false, plyometric: false, mobility: false } },
  { name: "Dumbbell Goblet Squats", muscleGroup: "legs", difficulty: "intermediate", equipment: ["dumbbells"], reps: { beginner: 10, intermediate: 15, advanced: 20 }, categories: { compound: true, cardio: false, plyometric: false, mobility: false } },
  { name: "Dumbbell Rows", muscleGroup: "back", difficulty: "intermediate", equipment: ["dumbbells"], reps: { beginner: 8, intermediate: 12, advanced: 16 }, categories: { compound: true, cardio: false, plyometric: false, mobility: false } },
  { name: "Dumbbell Snatches", muscleGroup: "full-body", difficulty: "advanced", equipment: ["dumbbells"], reps: { beginner: 6, intermediate: 10, advanced: 14 }, categories: { compound: true, cardio: false, plyometric: true, mobility: false } },
  { name: "Dumbbell Shoulder Press", muscleGroup: "shoulders", difficulty: "intermediate", equipment: ["dumbbells"], reps: { beginner: 8, intermediate: 12, advanced: 16 }, categories: { compound: false, cardio: false, plyometric: false, mobility: false } },
  { name: "Dumbbell Lunges", muscleGroup: "legs", difficulty: "intermediate", equipment: ["dumbbells"], reps: { beginner: 8, intermediate: 12, advanced: 16 }, alternatesSides: true, categories: { compound: true, cardio: false, plyometric: false, mobility: false } },

  // Kettlebells (5 exercises)
  { name: "Kettlebell Swings", muscleGroup: "posterior-chain", difficulty: "intermediate", equipment: ["kettlebell"], reps: { beginner: 12, intermediate: 20, advanced: 30 }, categories: { compound: true, cardio: true, plyometric: true, mobility: false } },
  { name: "Kettlebell Goblet Squats", muscleGroup: "legs", difficulty: "intermediate", equipment: ["kettlebell"], reps: { beginner: 10, intermediate: 15, advanced: 20 }, categories: { compound: true, cardio: false, plyometric: false, mobility: false } },
  { name: "Kettlebell Clean & Press", muscleGroup: "full-body", difficulty: "advanced", equipment: ["kettlebell"], reps: { beginner: 6, intermediate: 10, advanced: 14 }, categories: { compound: true, cardio: false, plyometric: true, mobility: false } },
  { name: "Kettlebell Turkish Get-ups", muscleGroup: "full-body", difficulty: "advanced", equipment: ["kettlebell"], reps: { beginner: 4, intermediate: 6, advanced: 10 }, categories: { compound: true, cardio: false, plyometric: false, mobility: true } },
  { name: "Kettlebell Snatches", muscleGroup: "full-body", difficulty: "advanced", equipment: ["kettlebell"], reps: { beginner: 6, intermediate: 10, advanced: 14 }, categories: { compound: true, cardio: false, plyometric: true, mobility: false } },

  // Resistance Bands (4 exercises)
  { name: "Band Pull-aparts", muscleGroup: "shoulders", difficulty: "beginner", equipment: ["resistance_bands_loop"], reps: { beginner: 15, intermediate: 20, advanced: 25 }, categories: { compound: false, cardio: false, plyometric: false, mobility: true } },
  { name: "Band Squats", muscleGroup: "legs", difficulty: "beginner", equipment: ["resistance_bands_loop"], reps: { beginner: 15, intermediate: 20, advanced: 25 }, categories: { compound: true, cardio: false, plyometric: false, mobility: false } },
  { name: "Band Rows", muscleGroup: "back", difficulty: "beginner", equipment: ["resistance_band_long"], reps: { beginner: 12, intermediate: 15, advanced: 20 }, categories: { compound: true, cardio: false, plyometric: false, mobility: false } },
  { name: "Band Chest Press", muscleGroup: "chest", difficulty: "intermediate", equipment: ["resistance_band_long"], reps: { beginner: 10, intermediate: 15, advanced: 20 }, categories: { compound: true, cardio: false, plyometric: false, mobility: false } },

  // Barbell (5 exercises)
  { name: "Barbell Thrusters", muscleGroup: "full-body", difficulty: "advanced", equipment: ["barbell"], reps: { beginner: 8, intermediate: 12, advanced: 15 }, categories: { compound: true, cardio: false, plyometric: false, mobility: false } },
  { name: "Barbell Front Squats", muscleGroup: "legs", difficulty: "advanced", equipment: ["barbell"], reps: { beginner: 8, intermediate: 12, advanced: 15 }, categories: { compound: true, cardio: false, plyometric: false, mobility: false } },
  { name: "Barbell Deadlifts", muscleGroup: "posterior-chain", difficulty: "intermediate", equipment: ["barbell"], reps: { beginner: 8, intermediate: 12, advanced: 15 }, categories: { compound: true, cardio: false, plyometric: false, mobility: false } },
  { name: "Barbell Push Press", muscleGroup: "shoulders", difficulty: "intermediate", equipment: ["barbell"], reps: { beginner: 8, intermediate: 12, advanced: 15 }, categories: { compound: true, cardio: false, plyometric: true, mobility: false } },
  { name: "Barbell Rows", muscleGroup: "back", difficulty: "intermediate", equipment: ["barbell"], reps: { beginner: 8, intermediate: 12, advanced: 15 }, categories: { compound: true, cardio: false, plyometric: false, mobility: false } },

  // Pull-up Bar (4 exercises)
  { name: "Pull-ups", muscleGroup: "back", difficulty: "advanced", equipment: ["pull_up_bar"], reps: { beginner: 3, intermediate: 8, advanced: 12 }, categories: { compound: true, cardio: false, plyometric: false, mobility: false } },
  { name: "Chin-ups", muscleGroup: "back", difficulty: "advanced", equipment: ["pull_up_bar"], reps: { beginner: 3, intermediate: 8, advanced: 12 }, categories: { compound: true, cardio: false, plyometric: false, mobility: false } },
  { name: "Hanging Knee Raises", muscleGroup: "core", difficulty: "intermediate", equipment: ["pull_up_bar"], reps: { beginner: 8, intermediate: 12, advanced: 16 }, categories: { compound: false, cardio: false, plyometric: false, mobility: false } },
  { name: "Toes to Bar", muscleGroup: "core", difficulty: "advanced", equipment: ["pull_up_bar"], reps: { beginner: 5, intermediate: 10, advanced: 15 }, categories: { compound: false, cardio: false, plyometric: false, mobility: false } },

  // Bench (3 exercises)
  { name: "Bench Dips", muscleGroup: "triceps", difficulty: "beginner", equipment: ["bench"], reps: { beginner: 10, intermediate: 15, advanced: 20 }, categories: { compound: false, cardio: false, plyometric: false, mobility: false } },
  { name: "Box Jumps (Bench)", muscleGroup: "legs", difficulty: "intermediate", equipment: ["bench"], reps: { beginner: 8, intermediate: 12, advanced: 16 }, categories: { compound: false, cardio: false, plyometric: true, mobility: false } },
  { name: "Incline Push-ups", muscleGroup: "chest", difficulty: "beginner", equipment: ["bench"], reps: { beginner: 12, intermediate: 18, advanced: 25 }, categories: { compound: true, cardio: false, plyometric: false, mobility: false } },

  // Medicine Ball (4 exercises)
  { name: "Med Ball Slams", muscleGroup: "full-body", difficulty: "intermediate", equipment: ["medicine_ball"], reps: { beginner: 10, intermediate: 15, advanced: 20 }, categories: { compound: true, cardio: true, plyometric: true, mobility: false } },
  { name: "Med Ball Wall Balls", muscleGroup: "full-body", difficulty: "intermediate", equipment: ["medicine_ball"], reps: { beginner: 10, intermediate: 15, advanced: 20 }, categories: { compound: true, cardio: true, plyometric: false, mobility: false } },
  { name: "Med Ball Russian Twists", muscleGroup: "core", difficulty: "intermediate", equipment: ["medicine_ball"], reps: { beginner: 20, intermediate: 30, advanced: 40 }, categories: { compound: false, cardio: false, plyometric: false, mobility: false } },
  { name: "Med Ball Chest Pass", muscleGroup: "chest", difficulty: "beginner", equipment: ["medicine_ball"], reps: { beginner: 15, intermediate: 20, advanced: 25 }, categories: { compound: false, cardio: false, plyometric: true, mobility: false } },

  // Jump Rope (2 exercises)
  { name: "Double Unders", muscleGroup: "cardio", difficulty: "advanced", equipment: ["jump_rope"], reps: { beginner: 20, intermediate: 40, advanced: 60 }, categories: { compound: false, cardio: true, plyometric: true, mobility: false } },
  { name: "Single Unders", muscleGroup: "cardio", difficulty: "beginner", equipment: ["jump_rope"], reps: { beginner: 40, intermediate: 60, advanced: 80 }, categories: { compound: false, cardio: true, plyometric: false, mobility: false } },

  // Treadmill (2 exercises)
  { name: "Treadmill Sprint Intervals", muscleGroup: "cardio", difficulty: "intermediate", equipment: ["treadmill"], reps: { beginner: 30, intermediate: 45, advanced: 60 }, isHold: true, categories: { compound: false, cardio: true, plyometric: false, mobility: false } },
  { name: "Treadmill Incline Run", muscleGroup: "cardio", difficulty: "intermediate", equipment: ["treadmill"], reps: { beginner: 45, intermediate: 60, advanced: 75 }, isHold: true, categories: { compound: false, cardio: true, plyometric: false, mobility: false } },

  // Bike (2 exercises)
  { name: "Bike Sprint Intervals", muscleGroup: "cardio", difficulty: "intermediate", equipment: ["bike"], reps: { beginner: 30, intermediate: 45, advanced: 60 }, isHold: true, categories: { compound: false, cardio: true, plyometric: false, mobility: false } },
  { name: "Bike Hill Climbs", muscleGroup: "cardio", difficulty: "intermediate", equipment: ["bike"], reps: { beginner: 45, intermediate: 60, advanced: 75 }, isHold: true, categories: { compound: false, cardio: true, plyometric: false, mobility: false } },

  // Rower (2 exercises)
  { name: "Rowing Sprint Intervals", muscleGroup: "cardio", difficulty: "intermediate", equipment: ["rower"], reps: { beginner: 30, intermediate: 45, advanced: 60 }, isHold: true, categories: { compound: false, cardio: true, plyometric: false, mobility: false } },
  { name: "Rowing 500m", muscleGroup: "cardio", difficulty: "intermediate", equipment: ["rower"], reps: { beginner: 120, intermediate: 110, advanced: 100 }, isHold: true, categories: { compound: false, cardio: true, plyometric: false, mobility: false } },

  // Elliptical (1 exercise)
  { name: "Elliptical Sprint Intervals", muscleGroup: "cardio", difficulty: "beginner", equipment: ["elliptical"], reps: { beginner: 30, intermediate: 45, advanced: 60 }, isHold: true, categories: { compound: false, cardio: true, plyometric: false, mobility: false } },

  // Sliders (3 exercises)
  { name: "Slider Mountain Climbers", muscleGroup: "core", difficulty: "intermediate", equipment: ["sliders"], reps: { beginner: 20, intermediate: 30, advanced: 40 }, categories: { compound: false, cardio: true, plyometric: false, mobility: false } },
  { name: "Slider Pike", muscleGroup: "core", difficulty: "advanced", equipment: ["sliders"], reps: { beginner: 8, intermediate: 12, advanced: 16 }, categories: { compound: false, cardio: false, plyometric: false, mobility: false } },
  { name: "Slider Lunges", muscleGroup: "legs", difficulty: "intermediate", equipment: ["sliders"], reps: { beginner: 10, intermediate: 16, advanced: 20 }, alternatesSides: true, categories: { compound: true, cardio: false, plyometric: false, mobility: false } },

  // Step/Box (3 exercises)
  { name: "Box Jumps", muscleGroup: "legs", difficulty: "intermediate", equipment: ["step_box"], reps: { beginner: 8, intermediate: 12, advanced: 16 }, categories: { compound: false, cardio: false, plyometric: true, mobility: false } },
  { name: "Box Step-ups", muscleGroup: "legs", difficulty: "beginner", equipment: ["step_box"], reps: { beginner: 10, intermediate: 16, advanced: 24 }, alternatesSides: true, categories: { compound: true, cardio: false, plyometric: false, mobility: false } },
  { name: "Lateral Box Step-overs", muscleGroup: "legs", difficulty: "intermediate", equipment: ["step_box"], reps: { beginner: 10, intermediate: 16, advanced: 20 }, alternatesSides: true, categories: { compound: false, cardio: true, plyometric: false, mobility: false } },

  // TRX/Suspension (2 exercises)
  { name: "TRX Rows", muscleGroup: "back", difficulty: "intermediate", equipment: ["trx"], reps: { beginner: 10, intermediate: 15, advanced: 20 }, categories: { compound: true, cardio: false, plyometric: false, mobility: false } },
  { name: "TRX Pike", muscleGroup: "core", difficulty: "advanced", equipment: ["trx"], reps: { beginner: 8, intermediate: 12, advanced: 16 }, categories: { compound: false, cardio: false, plyometric: false, mobility: false } },
];

// GeneratedWorkout type now imported from @shared/schema


/**
 * Helper: Calculate exercise fitness score based on goal biases
 * Higher score = better match for user's goals
 */
function calculateExerciseFitnessScore(
  exercise: Exercise,
  goalBias: { compound: number; cardio: number; plyometric: number; mobility: number }
): number {
  let score = 0;

  if (exercise.categories.compound && goalBias.compound > 0) {
    score += goalBias.compound * 10;
  }
  if (exercise.categories.cardio && goalBias.cardio > 0) {
    score += goalBias.cardio * 10;
  }
  if (exercise.categories.plyometric && goalBias.plyometric > 0) {
    score += goalBias.plyometric * 10;
  }
  if (exercise.categories.mobility && goalBias.mobility > 0) {
    score += goalBias.mobility * 10;
  }

  // Baseline score so exercises with no matching categories aren't completely excluded
  return score + 1;
}

/**
 * Helper: Weighted random selection based on fitness scores
 */
function weightedRandomSelection<T>(items: T[], getWeight: (item: T) => number): T {
  const totalWeight = items.reduce((sum, item) => sum + getWeight(item), 0);
  let random = Math.random() * totalWeight;

  for (const item of items) {
    random -= getWeight(item);
    if (random <= 0) {
      return item;
    }
  }

  return items[items.length - 1]; // Fallback
}

function applyExerciseUtilityWeight(
  baseWeight: number,
  exerciseName: string,
  personalization?: PersonalizationInsights,
): number {
  if (!personalization) return baseWeight;
  const stats = personalization.exerciseScores[exerciseName];
  if (!stats) return baseWeight;

  const utilityBoost = clampNumber(stats.utility, 0.75, 1.35);
  const confidenceBoost = clampNumber(1 + Math.min(stats.sampleSize, 20) / 80, 1, 1.25);
  return baseWeight * utilityBoost * confidenceBoost;
}

function banditSelectExercise<T extends { name: string }>(
  candidates: T[],
  personalization: PersonalizationInsights | undefined,
  baseWeight: (item: T) => number,
  explorationEpsilon = 0.15,
): T {
  if (!candidates.length) {
    throw new Error("No exercise candidates available");
  }

  if (personalization?.exerciseScores && Math.random() < explorationEpsilon) {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  return weightedRandomSelection(candidates, (item) => {
    const base = baseWeight(item);
    return applyExerciseUtilityWeight(base, item.name, personalization);
  });
}

function normalizeExerciseBias(
  bias:
    | { compoundLifts: number; cardio: number; plyometric: number; mobility: number }
    | { compound: number; cardio: number; plyometric: number; mobility: number },
): { compound: number; cardio: number; plyometric: number; mobility: number } {
  if ("compound" in bias) {
    return bias;
  }

  return {
    compound: bias.compoundLifts,
    cardio: bias.cardio,
    plyometric: bias.plyometric,
    mobility: bias.mobility,
  };
}

const clampNumber = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function getEnergyLevelMultiplier(intent?: SessionIntent): number {
  if (!intent?.energyLevel) return 1;
  if (intent.energyLevel === "low") return 0.9;
  if (intent.energyLevel === "high") return 1.1;
  return 1;
}

function isHighIntensityExercise(exercise: Exercise, difficultyTag: string): boolean {
  return (
    exercise.difficulty === "advanced" ||
    exercise.categories.plyometric ||
    (exercise.categories.compound && difficultyTag !== "beginner")
  );
}

function getRecoveryAdjustment(
  exercise: Exercise,
  difficultyTag: string,
  personalization?: PersonalizationInsights,
): number {
  if (!personalization?.muscleRecovery) return 1;
  const recovery = personalization.muscleRecovery[exercise.muscleGroup];
  if (!recovery) return 1;

  // If still highly fatigued and exercise is high intensity, heavily down-weight
  if (recovery.recoveryScore < 0.35 && isHighIntensityExercise(exercise, difficultyTag)) {
    return 0.15;
  }

  // Soft penalty for any recovery under 70%
  if (recovery.recoveryScore < 0.7) {
    return clampNumber(recovery.recoveryScore + 0.15, 0.25, 1);
  }

  return clampNumber(1 + (recovery.recoveryScore - 0.8) * 0.25, 0.9, 1.15);
}

function filterExercisesForRecovery(
  candidates: Exercise[],
  difficultyTag: string,
  personalization?: PersonalizationInsights,
): Exercise[] {
  if (!personalization?.muscleRecovery) return candidates;

  const filtered = candidates.filter((ex) => {
    const recovery = personalization.muscleRecovery[ex.muscleGroup];
    if (!recovery) return true;
    return !(recovery.recoveryScore < 0.35 && isHighIntensityExercise(ex, difficultyTag));
  });

  return filtered.length ? filtered : candidates;
}

function getIntensityMultiplier(personalization?: PersonalizationInsights): number {
  if (!personalization) return 1;
  const adjustment = (personalization.averageHitRate - 1) * 0.4 - personalization.skipRate * 0.35 - personalization.fatigueTrend * 0.25;
  return clampNumber(1 + adjustment, 0.75, 1.3);
}

function applyIntentBias(
  bias: { compound: number; cardio: number; plyometric: number; mobility: number },
  intent?: SessionIntent
): { compound: number; cardio: number; plyometric: number; mobility: number } {
  if (!intent?.focusToday) return bias;

  const focus = intent.focusToday.toLowerCase();
  const adjusted = { ...bias };

  if (focus.includes("cardio") || focus.includes("engine")) {
    adjusted.cardio += 0.3;
  }
  if (focus.includes("strength") || focus.includes("power") || focus.includes("lift")) {
    adjusted.compound += 0.3;
  }
  if (focus.includes("mobility") || focus.includes("recovery") || focus.includes("stretch")) {
    adjusted.mobility += 0.35;
    adjusted.plyometric = Math.max(0, adjusted.plyometric - 0.2);
  }
  if (focus.includes("explosive") || focus.includes("speed")) {
    adjusted.plyometric += 0.25;
  }

  return adjusted;
}

function describeExerciseBias(bias: { compound: number; cardio: number; plyometric: number; mobility: number }): string {
  const sorted = Object.entries(bias).sort((a, b) => b[1] - a[1]);
  const primary = sorted[0]?.[0];
  if (!primary) return "balanced work";

  const friendlyLabels: Record<string, string> = {
    compound: "strength/compound", cardio: "engine/cardio", plyometric: "power/plyo", mobility: "mobility"
  };

  return friendlyLabels[primary] ?? primary;
}

function getMusclePreferenceMultiplier(muscleGroup: string, personalization?: PersonalizationInsights): number {
  if (!personalization) return 1;
  const preference = personalization.exercisePreference[muscleGroup];
  if (!preference) return 1;
  return clampNumber(preference, 0.85, 1.25);
}

export function generateEMOMWorkout(
  skillScore: number,
  fitnessLevel: string,
  equipment: string[],
  goalFocus: string | null,
  primaryGoal?: PrimaryGoalId | null,
  goalWeights?: Record<PrimaryGoalId, number>,
  personalization?: PersonalizationInsights,
  intent?: SessionIntent
): GeneratedWorkout {
  // Migrate legacy goalFocus to new primaryGoal if needed
  let resolvedPrimaryGoal = primaryGoal || migrateLegacyGoal(goalFocus);

  // Migrate equipment values to new typed format for backward compatibility
  const migratedEquipment: EquipmentId[] = migrateEquipment(equipment);
  const equipmentSet = new Set<EquipmentId>(migratedEquipment);

  // Get equipment richness to adjust difficulty
  const equipmentRichness = getEquipmentRichness(migratedEquipment);

  // Get goal configuration
  const goalConfig = resolvedPrimaryGoal ? getPrimaryGoalConfig(resolvedPrimaryGoal) : null;

  // Determine difficulty tier
  let difficultyTag: "beginner" | "intermediate" | "advanced";
  if (skillScore <= 35) {
    difficultyTag = "beginner";
  } else if (skillScore <= 70) {
    difficultyTag = "intermediate";
  } else {
    difficultyTag = "advanced";
  }

  const energyMultiplier = getEnergyLevelMultiplier(intent);
  const intensityMultiplier = getIntensityMultiplier(personalization) * energyMultiplier;

  // Determine duration based on goal preferences, difficulty, and equipment richness
  let durationMinutes: number;

  if (goalConfig && goalConfig.preferredDurationsMinutes) {
    // Use goal-specific duration range
    const [minDuration, maxDuration] = goalConfig.preferredDurationsMinutes;
    durationMinutes = minDuration + Math.floor(Math.random() * (maxDuration - minDuration + 1));

    // Adjust for difficulty level
    if (difficultyTag === "beginner") {
      durationMinutes = Math.max(minDuration, durationMinutes - 5);
    } else if (difficultyTag === "advanced") {
      durationMinutes = Math.min(maxDuration, durationMinutes + 3);
    }

    // Full equipment allows slightly longer sessions
    if (equipmentRichness === "full") {
      durationMinutes += 2;
    }
  } else {
    // Fallback to original duration logic
    if (difficultyTag === "beginner") {
      durationMinutes = 8 + Math.floor(Math.random() * 5); // 8-12
    } else if (difficultyTag === "intermediate") {
      durationMinutes = 12 + Math.floor(Math.random() * 9); // 12-20
      if (equipmentRichness === "full") {
        durationMinutes += 2;
      }
    } else {
      durationMinutes = 20 + Math.floor(Math.random() * 11); // 20-30
      if (equipmentRichness === "full") {
        durationMinutes += 3;
      }
    }
  }

  if (personalization) {
    const durationTuning = clampNumber(
      1 + (personalization.averageHitRate - 1) * 0.3 - personalization.skipRate * 0.25,
      0.85,
      1.2
    );
    durationMinutes = Math.max(6, Math.round(durationMinutes * durationTuning));
  }

  durationMinutes = Math.max(6, Math.round(durationMinutes * clampNumber(energyMultiplier, 0.85, 1.15)));

    // Get exercise bias from goal weights (or use primary goal config)
    const rawExerciseBias = goalWeights && resolvedPrimaryGoal
      ? getCombinedExerciseBias(goalWeights)
      : goalConfig?.exerciseBias ?? { compound: 0.5, cardio: 0.5, plyometric: 0.5, mobility: 0.2 };
    const exerciseBias = applyIntentBias(normalizeExerciseBias(rawExerciseBias), intent);

  // Filter exercises by equipment and difficulty
  const availableExercises = EXERCISES.filter((ex) => {
    // Check if user has ALL required equipment for this exercise
    const hasAllEquipment = ex.equipment.every(eq => equipmentSet.has(eq));
    if (!hasAllEquipment) return false;

    // Filter by difficulty tier
    if (difficultyTag === "beginner" && ex.difficulty === "advanced") return false;
    if (difficultyTag === "beginner" && ex.difficulty === "intermediate" && Math.random() > 0.3) return false;

    return true;
  });

  // Generate rounds with aggressive variety tracking
  const rounds: GeneratedWorkout['rounds'] = [];
  const usedExercises = new Map<string, number>(); // Track total usage count
  const recentlyUsedExercises = new Map<string, number>(); // Track last used minute

  for (let i = 0; i < durationMinutes; i++) {
    // Never repeat consecutive exercises
    const lastExercise = i > 0 ? rounds[i - 1].exerciseName : null;
    
    // Build candidates - filter out recently used (within last 3 minutes)
    let candidates = availableExercises.filter(ex => {
      if (ex.name === lastExercise) return false; // Never repeat consecutively

      // Penalize if used in last 3 minutes
      const lastUsedMinute = recentlyUsedExercises.get(ex.name);
      if (lastUsedMinute !== undefined && i - lastUsedMinute < 4) {
        return false; // Too recent, exclude from candidates
      }
      
      return true;
    });

    candidates = filterExercisesForRecovery(candidates, difficultyTag, personalization);

    // Prefer unused exercises
    const unusedExercises = candidates.filter(ex => !usedExercises.has(ex.name));
    const priorityCandidates = unusedExercises.length > 0 ? unusedExercises : candidates;
    const finalCandidates = priorityCandidates.length > 0 ? priorityCandidates : availableExercises.filter(ex => ex.name !== lastExercise);

    // Use weighted selection with exploration/exploitation for personalization
    const exercise = banditSelectExercise(
      finalCandidates,
      personalization,
      (ex) => {
        let baseScore = calculateExerciseFitnessScore(ex, exerciseBias);
        baseScore *= getMusclePreferenceMultiplier(ex.muscleGroup, personalization);
        baseScore *= getRecoveryAdjustment(ex, difficultyTag, personalization);

        // AGGRESSIVE BOOST: Unused exercises get 10x weight
        if (!usedExercises.has(ex.name)) {
          baseScore *= 10;
        } else {
          // Heavy penalty for recently used exercises
          const lastUsedMinute = recentlyUsedExercises.get(ex.name);
          if (lastUsedMinute !== undefined) {
            const minutesSinceUse = i - lastUsedMinute;
            baseScore = baseScore / (1 + Math.max(0, 5 - minutesSinceUse) * 2);
          }
          // Penalty for overall usage frequency
          const usageCount = usedExercises.get(ex.name) || 0;
          baseScore = baseScore / (1 + usageCount * 1.5);
        }

        return baseScore;
      },
      0.12,
    );

    rounds.push({
      minuteIndex: i + 1,
      exerciseName: exercise.name,
      targetMuscleGroup: exercise.muscleGroup,
      difficulty: exercise.difficulty,
      reps: Math.max(1, Math.round(exercise.reps[difficultyTag] * intensityMultiplier)),
      isHold: exercise.isHold || false,
      alternatesSides: exercise.alternatesSides || false,
    });

    // Update tracking
    const currentCount = usedExercises.get(exercise.name) || 0;
    usedExercises.set(exercise.name, currentCount + 1);
    recentlyUsedExercises.set(exercise.name, i);
  }

  const muscleGroupLoad = calculateMuscleGroupLoad(rounds);
  const primaryMuscleGroups = derivePrimaryMuscleGroups(muscleGroupLoad);

  // Set focus label based on goal (use new goal label or fallback to legacy goalFocus)
  const focusLabel = intent?.focusToday ?? goalConfig?.label ?? goalFocus ?? "General Fitness";

  const rationale = {
    framework: intent?.focusToday
      ? `${focusLabel} focus requested; kept EMOM for steady pacing with frequent movement changes.`
      : `Selected EMOM to align with ${goalConfig?.label ?? "general fitness"} goal bias and maintain interval structure.`,
    intensity: `Calibrated to ${difficultyTag} (skill score ${skillScore}) with ${intent?.energyLevel ?? "moderate"} energy target; intensity multiplier ${Math.round(intensityMultiplier * 100)}% and ${durationMinutes} min duration adjusted for equipment (${equipmentRichness}).`,
    exerciseSelection: `Biasing toward ${describeExerciseBias(exerciseBias)} while respecting available gear; variety guardrails reduced repeats and honored any mobility/cardio intent.`
  };

  return {
    framework: "EMOM",
    durationMinutes,
    difficultyTag,
    focusLabel,
    rounds,
    primaryMuscleGroups,
    muscleGroupLoad,
    intent,
    rationale,
  };
}

/**
 * TABATA WORKOUT GENERATOR
 * ========================
 * Tabata Format: 20 seconds work, 10 seconds rest, 8 rounds per exercise
 * Classic Tabata = 4 minutes per exercise (8 x 30s intervals)
 * Typically 2-3 exercises for 8-12 minute total workout
 */
export function generateTabataWorkout(
  skillScore: number,
  fitnessLevel: string,
  equipment: string[],
  goalFocus: string | null,
  primaryGoal?: PrimaryGoalId | null,
  goalWeights?: Record<PrimaryGoalId, number>,
  personalization?: PersonalizationInsights,
  intent?: SessionIntent
): GeneratedWorkout {
  // Migrate legacy goalFocus to new primaryGoal if needed
  let resolvedPrimaryGoal = primaryGoal || migrateLegacyGoal(goalFocus);

  // Migrate equipment values to new typed format for backward compatibility
  const migratedEquipment: EquipmentId[] = migrateEquipment(equipment);
  const equipmentSet = new Set<EquipmentId>(migratedEquipment);

  // Get equipment richness to adjust difficulty
  const equipmentRichness = getEquipmentRichness(migratedEquipment);

  // Get goal configuration
  const goalConfig = resolvedPrimaryGoal ? getPrimaryGoalConfig(resolvedPrimaryGoal) : null;

  // Determine difficulty tier
  let difficultyTag: "beginner" | "intermediate" | "advanced";
  if (skillScore <= 35) {
    difficultyTag = "beginner";
  } else if (skillScore <= 70) {
    difficultyTag = "intermediate";
  } else {
    difficultyTag = "advanced";
  }

  const energyMultiplier = getEnergyLevelMultiplier(intent);
  const intensityMultiplier = getIntensityMultiplier(personalization) * energyMultiplier;

  // Tabata: 2-3 exercises (8-12 minutes total)
  // Each exercise is 4 minutes (8 rounds of 20s work / 10s rest)
  let numExercises: number;
  if (difficultyTag === "beginner") {
    numExercises = 2; // 8 minutes
  } else if (difficultyTag === "intermediate") {
    numExercises = 2 + Math.floor(Math.random() * 2); // 2-3 exercises (8-12 minutes)
  } else {
    numExercises = 3; // 12 minutes
  }

  let durationMinutes = numExercises * 4; // 4 minutes per exercise

  if (personalization) {
    const tuning = clampNumber(
      1 + (personalization.averageHitRate - 1) * 0.25 - personalization.skipRate * 0.25,
      0.85,
      1.2
    );
    durationMinutes = Math.max(6, Math.round(durationMinutes * tuning));
  }

  durationMinutes = Math.max(6, Math.round(durationMinutes * clampNumber(energyMultiplier, 0.85, 1.15)));

    // Get exercise bias from goal weights
    const rawExerciseBias = goalWeights && resolvedPrimaryGoal
      ? getCombinedExerciseBias(goalWeights)
      : goalConfig?.exerciseBias ?? { compound: 0.5, cardio: 0.7, plyometric: 0.7, mobility: 0.1 };
    const exerciseBias = applyIntentBias(normalizeExerciseBias(rawExerciseBias), intent);

  // Filter exercises by equipment and difficulty - Tabata needs high-intensity exercises
  const availableExercises = EXERCISES.filter((ex) => {
    const hasAllEquipment = ex.equipment.every(eq => equipmentSet.has(eq));
    if (!hasAllEquipment) return false;

    // Tabata works best with cardio and plyometric exercises
    if (!ex.categories.cardio && !ex.categories.plyometric && !ex.categories.compound) return false;

    // Filter by difficulty tier
    if (difficultyTag === "beginner" && ex.difficulty === "advanced") return false;
    if (difficultyTag === "beginner" && ex.difficulty === "intermediate" && Math.random() > 0.3) return false;

    return true;
  });

  // Generate exercises with variety boost
  const rounds: GeneratedWorkout['rounds'] = [];
  const selectedExercises: Exercise[] = [];
  const exerciseUsageCount = new Map<string, number>();

  // Select unique exercises with variety preference
  for (let i = 0; i < numExercises; i++) {
    const candidates = filterExercisesForRecovery(
      availableExercises.filter(ex => !selectedExercises.includes(ex)),
      difficultyTag,
      personalization,
    );
    const exercise = banditSelectExercise(
      candidates.length > 0 ? candidates : availableExercises,
      personalization,
      (ex) => {
        let baseScore = calculateExerciseFitnessScore(ex, exerciseBias);
        baseScore *= getMusclePreferenceMultiplier(ex.muscleGroup, personalization);
        baseScore *= getRecoveryAdjustment(ex, difficultyTag, personalization);
        // Boost unused exercises to encourage variety
        if (!exerciseUsageCount.has(ex.name)) {
          baseScore *= 1.5;
        }
        return baseScore;
      },
      0.15,
    );
    selectedExercises.push(exercise);
    exerciseUsageCount.set(exercise.name, (exerciseUsageCount.get(exercise.name) || 0) + 1);
  }

  // Create rounds: each exercise gets 8 intervals (4 minutes)
  // minuteIndex is 1-based for cleaner UI display
  let minuteIndex = 1;
  for (const exercise of selectedExercises) {
    // Each Tabata exercise has 8 rounds of 20s work / 10s rest
    for (let round = 0; round < 8; round++) {
        rounds.push({
          minuteIndex: minuteIndex++,
          exerciseName: exercise.name,
          targetMuscleGroup: exercise.muscleGroup,
          difficulty: exercise.difficulty,
          reps: Math.max(1, Math.ceil(exercise.reps[difficultyTag] * 0.4 * intensityMultiplier)), // Suggested reps per work interval
          isHold: exercise.isHold || false,
          alternatesSides: exercise.alternatesSides || false,
        });
      }
    }

  const tabataMuscleLoad = calculateMuscleGroupLoad(rounds);
  const tabataPrimaryMuscles = derivePrimaryMuscleGroups(tabataMuscleLoad);

  const focusLabel = intent?.focusToday ?? goalConfig?.label ?? goalFocus ?? "General Fitness";

  const rationale = {
    framework: intent?.focusToday
      ? `${focusLabel} focus requested; Tabata kept for fast intervals while respecting intent.`
      : `Selected Tabata to emphasize high-intensity intervals supporting ${goalConfig?.label ?? "conditioning"}.`,
    intensity: `Scaled to ${difficultyTag} (skill score ${skillScore}) with ${intent?.energyLevel ?? "moderate"} energy input; multiplier ${Math.round(intensityMultiplier * 100)}% and ${durationMinutes} min total adjusted for energy/equipment (${equipmentRichness}).`,
    exerciseSelection: `Weighted toward ${describeExerciseBias(exerciseBias)} while filtering for cardio/plyo-friendly moves and avoiding repeats.`
  };

  return {
    framework: "Tabata",
    durationMinutes,
    difficultyTag,
    focusLabel,
    rounds,
    primaryMuscleGroups: tabataPrimaryMuscles,
    muscleGroupLoad: tabataMuscleLoad,
    workSeconds: Math.max(15, Math.round(20 * clampNumber(intensityMultiplier, 0.9, 1.15))),
    restSeconds: Math.max(8, Math.round(10 / clampNumber(intensityMultiplier, 0.9, 1.15))),
    sets: 8,
    intent,
    rationale,
  };
}

/**
 * AMRAP WORKOUT GENERATOR
 * ========================
 * AMRAP Format: As Many Rounds As Possible in a set time
 * User continuously repeats a circuit of exercises for the duration
 * Typically 10-20 minutes with 3-6 exercises per circuit
 */
export function generateAMRAPWorkout(
  skillScore: number,
  fitnessLevel: string,
  equipment: string[],
  goalFocus: string | null,
  primaryGoal?: PrimaryGoalId | null,
  goalWeights?: Record<PrimaryGoalId, number>,
  personalization?: PersonalizationInsights,
  intent?: SessionIntent
): GeneratedWorkout {
  // Migrate legacy goalFocus to new primaryGoal if needed
  let resolvedPrimaryGoal = primaryGoal || migrateLegacyGoal(goalFocus);

  // Migrate equipment values to new typed format for backward compatibility
  const migratedEquipment: EquipmentId[] = migrateEquipment(equipment);
  const equipmentSet = new Set<EquipmentId>(migratedEquipment);

  // Get equipment richness to adjust difficulty
  const equipmentRichness = getEquipmentRichness(migratedEquipment);

  // Get goal configuration
  const goalConfig = resolvedPrimaryGoal ? getPrimaryGoalConfig(resolvedPrimaryGoal) : null;

  // Determine difficulty tier
  let difficultyTag: "beginner" | "intermediate" | "advanced";
  if (skillScore <= 35) {
    difficultyTag = "beginner";
  } else if (skillScore <= 70) {
    difficultyTag = "intermediate";
  } else {
    difficultyTag = "advanced";
  }

  const energyMultiplier = getEnergyLevelMultiplier(intent);
  const intensityMultiplier = getIntensityMultiplier(personalization) * energyMultiplier;

  // AMRAP: 10-20 minutes typical duration
  let durationMinutes: number;
  if (difficultyTag === "beginner") {
    durationMinutes = 10 + Math.floor(Math.random() * 3); // 10-12 minutes
  } else if (difficultyTag === "intermediate") {
    durationMinutes = 12 + Math.floor(Math.random() * 5); // 12-16 minutes
  } else {
    durationMinutes = 15 + Math.floor(Math.random() * 6); // 15-20 minutes
  }

  if (personalization) {
    const tuning = clampNumber(
      1 + (personalization.averageHitRate - 1) * 0.3 - personalization.skipRate * 0.25,
      0.85,
      1.2
    );
    durationMinutes = Math.max(8, Math.round(durationMinutes * tuning));
  }

  durationMinutes = Math.max(8, Math.round(durationMinutes * clampNumber(energyMultiplier, 0.85, 1.15)));

    // Get exercise bias from goal weights
    const rawExerciseBias = goalWeights && resolvedPrimaryGoal
      ? getCombinedExerciseBias(goalWeights)
      : goalConfig?.exerciseBias ?? { compound: 0.6, cardio: 0.6, plyometric: 0.5, mobility: 0.2 };
    const exerciseBias = applyIntentBias(normalizeExerciseBias(rawExerciseBias), intent);

  // Filter exercises by equipment and difficulty
  const availableExercises = EXERCISES.filter((ex) => {
    const hasAllEquipment = ex.equipment.every(eq => equipmentSet.has(eq));
    if (!hasAllEquipment) return false;

    // Filter by difficulty tier
    if (difficultyTag === "beginner" && ex.difficulty === "advanced") return false;
    if (difficultyTag === "beginner" && ex.difficulty === "intermediate" && Math.random() > 0.3) return false;

    return true;
  });

  // AMRAP circuit: 3-6 exercises
  let numExercises: number;
  if (difficultyTag === "beginner") {
    numExercises = 3;
  } else if (difficultyTag === "intermediate") {
    numExercises = 4 + Math.floor(Math.random() * 2); // 4-5
  } else {
    numExercises = 5 + Math.floor(Math.random() * 2); // 5-6
  }

  // Select exercises for the circuit with variety boost
  const rounds: GeneratedWorkout['rounds'] = [];
  const circuitExercises: Exercise[] = [];
  const exerciseUsageCount = new Map<string, number>();

  for (let i = 0; i < numExercises; i++) {
    const candidates = filterExercisesForRecovery(
      availableExercises.filter(ex => !circuitExercises.includes(ex)),
      difficultyTag,
      personalization,
    );
    const exercise = banditSelectExercise(
      candidates.length > 0 ? candidates : availableExercises,
      personalization,
      (ex) => {
        let baseScore = calculateExerciseFitnessScore(ex, exerciseBias);
        baseScore *= getMusclePreferenceMultiplier(ex.muscleGroup, personalization);
        baseScore *= getRecoveryAdjustment(ex, difficultyTag, personalization);
        // Boost unused exercises to encourage variety
        if (!exerciseUsageCount.has(ex.name)) {
          baseScore *= 1.5;
        }
        return baseScore;
      },
      0.15,
    );
    circuitExercises.push(exercise);
    exerciseUsageCount.set(exercise.name, (exerciseUsageCount.get(exercise.name) || 0) + 1);
  }

  // Create rounds array (the circuit repeats for duration)
  // Store as single circuit that user repeats
  for (let i = 0; i < circuitExercises.length; i++) {
    const exercise = circuitExercises[i];
    rounds.push({
      // 1-based index for cleaner UI labels
      minuteIndex: i + 1,
      exerciseName: exercise.name,
      targetMuscleGroup: exercise.muscleGroup,
      difficulty: exercise.difficulty,
      reps: Math.max(1, Math.round(exercise.reps[difficultyTag] * intensityMultiplier)),
      isHold: exercise.isHold || false,
      alternatesSides: exercise.alternatesSides || false,
    });
  }

  const amrapMuscleLoad = calculateMuscleGroupLoad(rounds);
  const amrapPrimaryMuscles = derivePrimaryMuscleGroups(amrapMuscleLoad);

  const focusLabel = intent?.focusToday ?? goalConfig?.label ?? goalFocus ?? "General Fitness";

  const rationale = {
    framework: intent?.focusToday
      ? `${focusLabel} focus requested; AMRAP kept to encourage continuous effort with that emphasis.`
      : `Selected AMRAP to align with ${goalConfig?.label ?? "metabolic"} emphasis and continuous pacing.`,
    intensity: `Difficulty ${difficultyTag} (skill score ${skillScore}) with ${intent?.energyLevel ?? "moderate"} energy request; intensity multiplier ${Math.round(intensityMultiplier * 100)}% and ${durationMinutes} min duration tuned for energy/equipment (${equipmentRichness}).`,
    exerciseSelection: `Circuit favors ${describeExerciseBias(exerciseBias)} while rotating through available gear and respecting avoidance of recent repeats.`
  };

  return {
    framework: "AMRAP",
    durationMinutes,
    difficultyTag,
    focusLabel,
    rounds,
    primaryMuscleGroups: amrapPrimaryMuscles,
    muscleGroupLoad: amrapMuscleLoad,
    intent,
    rationale,
  };
}

/**
 * CIRCUIT WORKOUT GENERATOR
 * ==========================
 * Circuit Format: Set number of rounds through a series of exercises
 * Rest between rounds, typically 3-5 rounds of 4-8 exercises
 * Total duration: 15-30 minutes
 */
export function generateCircuitWorkout(
  skillScore: number,
  fitnessLevel: string,
  equipment: string[],
  goalFocus: string | null,
  primaryGoal?: PrimaryGoalId | null,
  goalWeights?: Record<PrimaryGoalId, number>,
  personalization?: PersonalizationInsights,
  intent?: SessionIntent
): GeneratedWorkout {
  // Migrate legacy goalFocus to new primaryGoal if needed
  let resolvedPrimaryGoal = primaryGoal || migrateLegacyGoal(goalFocus);

  // Migrate equipment values to new typed format for backward compatibility
  const migratedEquipment: EquipmentId[] = migrateEquipment(equipment);
  const equipmentSet = new Set<EquipmentId>(migratedEquipment);

  // Get equipment richness to adjust difficulty
  const equipmentRichness = getEquipmentRichness(migratedEquipment);

  // Get goal configuration
  const goalConfig = resolvedPrimaryGoal ? getPrimaryGoalConfig(resolvedPrimaryGoal) : null;

  // Determine difficulty tier
  let difficultyTag: "beginner" | "intermediate" | "advanced";
  if (skillScore <= 35) {
    difficultyTag = "beginner";
  } else if (skillScore <= 70) {
    difficultyTag = "intermediate";
  } else {
    difficultyTag = "advanced";
  }

  const energyMultiplier = getEnergyLevelMultiplier(intent);
  const intensityMultiplier = getIntensityMultiplier(personalization) * energyMultiplier;

  // Circuit: 3-5 rounds
  let totalRounds: number;
  if (difficultyTag === "beginner") {
    totalRounds = 3;
  } else if (difficultyTag === "intermediate") {
    totalRounds = 3 + Math.floor(Math.random() * 2); // 3-4 rounds
  } else {
    totalRounds = 4 + Math.floor(Math.random() * 2); // 4-5 rounds
  }

    // Get exercise bias from goal weights
    const rawExerciseBias = goalWeights && resolvedPrimaryGoal
      ? getCombinedExerciseBias(goalWeights)
      : goalConfig?.exerciseBias ?? { compound: 0.7, cardio: 0.4, plyometric: 0.4, mobility: 0.3 };
    const exerciseBias = applyIntentBias(normalizeExerciseBias(rawExerciseBias), intent);

  // Filter exercises by equipment and difficulty
  const availableExercises = EXERCISES.filter((ex) => {
    const hasAllEquipment = ex.equipment.every(eq => equipmentSet.has(eq));
    if (!hasAllEquipment) return false;

    // Filter by difficulty tier
    if (difficultyTag === "beginner" && ex.difficulty === "advanced") return false;
    if (difficultyTag === "beginner" && ex.difficulty === "intermediate" && Math.random() > 0.3) return false;

    return true;
  });

  // Circuit exercises: 4-8 exercises per round
  let exercisesPerRound: number;
  if (difficultyTag === "beginner") {
    exercisesPerRound = 4 + Math.floor(Math.random() * 2); // 4-5
  } else if (difficultyTag === "intermediate") {
    exercisesPerRound = 5 + Math.floor(Math.random() * 2); // 5-6
  } else {
    exercisesPerRound = 6 + Math.floor(Math.random() * 3); // 6-8
  }

  // Select exercises for the circuit with variety boost
  const circuitExercises: Exercise[] = [];
  const exerciseUsageCount = new Map<string, number>();

  for (let i = 0; i < exercisesPerRound; i++) {
    const candidates = filterExercisesForRecovery(
      availableExercises.filter(ex => !circuitExercises.includes(ex)),
      difficultyTag,
      personalization,
    );
    const exercise = banditSelectExercise(
      candidates.length > 0 ? candidates : availableExercises,
      personalization,
      (ex) => {
        let baseScore = calculateExerciseFitnessScore(ex, exerciseBias);
        baseScore *= getMusclePreferenceMultiplier(ex.muscleGroup, personalization);
        baseScore *= getRecoveryAdjustment(ex, difficultyTag, personalization);
        // Boost unused exercises to encourage variety
        if (!exerciseUsageCount.has(ex.name)) {
          baseScore *= 1.5;
        }
        return baseScore;
      },
      0.15,
    );
    circuitExercises.push(exercise);
    exerciseUsageCount.set(exercise.name, (exerciseUsageCount.get(exercise.name) || 0) + 1);
  }

  // Create rounds array (circuit repeated for totalRounds)
  const rounds: GeneratedWorkout['rounds'] = [];
  // 1-based index so UI never shows interval "0"
  let minuteIndex = 1;

  for (let round = 0; round < totalRounds; round++) {
    for (const exercise of circuitExercises) {
        rounds.push({
          minuteIndex: minuteIndex++,
          exerciseName: exercise.name,
          targetMuscleGroup: exercise.muscleGroup,
          difficulty: exercise.difficulty,
          reps: Math.max(1, Math.round(exercise.reps[difficultyTag] * intensityMultiplier)),
          isHold: exercise.isHold || false,
          alternatesSides: exercise.alternatesSides || false,
        });
      }
    }

  const circuitMuscleLoad = calculateMuscleGroupLoad(rounds);
  const circuitPrimaryMuscles = derivePrimaryMuscleGroups(circuitMuscleLoad);

  // Calculate total duration (estimate: ~45s per exercise + rest between rounds)
  const baseRestBetweenRounds = difficultyTag === "beginner" ? 90 : difficultyTag === "intermediate" ? 60 : 45;
  const restBetweenRounds = Math.max(
    30,
    Math.round(
      baseRestBetweenRounds *
        clampNumber(1 + (personalization?.fatigueTrend ?? 0) * 0.3 - (personalization?.averageHitRate ?? 1 - 1) * 0.2, 0.75, 1.25),
    ),
  );
  const durationMinutes = Math.ceil(
    (exercisesPerRound * 0.75 * totalRounds * clampNumber(intensityMultiplier, 0.9, 1.2)) +
      ((totalRounds - 1) * restBetweenRounds / 60)
  );

  const focusLabel = intent?.focusToday ?? goalConfig?.label ?? goalFocus ?? "General Fitness";
  const adjustedDuration = Math.max(10, Math.round(durationMinutes * clampNumber(energyMultiplier, 0.85, 1.15)));

  const rationale = {
    framework: intent?.focusToday
      ? `${focusLabel} focus requested; Circuit chosen for controlled work/rest while honoring intent.`
      : `Selected Circuit to support ${goalConfig?.label ?? "balanced"} work with predictable rounds.`,
    intensity: `Difficulty ${difficultyTag} (skill score ${skillScore}); ${intent?.energyLevel ?? "moderate"} energy target scales to ${Math.round(intensityMultiplier * 100)}% effort and ${adjustedDuration} min total with rest tuning (${equipmentRichness} equipment).`,
    exerciseSelection: `Rounded toward ${describeExerciseBias(exerciseBias)} while rotating gear and spacing repeats for variety.`
  };

  return {
    framework: "Circuit",
    durationMinutes: adjustedDuration,
    difficultyTag,
    focusLabel,
    rounds,
    restSeconds: restBetweenRounds,
    totalRounds,
    primaryMuscleGroups: circuitPrimaryMuscles,
    muscleGroupLoad: circuitMuscleLoad,
    intent,
    rationale,
  };
}

export function updateSkillScore(
  currentScore: number,
  recentSessions: SessionPerformanceSummary[],
  windowSize = 6
): number {
  if (!recentSessions.length) return currentScore;

  const recent = recentSessions.slice(0, windowSize);

  const aggregate = recent.reduce(
    (acc, session) => {
      acc.hitRate += session.averageHitRate;
      acc.skipRate += session.skipRate;
      if (typeof session.averageRpe === "number") {
        acc.rpeSum += session.averageRpe;
        acc.rpeCount += 1;
      }

      for (const [movement, perf] of Object.entries(session.movementPerformance)) {
        const bucket = acc.movement[movement] ?? { hitRate: 0, skipRate: 0, count: 0 };
        bucket.hitRate += perf.hitRate;
        bucket.skipRate += perf.skipRate;
        bucket.count += 1;
        acc.movement[movement] = bucket;
      }

      return acc;
    },
    { hitRate: 0, skipRate: 0, rpeSum: 0, rpeCount: 0, movement: {} as Record<string, { hitRate: number; skipRate: number; count: number }> }
  );

  const averageHitRate = aggregate.hitRate / recent.length;
  const averageSkipRate = aggregate.skipRate / recent.length;
  const averageRpe = aggregate.rpeCount ? aggregate.rpeSum / aggregate.rpeCount : null;

  const movementAverageScore = Object.values(aggregate.movement).reduce((sum, bucket) => {
    const hitRate = bucket.hitRate / bucket.count;
    const skipRate = bucket.skipRate / bucket.count;
    return sum + (hitRate - 1) * 8 - skipRate * 10;
  }, 0);

  const movementScore = Object.keys(aggregate.movement).length
    ? movementAverageScore / Object.keys(aggregate.movement).length
    : 0;

  const baseScoreChange = (averageHitRate - 1) * 10 - averageSkipRate * 12 + movementScore * 0.5;

  const sustainedProgress =
    averageHitRate >= 1.03 && averageSkipRate <= 0.08 && (averageRpe ?? 3) <= 3.5;
  const sustainedStruggle =
    averageHitRate <= 0.95 || averageSkipRate >= 0.15 || (averageRpe ?? 3.5) >= 4.5;

  let adjustment = baseScoreChange;

  if (adjustment > 0) {
    adjustment *= sustainedProgress ? 1.2 : 0.6;
  } else if (adjustment < 0) {
    adjustment *= sustainedStruggle ? 1.3 : 0.7;
  }

  adjustment = clampNumber(adjustment, -12, 12);

  return clampNumber(currentScore + adjustment, 0, 100);
}
