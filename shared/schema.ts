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
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  equipment: jsonb("equipment").notNull().$type<string[]>(), // ["Dumbbells", "Kettlebell", etc]
  goalFocus: text("goal_focus").notNull(), // "cardio", "strength", "metcon"
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

// Workout sessions table
export const workoutSessions = pgTable("workout_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  framework: text("framework").default("EMOM").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  difficultyTag: text("difficulty_tag").notNull(), // "beginner", "intermediate", "advanced"
  focusLabel: text("focus_label").notNull(), // "cardio", "strength", "metcon"
  perceivedExertion: integer("perceived_exertion"), // 1-5 RPE
  completed: boolean("completed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workoutSessionsRelations = relations(workoutSessions, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [workoutSessions.userId],
    references: [profiles.userId],
  }),
  rounds: many(workoutRounds),
}));

export const insertWorkoutSessionSchema = createInsertSchema(workoutSessions).omit({
  id: true,
  createdAt: true,
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
