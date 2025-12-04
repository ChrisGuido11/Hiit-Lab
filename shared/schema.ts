// CHANGE SUMMARY (2025-11-29):
// - Imported EquipmentId type from centralized equipment config.
// - Profile equipment field now uses typed EquipmentId[] instead of string[].
// - Added PrimaryGoalId type and goal-related fields to profiles table.
// - Profiles now support primaryGoal, secondaryGoals, and goalWeights for AI personalization.
// - This ensures type safety across the entire equipment + goal personalization system.

import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  integer,
  uuid,
  boolean,
  text,
  doublePrecision,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import type { EquipmentId } from "./equipment";
import type { PrimaryGoalId } from "./goals";

export const timeBlocks = ["morning", "afternoon", "evening"] as const;
export type TimeBlock = typeof timeBlocks[number];
export type TimeBlockPerformance = {
  sampleSize: number;
  averageHitRate: number;
  skipRate: number;
  averageRpe: number | null;
  deltaHitRate: number;
};
export type TimeBlockPerformanceMap = Record<TimeBlock, TimeBlockPerformance>;

export const sessionIntentSchema = z.object({
  focusToday: z
    .string()
    .max(64, "Focus should be concise (64 characters max)")
    .optional(),
  energyLevel: z
    .enum(["low", "moderate", "high"], {
      required_error: "Energy level must be low, moderate, or high",
      invalid_type_error: "Energy level must be low, moderate, or high",
    })
    .optional(),
  intentNote: z.string().max(200).optional(),
});

export type SessionIntent = z.infer<typeof sessionIntentSchema>;

// Profiles table (fitness preferences)
// Note: userId references Supabase auth.users.id (UUID)
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique(), // References Supabase auth.users.id
  displayName: text("display_name"),
  fitnessLevel: text("fitness_level").notNull(), // "Beginner", "Intermediate", "Advanced", "Elite"
  equipment: jsonb("equipment").notNull().$type<EquipmentId[]>(), // Typed equipment IDs from centralized config
  goalFocus: text("goal_focus"), // DEPRECATED: Legacy field for backward compatibility ("cardio", "strength", "metcon")
  primaryGoal: text("primary_goal").$type<PrimaryGoalId>(), // New: Primary training goal
  secondaryGoals: jsonb("secondary_goals").$type<PrimaryGoalId[]>(), // New: Optional secondary goals
  goalWeights: jsonb("goal_weights").$type<Record<PrimaryGoalId, number>>(), // New: AI-facing goal weights
  skillScore: integer("skill_score").default(50).notNull(), // 0-100
  optimalTimeBlock: text("optimal_time_block").$type<TimeBlock>(),
  timeBlockPerformance: jsonb("time_block_performance").$type<TimeBlockPerformanceMap>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const profilesRelations = relations(profiles, ({ many }) => ({
  sessions: many(workoutSessions),
}));

export const insertProfileSchema = createInsertSchema(profiles).omit({
  id: true,
  createdAt: true,
});

export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;

// Workout framework type
export const workoutFrameworks = ["EMOM", "Tabata", "AMRAP", "Circuit"] as const;
export type WorkoutFramework = typeof workoutFrameworks[number];

export const workoutGenerationRequestSchema = sessionIntentSchema.extend({
  framework: z.enum(workoutFrameworks).optional(),
});

export type WorkoutGenerationRequest = z.infer<typeof workoutGenerationRequestSchema>;

// Workout sessions table
export const workoutSessions = pgTable("workout_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  framework: text("framework").default("EMOM").notNull().$type<WorkoutFramework>(),
  durationMinutes: integer("duration_minutes").notNull(),
  difficultyTag: text("difficulty_tag").notNull(), // "beginner", "intermediate", "advanced"
  focusLabel: text("focus_label").notNull(), // "cardio", "strength", "metcon"
  perceivedExertion: integer("perceived_exertion"), // 1-5 RPE
  notes: text("notes"),
  completed: boolean("completed").default(false).notNull(),
  timeBlock: text("time_block").notNull().default("morning").$type<TimeBlock>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workoutSessionsRelations = relations(workoutSessions, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [workoutSessions.userId],
    references: [profiles.userId],
  }),
  rounds: many(workoutRounds),
}));

export const insertWorkoutSessionSchema = createInsertSchema(workoutSessions)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    framework: z.enum(workoutFrameworks),
    timeBlock: z.enum(timeBlocks),
  });

export type InsertWorkoutSession = z.infer<typeof insertWorkoutSessionSchema>;
export type WorkoutSession = typeof workoutSessions.$inferSelect;

// Workout rounds table (individual EMOM rounds)
export const workoutRounds = pgTable("workout_rounds", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => workoutSessions.id, { onDelete: 'cascade' }),
  minuteIndex: integer("minute_index").notNull(),
  exerciseName: text("exercise_name").notNull(),
  targetMuscleGroup: text("target_muscle_group").notNull(),
  difficulty: text("difficulty").notNull(),
  reps: integer("reps").notNull(),
  isHold: boolean("is_hold").default(false).notNull(),
  alternatesSides: boolean("alternates_sides").default(false).notNull(),
  actualReps: integer("actual_reps"),
  actualSeconds: integer("actual_seconds"),
  skipped: boolean("skipped").default(false).notNull(),
});

export const workoutRoundsRelations = relations(workoutRounds, ({ one }) => ({
  session: one(workoutSessions, {
    fields: [workoutRounds.sessionId],
    references: [workoutSessions.id],
  }),
}));

