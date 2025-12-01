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
import type { GeneratedWorkout } from "@shared/schema";

interface Exercise {
  name: string;
  muscleGroup: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  equipment: EquipmentId[]; // Typed equipment requirements
  reps: { beginner: number; intermediate: number; advanced: number };
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
  { name: "Plank Hold", muscleGroup: "core", difficulty: "beginner", equipment: ["bodyweight"], reps: { beginner: 30, intermediate: 45, advanced: 60 }, categories: { compound: false, cardio: false, plyometric: false, mobility: true } },
  { name: "Jumping Jacks", muscleGroup: "cardio", difficulty: "beginner", equipment: ["bodyweight"], reps: { beginner: 20, intermediate: 30, advanced: 40 }, categories: { compound: false, cardio: true, plyometric: true, mobility: false } },
  { name: "Lunges", muscleGroup: "legs", difficulty: "beginner", equipment: ["bodyweight"], reps: { beginner: 10, intermediate: 16, advanced: 24 }, categories: { compound: true, cardio: false, plyometric: false, mobility: false } },
  { name: "High Knees", muscleGroup: "cardio", difficulty: "beginner", equipment: ["bodyweight"], reps: { beginner: 20, intermediate: 30, advanced: 40 }, categories: { compound: false, cardio: true, plyometric: true, mobility: false } },
  { name: "Squat Jumps", muscleGroup: "legs", difficulty: "intermediate", equipment: ["bodyweight"], reps: { beginner: 8, intermediate: 12, advanced: 16 }, categories: { compound: true, cardio: false, plyometric: true, mobility: false } },

  // Dumbbells (6 exercises)
  { name: "Dumbbell Thrusters", muscleGroup: "full-body", difficulty: "advanced", equipment: ["dumbbells"], reps: { beginner: 8, intermediate: 12, advanced: 15 }, categories: { compound: true, cardio: false, plyometric: false, mobility: false } },
  { name: "Dumbbell Goblet Squats", muscleGroup: "legs", difficulty: "intermediate", equipment: ["dumbbells"], reps: { beginner: 10, intermediate: 15, advanced: 20 }, categories: { compound: true, cardio: false, plyometric: false, mobility: false } },
  { name: "Dumbbell Rows", muscleGroup: "back", difficulty: "intermediate", equipment: ["dumbbells"], reps: { beginner: 8, intermediate: 12, advanced: 16 }, categories: { compound: true, cardio: false, plyometric: false, mobility: false } },
  { name: "Dumbbell Snatches", muscleGroup: "full-body", difficulty: "advanced", equipment: ["dumbbells"], reps: { beginner: 6, intermediate: 10, advanced: 14 }, categories: { compound: true, cardio: false, plyometric: true, mobility: false } },
  { name: "Dumbbell Shoulder Press", muscleGroup: "shoulders", difficulty: "intermediate", equipment: ["dumbbells"], reps: { beginner: 8, intermediate: 12, advanced: 16 }, categories: { compound: false, cardio: false, plyometric: false, mobility: false } },
  { name: "Dumbbell Lunges", muscleGroup: "legs", difficulty: "intermediate", equipment: ["dumbbells"], reps: { beginner: 8, intermediate: 12, advanced: 16 }, categories: { compound: true, cardio: false, plyometric: false, mobility: false } },

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
  { name: "Treadmill Sprint Intervals", muscleGroup: "cardio", difficulty: "intermediate", equipment: ["treadmill"], reps: { beginner: 30, intermediate: 45, advanced: 60 }, categories: { compound: false, cardio: true, plyometric: false, mobility: false } },
  { name: "Treadmill Incline Run", muscleGroup: "cardio", difficulty: "intermediate", equipment: ["treadmill"], reps: { beginner: 45, intermediate: 60, advanced: 75 }, categories: { compound: false, cardio: true, plyometric: false, mobility: false } },

  // Bike (2 exercises)
  { name: "Bike Sprint Intervals", muscleGroup: "cardio", difficulty: "intermediate", equipment: ["bike"], reps: { beginner: 30, intermediate: 45, advanced: 60 }, categories: { compound: false, cardio: true, plyometric: false, mobility: false } },
  { name: "Bike Hill Climbs", muscleGroup: "cardio", difficulty: "intermediate", equipment: ["bike"], reps: { beginner: 45, intermediate: 60, advanced: 75 }, categories: { compound: false, cardio: true, plyometric: false, mobility: false } },

  // Rower (2 exercises)
  { name: "Rowing Sprint Intervals", muscleGroup: "cardio", difficulty: "intermediate", equipment: ["rower"], reps: { beginner: 30, intermediate: 45, advanced: 60 }, categories: { compound: false, cardio: true, plyometric: false, mobility: false } },
  { name: "Rowing 500m", muscleGroup: "cardio", difficulty: "intermediate", equipment: ["rower"], reps: { beginner: 120, intermediate: 110, advanced: 100 }, categories: { compound: false, cardio: true, plyometric: false, mobility: false } },

