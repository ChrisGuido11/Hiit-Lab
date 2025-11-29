// EMOM Workout Generator - Rule-based AI

interface Exercise {
  name: string;
  muscleGroup: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  equipment: string[];
  reps: { beginner: number; intermediate: number; advanced: number };
}

/**
 * EXERCISE LIBRARY
 * =================
 * Comprehensive exercise database for EMOM workout generation.
 *
 * Equipment keys updated to match new equipment configuration:
 * - Old: "None (Bodyweight)", "Dumbbells", "Kettlebell", "Pull-up Bar", "Jump Rope", "Box"
 * - New: "bodyweight", "dumbbells", "kettlebells", "pull_up_bar", "jump_rope", "step_or_box"
 *
 * Added exercises for new equipment types:
 * - Resistance bands, barbell, bench, medicine ball
 * - Cardio machines: treadmill, bike, rower, elliptical
 * - Sliders, weight machines
 *
 * Total: 50+ exercises across 16 equipment categories
 */
const EXERCISES: Exercise[] = [
  // Bodyweight (9 exercises)
  { name: "Burpees", muscleGroup: "full-body", difficulty: "intermediate", equipment: ["bodyweight"], reps: { beginner: 8, intermediate: 12, advanced: 15 } },
  { name: "Air Squats", muscleGroup: "legs", difficulty: "beginner", equipment: ["bodyweight"], reps: { beginner: 15, intermediate: 25, advanced: 35 } },
  { name: "Push-ups", muscleGroup: "chest", difficulty: "beginner", equipment: ["bodyweight"], reps: { beginner: 10, intermediate: 20, advanced: 30 } },
  { name: "Mountain Climbers", muscleGroup: "core", difficulty: "intermediate", equipment: ["bodyweight"], reps: { beginner: 20, intermediate: 30, advanced: 40 } },
  { name: "Plank Hold", muscleGroup: "core", difficulty: "beginner", equipment: ["bodyweight"], reps: { beginner: 30, intermediate: 45, advanced: 60 } },
  { name: "Jumping Jacks", muscleGroup: "cardio", difficulty: "beginner", equipment: ["bodyweight"], reps: { beginner: 20, intermediate: 30, advanced: 40 } },
  { name: "Lunges", muscleGroup: "legs", difficulty: "beginner", equipment: ["bodyweight"], reps: { beginner: 10, intermediate: 16, advanced: 24 } },
  { name: "High Knees", muscleGroup: "cardio", difficulty: "beginner", equipment: ["bodyweight"], reps: { beginner: 20, intermediate: 30, advanced: 40 } },
  { name: "Squat Jumps", muscleGroup: "legs", difficulty: "intermediate", equipment: ["bodyweight"], reps: { beginner: 8, intermediate: 12, advanced: 16 } },

  // Dumbbells (6 exercises)
  { name: "Dumbbell Thrusters", muscleGroup: "full-body", difficulty: "advanced", equipment: ["dumbbells"], reps: { beginner: 8, intermediate: 12, advanced: 15 } },
  { name: "Dumbbell Goblet Squats", muscleGroup: "legs", difficulty: "intermediate", equipment: ["dumbbells"], reps: { beginner: 10, intermediate: 15, advanced: 20 } },
  { name: "Dumbbell Rows", muscleGroup: "back", difficulty: "intermediate", equipment: ["dumbbells"], reps: { beginner: 8, intermediate: 12, advanced: 16 } },
  { name: "Dumbbell Snatches", muscleGroup: "full-body", difficulty: "advanced", equipment: ["dumbbells"], reps: { beginner: 6, intermediate: 10, advanced: 14 } },
  { name: "Dumbbell Shoulder Press", muscleGroup: "shoulders", difficulty: "intermediate", equipment: ["dumbbells"], reps: { beginner: 8, intermediate: 12, advanced: 16 } },
  { name: "Dumbbell Lunges", muscleGroup: "legs", difficulty: "intermediate", equipment: ["dumbbells"], reps: { beginner: 8, intermediate: 12, advanced: 16 } },

  // Kettlebells (5 exercises)
  { name: "Kettlebell Swings", muscleGroup: "posterior-chain", difficulty: "intermediate", equipment: ["kettlebells"], reps: { beginner: 12, intermediate: 20, advanced: 30 } },
  { name: "Kettlebell Goblet Squats", muscleGroup: "legs", difficulty: "intermediate", equipment: ["kettlebells"], reps: { beginner: 10, intermediate: 15, advanced: 20 } },
  { name: "Kettlebell Clean & Press", muscleGroup: "full-body", difficulty: "advanced", equipment: ["kettlebells"], reps: { beginner: 6, intermediate: 10, advanced: 14 } },
  { name: "Kettlebell Turkish Get-ups", muscleGroup: "full-body", difficulty: "advanced", equipment: ["kettlebells"], reps: { beginner: 4, intermediate: 6, advanced: 10 } },
  { name: "Kettlebell Snatches", muscleGroup: "full-body", difficulty: "advanced", equipment: ["kettlebells"], reps: { beginner: 6, intermediate: 10, advanced: 14 } },

  // Resistance Bands (4 exercises)
  { name: "Band Pull-aparts", muscleGroup: "shoulders", difficulty: "beginner", equipment: ["resistance_bands"], reps: { beginner: 15, intermediate: 20, advanced: 25 } },
  { name: "Band Squats", muscleGroup: "legs", difficulty: "beginner", equipment: ["resistance_bands"], reps: { beginner: 15, intermediate: 20, advanced: 25 } },
  { name: "Band Rows", muscleGroup: "back", difficulty: "beginner", equipment: ["resistance_bands"], reps: { beginner: 12, intermediate: 15, advanced: 20 } },
  { name: "Band Chest Press", muscleGroup: "chest", difficulty: "intermediate", equipment: ["resistance_bands"], reps: { beginner: 10, intermediate: 15, advanced: 20 } },

  // Barbell (5 exercises)
  { name: "Barbell Thrusters", muscleGroup: "full-body", difficulty: "advanced", equipment: ["barbell"], reps: { beginner: 8, intermediate: 12, advanced: 15 } },
  { name: "Barbell Front Squats", muscleGroup: "legs", difficulty: "advanced", equipment: ["barbell"], reps: { beginner: 8, intermediate: 12, advanced: 15 } },
  { name: "Barbell Deadlifts", muscleGroup: "posterior-chain", difficulty: "intermediate", equipment: ["barbell"], reps: { beginner: 8, intermediate: 12, advanced: 15 } },
  { name: "Barbell Push Press", muscleGroup: "shoulders", difficulty: "intermediate", equipment: ["barbell"], reps: { beginner: 8, intermediate: 12, advanced: 15 } },
  { name: "Barbell Rows", muscleGroup: "back", difficulty: "intermediate", equipment: ["barbell"], reps: { beginner: 8, intermediate: 12, advanced: 15 } },

  // Pull-up Bar (4 exercises)
  { name: "Pull-ups", muscleGroup: "back", difficulty: "advanced", equipment: ["pull_up_bar"], reps: { beginner: 3, intermediate: 8, advanced: 12 } },
  { name: "Chin-ups", muscleGroup: "back", difficulty: "advanced", equipment: ["pull_up_bar"], reps: { beginner: 3, intermediate: 8, advanced: 12 } },
  { name: "Hanging Knee Raises", muscleGroup: "core", difficulty: "intermediate", equipment: ["pull_up_bar"], reps: { beginner: 8, intermediate: 12, advanced: 16 } },
  { name: "Toes to Bar", muscleGroup: "core", difficulty: "advanced", equipment: ["pull_up_bar"], reps: { beginner: 5, intermediate: 10, advanced: 15 } },

  // Bench (3 exercises)
  { name: "Bench Dips", muscleGroup: "triceps", difficulty: "beginner", equipment: ["bench"], reps: { beginner: 10, intermediate: 15, advanced: 20 } },
  { name: "Box Jumps (Bench)", muscleGroup: "legs", difficulty: "intermediate", equipment: ["bench"], reps: { beginner: 8, intermediate: 12, advanced: 16 } },
  { name: "Incline Push-ups", muscleGroup: "chest", difficulty: "beginner", equipment: ["bench"], reps: { beginner: 12, intermediate: 18, advanced: 25 } },

  // Medicine Ball (4 exercises)
  { name: "Med Ball Slams", muscleGroup: "full-body", difficulty: "intermediate", equipment: ["medicine_ball"], reps: { beginner: 10, intermediate: 15, advanced: 20 } },
  { name: "Med Ball Wall Balls", muscleGroup: "full-body", difficulty: "intermediate", equipment: ["medicine_ball"], reps: { beginner: 10, intermediate: 15, advanced: 20 } },
  { name: "Med Ball Russian Twists", muscleGroup: "core", difficulty: "intermediate", equipment: ["medicine_ball"], reps: { beginner: 20, intermediate: 30, advanced: 40 } },
  { name: "Med Ball Chest Pass", muscleGroup: "chest", difficulty: "beginner", equipment: ["medicine_ball"], reps: { beginner: 15, intermediate: 20, advanced: 25 } },

  // Jump Rope (2 exercises)
  { name: "Double Unders", muscleGroup: "cardio", difficulty: "advanced", equipment: ["jump_rope"], reps: { beginner: 20, intermediate: 40, advanced: 60 } },
  { name: "Single Unders", muscleGroup: "cardio", difficulty: "beginner", equipment: ["jump_rope"], reps: { beginner: 40, intermediate: 60, advanced: 80 } },

  // Treadmill (2 exercises)
  { name: "Treadmill Sprint Intervals", muscleGroup: "cardio", difficulty: "intermediate", equipment: ["treadmill"], reps: { beginner: 30, intermediate: 45, advanced: 60 } },
  { name: "Treadmill Incline Run", muscleGroup: "cardio", difficulty: "intermediate", equipment: ["treadmill"], reps: { beginner: 45, intermediate: 60, advanced: 75 } },

  // Stationary Bike (2 exercises)
  { name: "Bike Sprint Intervals", muscleGroup: "cardio", difficulty: "intermediate", equipment: ["stationary_bike"], reps: { beginner: 30, intermediate: 45, advanced: 60 } },
  { name: "Bike Hill Climbs", muscleGroup: "cardio", difficulty: "intermediate", equipment: ["stationary_bike"], reps: { beginner: 45, intermediate: 60, advanced: 75 } },

  // Rower (2 exercises)
  { name: "Rowing Sprint Intervals", muscleGroup: "cardio", difficulty: "intermediate", equipment: ["rower"], reps: { beginner: 30, intermediate: 45, advanced: 60 } },
  { name: "Rowing 500m", muscleGroup: "cardio", difficulty: "intermediate", equipment: ["rower"], reps: { beginner: 120, intermediate: 110, advanced: 100 } },

  // Elliptical (1 exercise)
  { name: "Elliptical Sprint Intervals", muscleGroup: "cardio", difficulty: "beginner", equipment: ["elliptical"], reps: { beginner: 30, intermediate: 45, advanced: 60 } },

  // Sliders (3 exercises)
  { name: "Slider Mountain Climbers", muscleGroup: "core", difficulty: "intermediate", equipment: ["sliders"], reps: { beginner: 20, intermediate: 30, advanced: 40 } },
  { name: "Slider Pike", muscleGroup: "core", difficulty: "advanced", equipment: ["sliders"], reps: { beginner: 8, intermediate: 12, advanced: 16 } },
  { name: "Slider Lunges", muscleGroup: "legs", difficulty: "intermediate", equipment: ["sliders"], reps: { beginner: 10, intermediate: 15, advanced: 20 } },

  // Step/Box (3 exercises)
  { name: "Box Jumps", muscleGroup: "legs", difficulty: "intermediate", equipment: ["step_or_box"], reps: { beginner: 8, intermediate: 12, advanced: 16 } },
  { name: "Box Step-ups", muscleGroup: "legs", difficulty: "beginner", equipment: ["step_or_box"], reps: { beginner: 10, intermediate: 16, advanced: 24 } },
  { name: "Lateral Box Step-overs", muscleGroup: "legs", difficulty: "intermediate", equipment: ["step_or_box"], reps: { beginner: 10, intermediate: 15, advanced: 20 } },

  // Weight Machines (3 exercises)
  { name: "Lat Pulldown", muscleGroup: "back", difficulty: "beginner", equipment: ["weight_machines"], reps: { beginner: 10, intermediate: 15, advanced: 20 } },
  { name: "Leg Press", muscleGroup: "legs", difficulty: "beginner", equipment: ["weight_machines"], reps: { beginner: 12, intermediate: 18, advanced: 25 } },
  { name: "Cable Chest Flyes", muscleGroup: "chest", difficulty: "intermediate", equipment: ["weight_machines"], reps: { beginner: 10, intermediate: 15, advanced: 20 } },
];

