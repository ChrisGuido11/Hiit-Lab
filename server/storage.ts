import {
  users,
  profiles,
  workoutSessions,
  workoutRounds,
  exerciseStats,
  type User,
  type UpsertUser,
  type Profile,
  type InsertProfile,
  type WorkoutSession,
  type InsertWorkoutSession,
  type WorkoutRound,
  type InsertWorkoutRound,
  type ExerciseStat,
  type InsertExerciseStat,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import type { EquipmentId } from "@shared/equipment";

type ProfileInsert = typeof profiles.$inferInsert;

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  deleteUser(id: string): Promise<void>;

  // Profile operations
  getProfile(userId: string): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(userId: string, updates: Partial<Omit<InsertProfile, 'userId'>>): Promise<Profile>;

  // Workout session operations
  createWorkoutSession(session: InsertWorkoutSession): Promise<WorkoutSession>;
  getWorkoutSessions(userId: string): Promise<(WorkoutSession & { rounds: WorkoutRound[] })[]>;
  updateWorkoutSession(sessionId: string, updates: Partial<InsertWorkoutSession>): Promise<WorkoutSession>;

  // Workout rounds operations
  createWorkoutRounds(rounds: InsertWorkoutRound[]): Promise<WorkoutRound[]>;

  // Exercise performance stats
  upsertExerciseStats(userId: string, stats: Array<Omit<InsertExerciseStat, "userId" | "id">>): Promise<ExerciseStat[]>;
  getExerciseStats(userId: string): Promise<ExerciseStat[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Profile operations
  async getProfile(userId: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    return profile;
  }

  async createProfile(profileData: InsertProfile): Promise<Profile> {
    const dbProfile: ProfileInsert = {
      ...profileData,
      equipment: profileData.equipment as EquipmentId[],
      primaryGoal: profileData.primaryGoal as ProfileInsert["primaryGoal"],
      secondaryGoals: profileData.secondaryGoals as ProfileInsert["secondaryGoals"],
      goalWeights: profileData.goalWeights as ProfileInsert["goalWeights"],
    };

    const [profile] = await db
      .insert(profiles)
      .values(dbProfile)
      .returning();
    return profile;
  }

  async updateProfile(userId: string, updates: Partial<Omit<InsertProfile, 'userId'>>): Promise<Profile> {
    const normalizedUpdates: Partial<ProfileInsert> = {
      ...updates,
      equipment: updates.equipment as EquipmentId[] | undefined,
      primaryGoal: updates.primaryGoal as ProfileInsert["primaryGoal"],
      secondaryGoals: updates.secondaryGoals as ProfileInsert["secondaryGoals"],
      goalWeights: updates.goalWeights as ProfileInsert["goalWeights"],
    };
    const [profile] = await db
      .update(profiles)
      .set(normalizedUpdates)
      .where(eq(profiles.userId, userId))
      .returning();
    return profile;
  }

  // Workout session operations
  async createWorkoutSession(sessionData: InsertWorkoutSession): Promise<WorkoutSession> {
    const [session] = await db.insert(workoutSessions).values(sessionData).returning();
    return session;
  }

  async getWorkoutSessions(userId: string): Promise<(WorkoutSession & { rounds: WorkoutRound[] })[]> {
      const sessions = await db
        .select()
        .from(workoutSessions)
        .where(eq(workoutSessions.userId, userId))
        .orderBy(desc(workoutSessions.createdAt));

      const sessionsWithRounds = await Promise.all(
        sessions.map(async (session) => {
          const rounds = await db
            .select()
            .from(workoutRounds)
            .where(eq(workoutRounds.sessionId, session.id))
            .orderBy(workoutRounds.minuteIndex);
          return { ...session, rounds };
        })
      );

    return sessionsWithRounds;
  }

  async updateWorkoutSession(sessionId: string, updates: Partial<InsertWorkoutSession>): Promise<WorkoutSession> {
    const [session] = await db
      .update(workoutSessions)
      .set(updates)
      .where(eq(workoutSessions.id, sessionId))
      .returning();
    return session;
  }

  // Workout rounds operations
  async createWorkoutRounds(roundsData: InsertWorkoutRound[]): Promise<WorkoutRound[]> {
    const rounds = await db.insert(workoutRounds).values(roundsData).returning();
    return rounds;
  }

  async upsertExerciseStats(
    userId: string,
    stats: Array<Omit<InsertExerciseStat, "userId" | "id">>,
  ): Promise<ExerciseStat[]> {
    if (!stats.length) return [];

    const rows = stats.map((stat) => ({
      ...stat,
      userId,
    }));

    const result = await db
      .insert(exerciseStats)
      .values(rows)
      .onConflictDoUpdate({
        target: [exerciseStats.userId, exerciseStats.exerciseName],
        set: {
          acceptCount: sql`${exerciseStats.acceptCount} + excluded.accept_count`,
          skipCount: sql`${exerciseStats.skipCount} + excluded.skip_count`,
          completionCount: sql`${exerciseStats.completionCount} + excluded.completion_count`,
          qualitySum: sql`${exerciseStats.qualitySum} + excluded.quality_sum`,
          lastPerformedAt: sql`greatest(${exerciseStats.lastPerformedAt}, excluded.last_performed_at)`,
        },
      })
      .returning();

    return result;
  }

  async getExerciseStats(userId: string): Promise<ExerciseStat[]> {
    return db.select().from(exerciseStats).where(eq(exerciseStats.userId, userId));
  }
}

export const storage = new DatabaseStorage();