  // Elliptical (1 exercise)
  { name: "Elliptical Sprint Intervals", muscleGroup: "cardio", difficulty: "beginner", equipment: ["elliptical"], reps: { beginner: 30, intermediate: 45, advanced: 60 }, categories: { compound: false, cardio: true, plyometric: false, mobility: false } },

  // Sliders (3 exercises)
  { name: "Slider Mountain Climbers", muscleGroup: "core", difficulty: "intermediate", equipment: ["sliders"], reps: { beginner: 20, intermediate: 30, advanced: 40 }, categories: { compound: false, cardio: true, plyometric: false, mobility: false } },
  { name: "Slider Pike", muscleGroup: "core", difficulty: "advanced", equipment: ["sliders"], reps: { beginner: 8, intermediate: 12, advanced: 16 }, categories: { compound: false, cardio: false, plyometric: false, mobility: false } },
  { name: "Slider Lunges", muscleGroup: "legs", difficulty: "intermediate", equipment: ["sliders"], reps: { beginner: 10, intermediate: 15, advanced: 20 }, categories: { compound: true, cardio: false, plyometric: false, mobility: false } },

  // Step/Box (3 exercises)
  { name: "Box Jumps", muscleGroup: "legs", difficulty: "intermediate", equipment: ["step_box"], reps: { beginner: 8, intermediate: 12, advanced: 16 }, categories: { compound: false, cardio: false, plyometric: true, mobility: false } },
  { name: "Box Step-ups", muscleGroup: "legs", difficulty: "beginner", equipment: ["step_box"], reps: { beginner: 10, intermediate: 16, advanced: 24 }, categories: { compound: true, cardio: false, plyometric: false, mobility: false } },
  { name: "Lateral Box Step-overs", muscleGroup: "legs", difficulty: "intermediate", equipment: ["step_box"], reps: { beginner: 10, intermediate: 15, advanced: 20 }, categories: { compound: false, cardio: true, plyometric: false, mobility: false } },

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

export function generateEMOMWorkout(
  skillScore: number,
  fitnessLevel: string,
  equipment: string[],
  goalFocus: string | null,
  primaryGoal?: PrimaryGoalId | null,
  goalWeights?: Record<PrimaryGoalId, number>
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

    // Get exercise bias from goal weights (or use primary goal config)
    const rawExerciseBias = goalWeights && resolvedPrimaryGoal
      ? getCombinedExerciseBias(goalWeights)
      : goalConfig?.exerciseBias ?? { compound: 0.5, cardio: 0.5, plyometric: 0.5, mobility: 0.2 };
    const exerciseBias = normalizeExerciseBias(rawExerciseBias);

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

  // Generate rounds with goal-biased exercise selection and variety tracking
  const rounds: GeneratedWorkout['rounds'] = [];
  const usedExercises = new Map<string, number>(); // Track usage count

  for (let i = 0; i < durationMinutes; i++) {
    // Try to get variety - don't repeat same exercise consecutively
    const lastExercise = i > 0 ? rounds[i - 1].exerciseName : null;
    
    // Filter: prioritize exercises that haven't been used yet, then avoid consecutive repeats
    let candidates = availableExercises.filter(ex => {
      if (ex.name === lastExercise) return false; // Never repeat consecutively
      return true;
    });

    // Prefer exercises that haven't been used, or have been used less
    const unusedExercises = candidates.filter(ex => !usedExercises.has(ex.name));
    const priorityCandidates = unusedExercises.length > 0 ? unusedExercises : candidates;

    // Use weighted random selection based on goal bias
    const exercise = weightedRandomSelection(
      priorityCandidates.length > 0 ? priorityCandidates : candidates,
      (ex) => {
        let baseScore = calculateExerciseFitnessScore(ex, exerciseBias);
        
        // Bonus for exercises not yet used (encourages variety)
        if (!usedExercises.has(ex.name)) {
          baseScore *= 2; // Double the weight for unused exercises
        } else {
          // Penalize exercises based on how many times they've been used
          const usageCount = usedExercises.get(ex.name) || 0;
          baseScore = baseScore / (1 + usageCount * 0.5);
        }
        
        return baseScore;
      }
    );

    rounds.push({
      minuteIndex: i + 1,
      exerciseName: exercise.name,
      targetMuscleGroup: exercise.muscleGroup,
      difficulty: exercise.difficulty,
      reps: exercise.reps[difficultyTag],
    });

    // Update usage count
    const currentCount = usedExercises.get(exercise.name) || 0;
    usedExercises.set(exercise.name, currentCount + 1);
  }

  // Set focus label based on goal (use new goal label or fallback to legacy goalFocus)
  const focusLabel = goalConfig?.label ?? goalFocus ?? "General Fitness";

  return {
    framework: "EMOM",
    durationMinutes,
    difficultyTag,
    focusLabel,
    rounds,
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
  goalWeights?: Record<PrimaryGoalId, number>
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

  const durationMinutes = numExercises * 4; // 4 minutes per exercise

    // Get exercise bias from goal weights
    const rawExerciseBias = goalWeights && resolvedPrimaryGoal
      ? getCombinedExerciseBias(goalWeights)
      : goalConfig?.exerciseBias ?? { compound: 0.5, cardio: 0.7, plyometric: 0.7, mobility: 0.1 };
    const exerciseBias = normalizeExerciseBias(rawExerciseBias);

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
    const candidates = availableExercises.filter(ex => !selectedExercises.includes(ex));
    const exercise = weightedRandomSelection(
      candidates.length > 0 ? candidates : availableExercises,
      (ex) => {
        let baseScore = calculateExerciseFitnessScore(ex, exerciseBias);
        // Boost unused exercises to encourage variety
        if (!exerciseUsageCount.has(ex.name)) {
          baseScore *= 1.5;
        }
        return baseScore;
      }
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
        reps: Math.ceil(exercise.reps[difficultyTag] * 0.4), // Suggested reps per work interval
      });
    }
  }

  const focusLabel = goalConfig?.label ?? goalFocus ?? "General Fitness";

  return {
    framework: "Tabata",
    durationMinutes,
    difficultyTag,
    focusLabel,
    rounds,
    workSeconds: 20,
    restSeconds: 10,
    sets: 8,
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
  goalWeights?: Record<PrimaryGoalId, number>
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

  // AMRAP: 10-20 minutes typical duration
  let durationMinutes: number;
  if (difficultyTag === "beginner") {
    durationMinutes = 10 + Math.floor(Math.random() * 3); // 10-12 minutes
  } else if (difficultyTag === "intermediate") {
    durationMinutes = 12 + Math.floor(Math.random() * 5); // 12-16 minutes
  } else {
    durationMinutes = 15 + Math.floor(Math.random() * 6); // 15-20 minutes
  }

    // Get exercise bias from goal weights
    const rawExerciseBias = goalWeights && resolvedPrimaryGoal
      ? getCombinedExerciseBias(goalWeights)
      : goalConfig?.exerciseBias ?? { compound: 0.6, cardio: 0.6, plyometric: 0.5, mobility: 0.2 };
    const exerciseBias = normalizeExerciseBias(rawExerciseBias);

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
    const candidates = availableExercises.filter(ex => !circuitExercises.includes(ex));
    const exercise = weightedRandomSelection(
      candidates.length > 0 ? candidates : availableExercises,
      (ex) => {
        let baseScore = calculateExerciseFitnessScore(ex, exerciseBias);
        // Boost unused exercises to encourage variety
        if (!exerciseUsageCount.has(ex.name)) {
          baseScore *= 1.5;
        }
        return baseScore;
      }
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
      reps: exercise.reps[difficultyTag],
    });
  }

  const focusLabel = goalConfig?.label ?? goalFocus ?? "General Fitness";

  return {
    framework: "AMRAP",
    durationMinutes,
    difficultyTag,
    focusLabel,
    rounds,
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
  goalWeights?: Record<PrimaryGoalId, number>
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
    const exerciseBias = normalizeExerciseBias(rawExerciseBias);

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
    const candidates = availableExercises.filter(ex => !circuitExercises.includes(ex));
    const exercise = weightedRandomSelection(
      candidates.length > 0 ? candidates : availableExercises,
      (ex) => {
        let baseScore = calculateExerciseFitnessScore(ex, exerciseBias);
        // Boost unused exercises to encourage variety
        if (!exerciseUsageCount.has(ex.name)) {
          baseScore *= 1.5;
        }
        return baseScore;
      }
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
        reps: exercise.reps[difficultyTag],
      });
    }
  }

  // Calculate total duration (estimate: ~45s per exercise + rest between rounds)
  const restBetweenRounds = difficultyTag === "beginner" ? 90 : difficultyTag === "intermediate" ? 60 : 45;
  const durationMinutes = Math.ceil(
    (exercisesPerRound * 0.75 * totalRounds) + ((totalRounds - 1) * restBetweenRounds / 60)
  );

  const focusLabel = goalConfig?.label ?? goalFocus ?? "General Fitness";

  return {
    framework: "Circuit",
    durationMinutes,
    difficultyTag,
    focusLabel,
    rounds,
    restSeconds: restBetweenRounds,
    totalRounds,
  };
}

export function updateSkillScore(currentScore: number, rpe: number): number {
  let newScore = currentScore;
  
  if (rpe <= 2) {
    newScore += 3; // Too easy
  } else if (rpe === 3) {
    newScore += 1; // Just right
  } else {
    newScore -= 3; // Too hard
  }
  
  // Clamp between 0-100
  return Math.max(0, Math.min(100, newScore));
}
