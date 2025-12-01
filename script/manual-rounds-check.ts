import assert from "node:assert/strict";
import { workoutRoundsArraySchema } from "../server/utils/roundValidation";

const validRound = {
  minuteIndex: 0,
  exerciseName: "Air Squats",
  targetMuscleGroup: "legs",
  difficulty: "easy",
  reps: 15,
};

const validResult = workoutRoundsArraySchema.safeParse([validRound]);
assert.ok(validResult.success, "Expected valid rounds payload to pass validation");

const missingFieldResult = workoutRoundsArraySchema.safeParse([
  {
    ...validRound,
    exerciseName: undefined,
  },
]);
assert.ok(!missingFieldResult.success, "Expected missing fields to fail validation");

const typeMismatchResult = workoutRoundsArraySchema.safeParse([
  {
    ...validRound,
    reps: "10" as unknown as number,
  },
]);
assert.ok(!typeMismatchResult.success, "Expected incorrect types to fail validation");

assert.ok(!Array.isArray(undefined), "Rounds guard should reject non-array input");

console.log("Manual rounds validation checks passed.");