export interface GeneratedWorkout {
  durationMinutes: number;
  difficultyTag: "beginner" | "intermediate" | "advanced";
  focusLabel: string;
  rounds: Array<{
    minuteIndex: number;
    exerciseName: string;
    targetMuscleGroup: string;
    difficulty: string;
    reps: number;
  }>;
}

/**
 * BACKWARD COMPATIBILITY MAPPING
 * ================================
 * Maps old equipment values to new standardized keys.
 * Ensures existing user profiles continue to work after equipment list expansion.
 *
 * Old Format → New Format:
 * "None (Bodyweight)" → "bodyweight"
 * "Dumbbells" → "dumbbells"
 * "Kettlebell" → "kettlebells"
 * "Pull-up Bar" → "pull_up_bar"
 * "Jump Rope" → "jump_rope"
 * "Box" → "step_or_box"
 */
const EQUIPMENT_MIGRATION_MAP: Record<string, string> = {
  "None (Bodyweight)": "bodyweight",
  "Dumbbells": "dumbbells",
  "Kettlebell": "kettlebells",
  "Pull-up Bar": "pull_up_bar",
  "Jump Rope": "jump_rope",
  "Box": "step_or_box",
};

/**
 * Migrates equipment values from old format to new format.
 * Handles both old and new formats gracefully.
 *
 * @param equipment - Array of equipment values (old or new format)
 * @returns Array of equipment values in new standardized format
 */
