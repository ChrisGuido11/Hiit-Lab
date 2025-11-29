// EMOM Workout Generator - Rule-based AI

interface Exercise {
  name: string;
  muscleGroup: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  equipment: string[];
  reps: { beginner: number; intermediate: number; advanced: number };
}

// Exercise library
const EXERCISES: Exercise[] = [
  // Bodyweight
  { name: "Burpees", muscleGroup: "full-body", difficulty: "intermediate", equipment: ["None (Bodyweight)"], reps: { beginner: 8, intermediate: 12, advanced: 15 } },
  { name: "Air Squats", muscleGroup: "legs", difficulty: "beginner", equipment: ["None (Bodyweight)"], reps: { beginner: 15, intermediate: 25, advanced: 35 } },
  { name: "Push-ups", muscleGroup: "chest", difficulty: "beginner", equipment: ["None (Bodyweight)"], reps: { beginner: 10, intermediate: 20, advanced: 30 } },
  { name: "Mountain Climbers", muscleGroup: "core", difficulty: "intermediate", equipment: ["None (Bodyweight)"], reps: { beginner: 20, intermediate: 30, advanced: 40 } },
  { name: "Plank Hold", muscleGroup: "core", difficulty: "beginner", equipment: ["None (Bodyweight)"], reps: { beginner: 30, intermediate: 45, advanced: 60 } },
  { name: "Jumping Jacks", muscleGroup: "cardio", difficulty: "beginner", equipment: ["None (Bodyweight)"], reps: { beginner: 20, intermediate: 30, advanced: 40 } },
  { name: "Lunges", muscleGroup: "legs", difficulty: "beginner", equipment: ["None (Bodyweight)"], reps: { beginner: 10, intermediate: 16, advanced: 24 } },
  
  // Dumbbells
  { name: "Dumbbell Thrusters", muscleGroup: "full-body", difficulty: "advanced", equipment: ["Dumbbells"], reps: { beginner: 8, intermediate: 12, advanced: 15 } },
  { name: "Dumbbell Goblet Squats", muscleGroup: "legs", difficulty: "intermediate", equipment: ["Dumbbells"], reps: { beginner: 10, intermediate: 15, advanced: 20 } },
  { name: "Dumbbell Rows", muscleGroup: "back", difficulty: "intermediate", equipment: ["Dumbbells"], reps: { beginner: 8, intermediate: 12, advanced: 16 } },
  { name: "Dumbbell Snatches", muscleGroup: "full-body", difficulty: "advanced", equipment: ["Dumbbells"], reps: { beginner: 6, intermediate: 10, advanced: 14 } },
  
  // Kettlebell
  { name: "Kettlebell Swings", muscleGroup: "posterior-chain", difficulty: "intermediate", equipment: ["Kettlebell"], reps: { beginner: 12, intermediate: 20, advanced: 30 } },
  { name: "Kettlebell Goblet Squats", muscleGroup: "legs", difficulty: "intermediate", equipment: ["Kettlebell"], reps: { beginner: 10, intermediate: 15, advanced: 20 } },
  { name: "Kettlebell Clean & Press", muscleGroup: "full-body", difficulty: "advanced", equipment: ["Kettlebell"], reps: { beginner: 6, intermediate: 10, advanced: 14 } },
  
  // Pull-up Bar
  { name: "Pull-ups", muscleGroup: "back", difficulty: "advanced", equipment: ["Pull-up Bar"], reps: { beginner: 3, intermediate: 8, advanced: 12 } },
  { name: "Chin-ups", muscleGroup: "back", difficulty: "advanced", equipment: ["Pull-up Bar"], reps: { beginner: 3, intermediate: 8, advanced: 12 } },
  { name: "Hanging Knee Raises", muscleGroup: "core", difficulty: "intermediate", equipment: ["Pull-up Bar"], reps: { beginner: 8, intermediate: 12, advanced: 16 } },
  
  // Jump Rope
  { name: "Double Unders", muscleGroup: "cardio", difficulty: "advanced", equipment: ["Jump Rope"], reps: { beginner: 20, intermediate: 40, advanced: 60 } },
  { name: "Single Unders", muscleGroup: "cardio", difficulty: "beginner", equipment: ["Jump Rope"], reps: { beginner: 40, intermediate: 60, advanced: 80 } },
  
  // Box
  { name: "Box Jumps", muscleGroup: "legs", difficulty: "intermediate", equipment: ["Box"], reps: { beginner: 8, intermediate: 12, advanced: 16 } },
  { name: "Box Step-ups", muscleGroup: "legs", difficulty: "beginner", equipment: ["Box"], reps: { beginner: 10, intermediate: 16, advanced: 24 } },
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

export function generateEMOMWorkout(
  skillScore: number,
  fitnessLevel: string,
  equipment: string[],
  goalFocus: string
): GeneratedWorkout {
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

  // Filter exercises by equipment and difficulty
  const availableExercises = EXERCISES.filter((ex) => {
    // Check if user has required equipment
    const hasEquipment = ex.equipment.some(eq => equipment.includes(eq));
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
