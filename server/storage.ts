import {
  users,
  profiles,
  workoutSessions,
  workoutRounds,
  exerciseStats,
  personalRecords,
  exerciseMastery,
  muscleGroupRecovery,
  weeklyPeriodization,
  frameworkPreferences,
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
  type PersonalRecord,
  type InsertPersonalRecord,
  type ExerciseMastery,
  type InsertExerciseMastery,
  type MuscleGroupRecovery,
  type InsertMuscleGroupRecovery,
  type WeeklyPeriodization,
  type InsertWeeklyPeriodization,
  type FrameworkPreference,
  type InsertFrameworkPreference,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and } from "drizzle-orm";
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

  // Personal records
  getPersonalRecords(userId: string): Promise<PersonalRecord[]>;
  upsertPersonalRecord(userId: string, record: Omit<InsertPersonalRecord, "userId" | "id">): Promise<PersonalRecord>;

  // Exercise mastery
  getExerciseMastery(userId: string): Promise<ExerciseMastery[]>;
  upsertExerciseMastery(userId: string, mastery: Omit<InsertExerciseMastery, "userId" | "id">): Promise<ExerciseMastery>;

  // Muscle group recovery
  getMuscleGroupRecovery(userId: string): Promise<MuscleGroupRecovery[]>;
  upsertMuscleGroupRecovery(userId: string, recovery: Omit<InsertMuscleGroupRecovery, "userId" | "id">): Promise<MuscleGroupRecovery>;

  // Weekly periodization
  getWeeklyPeriodization(userId: string, weekStart?: Date): Promise<WeeklyPeriodization | undefined>;
  upsertWeeklyPeriodization(userId: string, periodization: Omit<InsertWeeklyPeriodization, "userId" | "id">): Promise<WeeklyPeriodization>;

  // Framework preferences
  getFrameworkPreferences(userId: string): Promise<FrameworkPreference[]>;
  upsertFrameworkPreference(userId: string, preference: Omit<InsertFrameworkPreference, "userId" | "id">): Promise<FrameworkPreference>;
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
      optimalTimeBlock: profileData.optimalTimeBlock as ProfileInsert["optimalTimeBlock"],
      timeBlockPerformance: profileData.timeBlockPerformance as ProfileInsert["timeBlockPerformance"],
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
      optimalTimeBlock: updates.optimalTimeBlock as ProfileInsert["optimalTimeBlock"],
      timeBlockPerformance: updates.timeBlockPerformance as ProfileInsert["timeBlockPerformance"],
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

  // Personal records operations
  async getPersonalRecords(userId: string): Promise<PersonalRecord[]> {
    return db.select().from(personalRecords).where(eq(personalRecords.userId, userId));
  }

  async upsertPersonalRecord(userId: string, record: Omit<InsertPersonalRecord, "userId" | "id">): Promise<PersonalRecord> {
    // Check if record exists
    const existing = await db
      .select()
      .from(personalRecords)
      .where(eq(personalRecords.userId, userId))
      .where(eq(personalRecords.exerciseName, record.exerciseName))
      .limit(1);

    if (existing.length > 0) {
      const existingRecord = existing[0];
      let shouldUpdate = false;
      const updates: Partial<InsertPersonalRecord> = {};

      // Check if new record is better
      if (record.bestReps !== null && (existingRecord.bestReps === null || record.bestReps > existingRecord.bestReps)) {
        updates.bestReps = record.bestReps;
        updates.bestSessionId = record.bestSessionId;
        updates.achievedAt = record.achievedAt;
        shouldUpdate = true;
      }
      if (record.bestSeconds !== null && (existingRecord.bestSeconds === null || record.bestSeconds > existingRecord.bestSeconds)) {
        updates.bestSeconds = record.bestSeconds;
        updates.bestSessionId = record.bestSessionId;
        updates.achievedAt = record.achievedAt;
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        const [updated] = await db
          .update(personalRecords)
          .set(updates)
          .where(eq(personalRecords.id, existingRecord.id))
          .returning();
        return updated;
      }
      return existingRecord;
    } else {
      // Insert new record
      const [newRecord] = await db
        .insert(personalRecords)
        .values({ ...record, userId })
        .returning();
      return newRecord;
    }
  }

  // Exercise mastery operations
  async getExerciseMastery(userId: string): Promise<ExerciseMastery[]> {
    return db.select().from(exerciseMastery).where(eq(exerciseMastery.userId, userId));
  }

  async upsertExerciseMastery(userId: string, mastery: Omit<InsertExerciseMastery, "userId" | "id">): Promise<ExerciseMastery> {
    const [em] = await db
      .insert(exerciseMastery)
      .values({ ...mastery, userId })
      .onConflictDoUpdate({
        target: [exerciseMastery.userId, exerciseMastery.exerciseName],
        set: {
          masteryScore: mastery.masteryScore,
          totalAttempts: mastery.totalAttempts,
          successfulAttempts: mastery.successfulAttempts,
          lastUpdated: sql`now()`,
        },
      })
      .returning();
    return em;
  }

  // Muscle group recovery operations
  async getMuscleGroupRecovery(userId: string): Promise<MuscleGroupRecovery[]> {
    return db.select().from(muscleGroupRecovery).where(eq(muscleGroupRecovery.userId, userId));
  }

  async upsertMuscleGroupRecovery(userId: string, recovery: Omit<InsertMuscleGroupRecovery, "userId" | "id">): Promise<MuscleGroupRecovery> {
    const [mgr] = await db
      .insert(muscleGroupRecovery)
      .values({ ...recovery, userId })
      .onConflictDoUpdate({
        target: [muscleGroupRecovery.userId, muscleGroupRecovery.muscleGroup],
        set: {
          recoveryScore: recovery.recoveryScore,
          lastWorkedAt: recovery.lastWorkedAt,
          workoutIntensity: recovery.workoutIntensity,
          updatedAt: sql`now()`,
        },
      })
      .returning();
    return mgr;
  }

  // Weekly periodization operations
  async getWeeklyPeriodization(userId: string, weekStart?: Date): Promise<WeeklyPeriodization | undefined> {
    if (weekStart) {
      const [wp] = await db
        .select()
        .from(weeklyPeriodization)
        .where(and(
          eq(weeklyPeriodization.userId, userId),
          eq(weeklyPeriodization.weekStart, weekStart)
        ));
      return wp;
    }
    // Get most recent week
    const [wp] = await db
      .select()
      .from(weeklyPeriodization)
      .where(eq(weeklyPeriodization.userId, userId))
      .orderBy(desc(weeklyPeriodization.weekStart))
      .limit(1);
    return wp;
  }

  async upsertWeeklyPeriodization(userId: string, periodization: Omit<InsertWeeklyPeriodization, "userId" | "id">): Promise<WeeklyPeriodization> {
    const [wp] = await db
      .insert(weeklyPeriodization)
      .values({ ...periodization, userId })
      .onConflictDoUpdate({
        target: [weeklyPeriodization.userId, weeklyPeriodization.weekStart],
        set: {
          muscleGroupVolume: periodization.muscleGroupVolume,
          updatedAt: sql`now()`,
        },
      })
      .returning();
    return wp;
  }

  // Framework preferences operations
  async getFrameworkPreferences(userId: string): Promise<FrameworkPreference[]> {
    return db.select().from(frameworkPreferences).where(eq(frameworkPreferences.userId, userId));
  }

  async upsertFrameworkPreference(userId: string, preference: Omit<InsertFrameworkPreference, "userId" | "id">): Promise<FrameworkPreference> {
    const [fp] = await db
      .insert(frameworkPreferences)
      .values({ ...preference, userId })
      .onConflictDoUpdate({
        target: [frameworkPreferences.userId, frameworkPreferences.framework],
        set: {
          preferenceScore: preference.preferenceScore,
          completionRate: preference.completionRate,
          averageRpe: preference.averageRpe,
          lastUsedAt: preference.lastUsedAt,
          updatedAt: sql`now()`,
        },
      })
      .returning();
    return fp;
  }
}

export const storage = new DatabaseStorage();
