import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { generateEMOMWorkout, updateSkillScore } from "./utils/emomGenerator";
import { insertProfileSchema, insertWorkoutSessionSchema } from "@shared/schema";
import { z } from "zod";

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
      
      const workout = generateEMOMWorkout(
        profile.skillScore,
        profile.fitnessLevel,
        profile.equipment as string[],
        profile.goalFocus
      );
      
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
      
      // Validate session data
      const validatedSession = insertWorkoutSessionSchema.parse({
        ...sessionData,
        userId,
        perceivedExertion,
        completed: true,
      });
      
      // Create workout session
      const session = await storage.createWorkoutSession(validatedSession);
      
      // Create workout rounds
      const roundsData = rounds.map((round: any) => ({
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
