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

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Profiles table (fitness preferences)
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  displayName: text("display_name"),
  fitnessLevel: text("fitness_level").notNull(), // "Beginner", "Intermediate", "Advanced", "Elite"
  equipment: jsonb("equipment").notNull().$type<EquipmentId[]>(), // Typed equipment IDs from centralized config
  goalFocus: text("goal_focus"), // DEPRECATED: Legacy field for backward compatibility ("cardio", "strength", "metcon")
  primaryGoal: text("primary_goal").$type<PrimaryGoalId>(), // New: Primary training goal
  secondaryGoals: jsonb("secondary_goals").$type<PrimaryGoalId[]>(), // New: Optional secondary goals
  goalWeights: jsonb("goal_weights").$type<Record<PrimaryGoalId, number>>(), // New: AI-facing goal weights
  skillScore: integer("skill_score").default(50).notNull(), // 0-100
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
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
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  framework: text("framework").default("EMOM").notNull().$type<WorkoutFramework>(),
  durationMinutes: integer("duration_minutes").notNull(),
  difficultyTag: text("difficulty_tag").notNull(), // "beginner", "intermediate", "advanced"
  focusLabel: text("focus_label").notNull(), // "cardio", "strength", "metcon"
  perceivedExertion: integer("perceived_exertion"), // 1-5 RPE
  notes: text("notes"),
  completed: boolean("completed").default(false).notNull(),
  prHighlights: jsonb("pr_highlights"),
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
  targetLoad: doublePrecision("target_load"),
  prAttempt: boolean("pr_attempt").default(false).notNull(),
  prModality: text("pr_modality"),
  actualReps: integer("actual_reps"),
  actualSeconds: integer("actual_seconds"),
  actualLoad: doublePrecision("actual_load"),
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

export type PerformanceModality = "reps" | "time" | "load";

// Exercise-level performance stats
export const exerciseStats = pgTable(
  "exercise_stats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
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

// Generated workout type (returned by AI workout generators)
export interface GeneratedWorkout {
  framework: WorkoutFramework;
  durationMinutes: number;
  difficultyTag: "beginner" | "intermediate" | "advanced";
  focusLabel: string;
  rounds: Array<{
    minuteIndex: number;
    exerciseName: string;
    targetMuscleGroup: string;
    difficulty: string;
    reps: number;
    isHold?: boolean;
    alternatesSides?: boolean;
    targetLoad?: number | null;
    prAttempt?: boolean;
    prModality?: PerformanceModality;
    actualReps?: number;
    actualSeconds?: number;
    actualLoad?: number | null;
    skipped?: boolean;
  }>;
  // Framework-specific metadata
  workSeconds?: number; // For Tabata: work duration per interval
  restSeconds?: number; // For Tabata/Circuit: rest duration
  sets?: number; // For Tabata: number of intervals per exercise
  totalRounds?: number; // For Circuit: number of complete rounds
  prPlan?: {
    ready: boolean;
    reason: string;
    attempts: Array<{
      minuteIndex: number;
      exerciseName: string;
      modality: PerformanceModality;
    }>;
  };
  intent?: SessionIntent;
  rationale?: {
    framework: string;
    intensity: string;
    exerciseSelection: string;
  };
}

export const personalRecords = pgTable(
  "personal_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    movement: text("movement").notNull(),
    modality: text("modality").notNull().$type<PerformanceModality>(),
    value: doublePrecision("value").notNull(),
    unit: text("unit").notNull(),
    sessionId: uuid("session_id").references(() => workoutSessions.id, { onDelete: 'cascade' }),
    roundId: uuid("round_id").references(() => workoutRounds.id, { onDelete: 'cascade' }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("personal_record_key").on(table.userId, table.movement, table.modality)]
);

export const performanceHistory = pgTable("performance_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionId: uuid("session_id").notNull().references(() => workoutSessions.id, { onDelete: 'cascade' }),
  roundId: uuid("round_id").references(() => workoutRounds.id, { onDelete: 'cascade' }),
  movement: text("movement").notNull(),
  modality: text("modality").notNull().$type<PerformanceModality>(),
  value: doublePrecision("value").notNull(),
  unit: text("unit").notNull(),
  prAttempt: boolean("pr_attempt").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PersonalRecord = typeof personalRecords.$inferSelect;
export type InsertPersonalRecord = typeof personalRecords.$inferInsert;
export type PerformanceHistoryEntry = typeof performanceHistory.$inferSelect;
export type InsertPerformanceHistoryEntry = typeof performanceHistory.$inferInsert;

export interface PrCelebration {
  movement: string;
  modality: PerformanceModality;
  value: number;
  unit: string;
  previousValue?: number | null;
  type: "new" | "near_miss";
}
