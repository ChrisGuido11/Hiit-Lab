import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  generateEMOMWorkout,
  generateTabataWorkout,
  generateAMRAPWorkout,
  generateCircuitWorkout,
  updateSkillScore
} from "./utils/emomGenerator";
import { pickFrameworkForGoal } from "@shared/goals";
import { insertProfileSchema, insertWorkoutSessionSchema } from "@shared/schema";
import { z } from "zod";
import { workoutRoundsArraySchema } from "./utils/roundValidation";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // ==================== AUTH ROUTES ====================
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.delete('/api/auth/deleteAccount', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteUser(userId);
      req.logout(() => {
        res.json({ message: "Account deleted successfully" });
      });
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // ==================== PROFILE ROUTES ====================
  app.get('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.post('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
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

  app.patch('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
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
  app.get('/api/workout/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);

      if (!profile) {
        return res.status(404).json({ message: "Profile not found. Please complete onboarding first." });
      }

      // Check for framework override from query parameter
      const frameworkOverride = req.query.framework as string | undefined;

      let selectedFramework: string;
      if (frameworkOverride && ['EMOM', 'Tabata', 'AMRAP', 'Circuit'].includes(frameworkOverride)) {
        // User explicitly chose a framework (from Workout Lab)
        selectedFramework = frameworkOverride.toLowerCase();
      } else {
        // Use AI goal-based selection (Daily WOD)
        selectedFramework = pickFrameworkForGoal(profile.primaryGoal ?? null);
      }

      // Generate workout using appropriate framework generator
      let workout;
      const commonParams = [
        profile.skillScore,
        profile.fitnessLevel,
        profile.equipment as string[],
        profile.goalFocus ?? null,
        profile.primaryGoal ?? null,
        profile.goalWeights ?? undefined
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

      res.json(workout);
    } catch (error) {
      console.error("Error generating workout:", error);
      res.status(500).json({ message: "Failed to generate workout" });
    }
  });

  // ==================== WORKOUT SESSION ROUTES ====================
  app.post('/api/workout/session', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Extract session data and rounds from request
      const { rounds, perceivedExertion, ...sessionData } = req.body;

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
        completed: true,
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
      }));
      
      await storage.createWorkoutRounds(roundsData);
      
      // Update skill score based on RPE
      if (perceivedExertion) {
        const profile = await storage.getProfile(userId);
        if (profile) {
          const newSkillScore = updateSkillScore(profile.skillScore, perceivedExertion);
          await storage.updateProfile(userId, { skillScore: newSkillScore });
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

  app.get('/api/workout/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sessions = await storage.getWorkoutSessions(userId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching workout history:", error);
      res.status(500).json({ message: "Failed to fetch workout history" });
    }
  });

  return httpServer;
}