export const insertWorkoutRoundSchema = createInsertSchema(workoutRounds).omit({
  id: true,
});

export type InsertWorkoutRound = z.infer<typeof insertWorkoutRoundSchema>;
export type WorkoutRound = typeof workoutRounds.$inferSelect;

// Exercise-level performance stats
export const exerciseStats = pgTable(
  "exercise_stats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    exerciseName: text("exercise_name").notNull(),
    acceptCount: integer("accept_count").default(0).notNull(),
    skipCount: integer("skip_count").default(0).notNull(),
    completionCount: integer("completion_count").default(0).notNull(),
    qualitySum: doublePrecision("quality_sum").default(0).notNull(),
    lastPerformedAt: timestamp("last_performed_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("exercise_stats_user_exercise_idx").on(table.userId, table.exerciseName)]
);

export type ExerciseStat = typeof exerciseStats.$inferSelect;
export type InsertExerciseStat = typeof exerciseStats.$inferInsert;

// Personal records table - Track best performance per exercise
export const personalRecords = pgTable(
  "personal_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    exerciseName: text("exercise_name").notNull(),
    bestReps: integer("best_reps"),
    bestSeconds: integer("best_seconds"),
    bestSessionId: uuid("best_session_id").references(() => workoutSessions.id, { onDelete: 'set null' }),
    achievedAt: timestamp("achieved_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("personal_records_user_exercise_idx").on(table.userId, table.exerciseName)]
);

export type PersonalRecord = typeof personalRecords.$inferSelect;
export type InsertPersonalRecord = typeof personalRecords.$inferInsert;

// Exercise mastery table - Track mastery scores per exercise
export const exerciseMastery = pgTable(
  "exercise_mastery",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    exerciseName: text("exercise_name").notNull(),
    masteryScore: doublePrecision("mastery_score").default(0).notNull(), // 0-100
    totalAttempts: integer("total_attempts").default(0).notNull(),
    successfulAttempts: integer("successful_attempts").default(0).notNull(),
    lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("exercise_mastery_user_exercise_idx").on(table.userId, table.exerciseName)]
);

export type ExerciseMastery = typeof exerciseMastery.$inferSelect;
export type InsertExerciseMastery = typeof exerciseMastery.$inferInsert;

// Muscle group recovery table - Track recovery state per muscle group
export const muscleGroupRecovery = pgTable(
  "muscle_group_recovery",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    muscleGroup: text("muscle_group").notNull(),
    recoveryScore: doublePrecision("recovery_score").default(1.0).notNull(), // 0-1, 1 = fully recovered
    lastWorkedAt: timestamp("last_worked_at").defaultNow().notNull(),
    workoutIntensity: doublePrecision("workout_intensity").default(1.0).notNull(), // 0-1
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("muscle_group_recovery_user_muscle_idx").on(table.userId, table.muscleGroup)]
);

export type MuscleGroupRecovery = typeof muscleGroupRecovery.$inferSelect;
export type InsertMuscleGroupRecovery = typeof muscleGroupRecovery.$inferInsert;

// Weekly periodization table - Track weekly muscle group volume
export const weeklyPeriodization = pgTable(
  "weekly_periodization",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    weekStart: timestamp("week_start").notNull(), // Start of week (Monday)
    muscleGroupVolume: jsonb("muscle_group_volume").notNull().$type<Record<string, { volume: number; sessions: number }>>(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("weekly_periodization_user_week_idx").on(table.userId, table.weekStart)]
);

export type WeeklyPeriodization = typeof weeklyPeriodization.$inferSelect;
export type InsertWeeklyPeriodization = typeof weeklyPeriodization.$inferInsert;

// Framework preferences table - Track user framework preferences
export const frameworkPreferences = pgTable(
  "framework_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    framework: text("framework").notNull().$type<WorkoutFramework>(),
    preferenceScore: doublePrecision("preference_score").default(0.5).notNull(), // 0-1
    completionRate: doublePrecision("completion_rate").default(1.0).notNull(), // 0-1
    averageRpe: doublePrecision("average_rpe"),
    lastUsedAt: timestamp("last_used_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("framework_preferences_user_framework_idx").on(table.userId, table.framework)]
);

export type FrameworkPreference = typeof frameworkPreferences.$inferSelect;
export type InsertFrameworkPreference = typeof frameworkPreferences.$inferInsert;

// Generated workout type (returned by AI workout generators)
export interface GeneratedWorkout {
  framework: WorkoutFramework;
  durationMinutes: number;
  difficultyTag: "beginner" | "intermediate" | "advanced";
  focusLabel: string;
  recommendedTimeBlock?: TimeBlock;
  timeBlockHint?: string;
  rounds: Array<{
    minuteIndex: number;
    exerciseName: string;
    targetMuscleGroup: string;
    difficulty: string;
    reps: number;
    isHold?: boolean;
    alternatesSides?: boolean;
    actualReps?: number;
    actualSeconds?: number;
    skipped?: boolean;
  }>;
  // Framework-specific metadata
  workSeconds?: number; // For Tabata: work duration per interval
  restSeconds?: number; // For Tabata/Circuit: rest duration
  sets?: number; // For Tabata: number of intervals per exercise
  totalRounds?: number; // For Circuit: number of complete rounds
  intent?: SessionIntent;
  rationale?: {
    framework: string;
    intensity: string;
    exerciseSelection: string;
    schedule?: string;
  };
}
