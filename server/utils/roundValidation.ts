import { insertWorkoutRoundSchema } from "@shared/schema";
import { z } from "zod";

export const workoutRoundPayloadSchema = insertWorkoutRoundSchema.omit({ sessionId: true });
export const workoutRoundsArraySchema = z.array(workoutRoundPayloadSchema);