function migrateEquipment(equipment: string[]): string[] {
  return equipment.map(item => EQUIPMENT_MIGRATION_MAP[item] || item);
}

export function generateEMOMWorkout(
  skillScore: number,
  fitnessLevel: string,
  equipment: string[],
  goalFocus: string
): GeneratedWorkout {
  // Migrate equipment values to new format for backward compatibility
  const migratedEquipment = migrateEquipment(equipment);
  // Determine difficulty tier
  let difficultyTag: "beginner" | "intermediate" | "advanced";
  if (skillScore <= 35) {
    difficultyTag = "beginner";
  } else if (skillScore <= 70) {
    difficultyTag = "intermediate";
  } else {
    difficultyTag = "advanced";
  }

  // Determine duration based on difficulty
  let durationMinutes: number;
  if (difficultyTag === "beginner") {
    durationMinutes = 8 + Math.floor(Math.random() * 5); // 8-12
  } else if (difficultyTag === "intermediate") {
    durationMinutes = 12 + Math.floor(Math.random() * 9); // 12-20
  } else {
    durationMinutes = 20 + Math.floor(Math.random() * 11); // 20-30
  }

  // Filter exercises by equipment and difficulty (using migrated equipment values)
  const availableExercises = EXERCISES.filter((ex) => {
    // Check if user has required equipment
    const hasEquipment = ex.equipment.some(eq => migratedEquipment.includes(eq));
    if (!hasEquipment) return false;

    // Filter by difficulty tier
    if (difficultyTag === "beginner" && ex.difficulty === "advanced") return false;
    if (difficultyTag === "beginner" && ex.difficulty === "intermediate" && Math.random() > 0.3) return false;

    return true;
  });

  // Generate rounds
  const rounds: GeneratedWorkout['rounds'] = [];
  const usedExercises = new Set<string>();

  for (let i = 0; i < durationMinutes; i++) {
    // Try to get variety - don't repeat same exercise consecutively
    const lastExercise = i > 0 ? rounds[i - 1].exerciseName : null;
    const candidates = availableExercises.filter(ex => ex.name !== lastExercise);
    
    const exercise = candidates[Math.floor(Math.random() * candidates.length)] || availableExercises[0];
    
    rounds.push({
      minuteIndex: i + 1,
      exerciseName: exercise.name,
      targetMuscleGroup: exercise.muscleGroup,
      difficulty: exercise.difficulty,
      reps: exercise.reps[difficultyTag],
    });
    
    usedExercises.add(exercise.name);
  }

  // Set focus label based on goal
  const focusLabel = goalFocus;

  return {
    durationMinutes,
    difficultyTag,
    focusLabel,
    rounds,
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
