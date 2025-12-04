import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated } from "./supabaseAuth";
import {
  generateEMOMWorkout,
  generateTabataWorkout,
  generateAMRAPWorkout,
  generateCircuitWorkout,
  updateSkillScore
} from "./utils/emomGenerator";
import { pickFrameworkForGoal } from "@shared/goals";
import {
  insertProfileSchema,
  type InsertProfile,
  insertWorkoutSessionSchema,
  workoutGenerationRequestSchema,
} from "@shared/schema";
import { z } from "zod";
import { workoutRoundsArraySchema } from "./utils/roundValidation";
import {
  aggregateExerciseOutcomes,
  buildPersonalizationInsights,
  categorizeTimeBlock,
  computeTimeBlockPerformance,
  summarizeSessionPerformance,
} from "./utils/personalization";
import { getRecoveryScores } from "./utils/recovery";
import { getWeekStart } from "./utils/periodization";
import { getFrameworkPreferences, selectFrameworkWithPreferences, updateFrameworkPreference } from "./utils/frameworkPreferences";
import { getStreakStatus, applyStreakAdjustments } from "./utils/streakAware";
import { updatePersonalRecords } from "./utils/personalRecords";
import { updateMasteryScores } from "./utils/mastery";
import { updateRecoveryAfterWorkout } from "./utils/recovery";
import { updateWeeklyVolume } from "./utils/periodization";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ==================== AUTH ROUTES ====================
  app.delete('/api/auth/deleteAccount', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      await storage.deleteUser(userId);
      res.json({ message: "Account deleted successfully" });
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // ==================== PROFILE ROUTES ====================
  app.get('/api/profile', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const profile = await storage.getProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      
      res.json(profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.post('/api/profile', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Validate request body
      const profileData = insertProfileSchema.parse({
        ...req.body,
        userId,
      });
      
      const profile = await storage.createProfile(profileData);
      res.status(201).json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid profile data", errors: error.errors });
      }
      console.error("Error creating profile:", error);
      res.status(500).json({ message: "Failed to create profile" });
    }
  });

  app.patch('/api/profile', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Validate partial update
      const updates = insertProfileSchema.partial().omit({ userId: true }).parse(req.body);
      
      const profile = await storage.updateProfile(userId, updates);
      res.json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid update data", errors: error.errors });
      }
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // ==================== WORKOUT GENERATOR ====================
  app.get('/api/workout/generate', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const profile = await storage.getProfile(userId);

      if (!profile) {
        return res.status(404).json({ message: "Profile not found. Please complete onboarding first." });
      }

      const history = await storage.getWorkoutSessions(userId);
      const exerciseStats = await storage.getExerciseStats(userId);
      
      // Fetch additional personalization data
      const recoveryRecords = await storage.getMuscleGroupRecovery(userId);
      const allMuscleGroups = new Set<string>();
      history.forEach(s => s.rounds.forEach(r => allMuscleGroups.add(r.targetMuscleGroup)));
      const recoveryScores = await getRecoveryScores(userId, Array.from(allMuscleGroups));
      
      const masteryRecords = await storage.getExerciseMastery(userId);
      const masteryScores = new Map<string, number>();
      masteryRecords.forEach(m => masteryScores.set(m.exerciseName, m.masteryScore));
      
      const weekStart = getWeekStart(new Date());
      const periodization = await storage.getWeeklyPeriodization(userId, weekStart);
      const weeklyVolume = periodization?.muscleGroupVolume ?? {};
      
      const personalization = buildPersonalizationInsights(
        history, 
        8, 
        exerciseStats,
        recoveryScores,
        masteryScores,
        weeklyVolume
      );

      const requestIntent = workoutGenerationRequestSchema.parse(req.query);

      // Check for framework override from query parameter
      const frameworkOverride = requestIntent.framework;

      const sessionIntent = {
        focusToday: requestIntent.focusToday,
        energyLevel: requestIntent.energyLevel,
        intentNote: requestIntent.intentNote,
      };

      const currentTimeBlock = categorizeTimeBlock(new Date());
      const recommendedTimeBlock =
        profile.optimalTimeBlock ?? personalization.timeBlockBias?.optimalTimeBlock ?? currentTimeBlock;
      const recommendedPerformance =
        recommendedTimeBlock && personalization.timeBlockBias?.performanceByBlock?.[recommendedTimeBlock];

      // Get framework preferences for selection
      const frameworkPrefs = await getFrameworkPreferences(userId);
      const goalFramework = pickFrameworkForGoal(profile.primaryGoal ?? null) as any;

      let selectedFramework: string;
      if (frameworkOverride && ['EMOM', 'Tabata', 'AMRAP', 'Circuit'].includes(frameworkOverride)) {
        // User explicitly chose a framework (from Workout Lab)
        selectedFramework = frameworkOverride.toLowerCase();
      } else {
        // Use framework preferences with goal-based fallback
        selectedFramework = selectFrameworkWithPreferences(goalFramework, frameworkPrefs, 0.15).toLowerCase();

        // Allow intent to gently steer the framework choice when no override is present
        if (sessionIntent.energyLevel === "low" && selectedFramework === "tabata") {
          selectedFramework = "circuit";
        }
        if (sessionIntent.focusToday?.toLowerCase().includes("mobility") && selectedFramework === "tabata") {
          selectedFramework = "circuit";
        }
      }

      // Get streak status for adjustments
      const streakStatus = getStreakStatus(history);

      // Generate workout using appropriate framework generator
      let workout;
      const commonParams = [
        profile.skillScore,
        profile.fitnessLevel,
        profile.equipment as string[],
        profile.goalFocus ?? null,
        profile.primaryGoal ?? null,
        profile.goalWeights ?? undefined,
        personalization,
        sessionIntent,
        history, // Pass history for progressive overload
      ] as const;

      switch (selectedFramework) {
        case 'tabata':
          workout = generateTabataWorkout(...commonParams);
          break;
        case 'amrap':
          workout = generateAMRAPWorkout(...commonParams);
          break;
        case 'circuit':
          workout = generateCircuitWorkout(...commonParams);
          break;
        case 'emom':
        default:
          workout = generateEMOMWorkout(...commonParams);
          break;
      }

      // Apply streak-aware adjustments
      workout = applyStreakAdjustments(workout, streakStatus);

      const frameworkReason = frameworkOverride
        ? `Framework pinned to ${frameworkOverride} from user selection.`
        : `AI selected ${selectedFramework.toUpperCase()} based on goals and intent.`;

      const timeBlockHint = recommendedPerformance?.sampleSize
        ? `Best results in the ${recommendedTimeBlock} block (${(recommendedPerformance.averageHitRate * 100).toFixed(0)}% hit-rate, Δ ${(recommendedPerformance.deltaHitRate * 100).toFixed(1)} vs avg over ${recommendedPerformance.sampleSize} sessions).`
        : `Biasing toward your ${recommendedTimeBlock} window for better adherence.`;

      workout.rationale = {
        framework: `${frameworkReason} ${workout.rationale?.framework ?? ""}`.trim(),
        intensity:
          workout.rationale?.intensity ??
          `Intensity calibrated to profile skill (${profile.skillScore}) and energy (${sessionIntent.energyLevel ?? "moderate"}).`,
        exerciseSelection:
          workout.rationale?.exerciseSelection ??
          `Exercises filtered for available equipment and tuned toward ${sessionIntent.focusToday ?? profile.goalFocus ?? "general"} focus.`,
        schedule:
          recommendedTimeBlock === currentTimeBlock
            ? `Sticking with your ${recommendedTimeBlock} groove where you perform best.`
            : `Plan this for the ${recommendedTimeBlock} window to match your best-performing block.`,
      };

      workout.recommendedTimeBlock = recommendedTimeBlock;
      workout.timeBlockHint = timeBlockHint;

      res.json(workout);
    } catch (error) {
      console.error("Error generating workout:", error);
      res.status(500).json({ message: "Failed to generate workout" });
    }
  });

  // ==================== WORKOUT SESSION ROUTES ====================
  app.post('/api/workout/session', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const timeBlock = categorizeTimeBlock(new Date());

      // Extract session data and rounds from request
      const { rounds, perceivedExertion, notes, ...sessionData } = req.body;

      if (!Array.isArray(rounds)) {
        return res
          .status(400)
          .json({ message: "Rounds are required and must be provided as an array" });
      }

      // Validate session data
      const validatedSession = insertWorkoutSessionSchema.parse({
        ...sessionData,
        userId,
        perceivedExertion,
        notes,
        completed: true,
        timeBlock,
      });

      const parsedRounds = workoutRoundsArraySchema.safeParse(rounds);

      if (!parsedRounds.success) {
        return res.status(400).json({ message: "Invalid rounds data", errors: parsedRounds.error.errors });
      }
      
      // Create workout session
      const session = await storage.createWorkoutSession(validatedSession);

      // Create workout rounds
      const roundsData = parsedRounds.data.map((round) => ({
        sessionId: session.id,
        minuteIndex: round.minuteIndex,
        exerciseName: round.exerciseName,
        targetMuscleGroup: round.targetMuscleGroup,
        difficulty: round.difficulty,
        reps: round.reps,
        isHold: Boolean(round.isHold),
        alternatesSides: Boolean(round.alternatesSides),
        actualReps: round.actualReps ?? null,
        actualSeconds: round.actualSeconds ?? null,
        skipped: Boolean(round.skipped),
      }));
      
      await storage.createWorkoutRounds(roundsData);

      // Update exercise-level stats for personalization
      const exerciseSummaries = aggregateExerciseOutcomes(
        roundsData as Array<
          Pick<
            (typeof roundsData)[number],
            "exerciseName" | "reps" | "actualReps" | "actualSeconds" | "skipped" | "isHold"
          >
        >,
      );
      await storage.upsertExerciseStats(userId, exerciseSummaries);
      
      const profile = await storage.getProfile(userId);
      const history = await storage.getWorkoutSessions(userId);
      const sessionWithRounds = { ...session, rounds: roundsData as any };

      // Update personal records
      await updatePersonalRecords(userId, session, roundsData as any);

      // Update mastery scores
      const exerciseStats = await storage.getExerciseStats(userId);
      await updateMasteryScores(userId, sessionWithRounds, history, exerciseStats);

      // Update recovery scores
      await updateRecoveryAfterWorkout(userId, session, roundsData as any);

      // Update weekly volume
      await updateWeeklyVolume(userId, session, roundsData as any);

      // Update framework preferences
      await updateFrameworkPreference(userId, sessionWithRounds, history);

      if (profile) {
        const profileUpdates: Partial<InsertProfile> = {};

        const { performanceByBlock, optimalTimeBlock } = computeTimeBlockPerformance(history);
        profileUpdates.timeBlockPerformance = performanceByBlock as InsertProfile["timeBlockPerformance"];
        profileUpdates.optimalTimeBlock = optimalTimeBlock as InsertProfile["optimalTimeBlock"];

        // Update skill score based on RPE
        if (perceivedExertion || roundsData.length) {
          const sessionPerformance = summarizeSessionPerformance(roundsData as any, perceivedExertion);
          const performanceHistory = history.map((previousSession) =>
            summarizeSessionPerformance(previousSession.rounds as any, previousSession.perceivedExertion)
          );
          if (performanceHistory.length) {
            performanceHistory[0] = sessionPerformance; // ensure freshest data for the newest session
          }
          const newSkillScore = updateSkillScore(profile.skillScore, performanceHistory);
          profileUpdates.skillScore = newSkillScore;
        }

        if (Object.keys(profileUpdates).length) {
          await storage.updateProfile(userId, profileUpdates);
        }
      }

      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid session data", errors: error.errors });
      }
      console.error("Error creating workout session:", error);
      res.status(500).json({ message: "Failed to create workout session" });
    }
  });

  // ==================== PERSONAL RECORDS ====================
  app.get('/api/personal-records', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const records = await storage.getPersonalRecords(userId);
      res.json(records);
    } catch (error) {
      console.error("Error fetching personal records:", error);
      res.status(500).json({ message: "Failed to fetch personal records" });
    }
  });

  // ==================== EXERCISE MASTERY ====================
  app.get('/api/mastery', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const mastery = await storage.getExerciseMastery(userId);
      res.json(mastery);
    } catch (error) {
      console.error("Error fetching mastery:", error);
      res.status(500).json({ message: "Failed to fetch mastery scores" });
    }
  });

  // ==================== RECOVERY STATUS ====================
  app.get('/api/recovery', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const recovery = await storage.getMuscleGroupRecovery(userId);
      // Recalculate recovery scores based on current time
      const { getRecoveryScores } = await import("./utils/recovery");
      const allMuscleGroups = recovery.map(r => r.muscleGroup);
      const scores = await getRecoveryScores(userId, allMuscleGroups);
      const recoveryMap = Object.fromEntries(scores);
      res.json(recoveryMap);
    } catch (error) {
      console.error("Error fetching recovery:", error);
      res.status(500).json({ message: "Failed to fetch recovery status" });
    }
  });

  // ==================== WEEKLY VOLUME ====================
  app.get('/api/weekly-volume', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { getWeekStart } = await import("./utils/periodization");
      const weekStart = getWeekStart(new Date());
      const periodization = await storage.getWeeklyPeriodization(userId, weekStart);
      res.json(periodization?.muscleGroupVolume ?? {});
    } catch (error) {
      console.error("Error fetching weekly volume:", error);
      res.status(500).json({ message: "Failed to fetch weekly volume" });
    }
  });

  app.get('/api/workout/history', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const sessions = await storage.getWorkoutSessions(userId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching workout history:", error);
      res.status(500).json({ message: "Failed to fetch workout history" });
    }
  });

  return httpServer;
}
