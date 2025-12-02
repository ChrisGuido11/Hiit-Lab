import type { WorkoutSession, WorkoutRound, PersonalRecord } from "@shared/schema";
import { storage } from "../storage";

export interface NewPersonalRecord {
  exerciseName: string;
  bestReps: number | null;
  bestSeconds: number | null;
  sessionId: string;
}

/**
 * Detect if any rounds in the session set new personal records
 */
export function detectPersonalRecords(
  session: WorkoutSession,
  rounds: WorkoutRound[],
  existingPRs: PersonalRecord[]
): NewPersonalRecord[] {
  const newPRs: NewPersonalRecord[] = [];
  const prMap = new Map<string, PersonalRecord>();
  
  for (const pr of existingPRs) {
    prMap.set(pr.exerciseName, pr);
  }

  for (const round of rounds) {
    if (round.skipped) continue;

    const existingPR = prMap.get(round.exerciseName);
    let isNewPR = false;

    if (round.isHold) {
      // For time-based exercises, check actualSeconds
      const actualSeconds = round.actualSeconds ?? round.actualReps ?? 0;
      if (actualSeconds > 0) {
        if (!existingPR || existingPR.bestSeconds === null || actualSeconds > existingPR.bestSeconds) {
          isNewPR = true;
          newPRs.push({
            exerciseName: round.exerciseName,
            bestReps: null,
            bestSeconds: actualSeconds,
            sessionId: session.id,
          });
        }
      }
    } else {
      // For rep-based exercises, check actualReps
      const actualReps = round.actualReps ?? 0;
      if (actualReps > 0) {
        if (!existingPR || existingPR.bestReps === null || actualReps > existingPR.bestReps) {
          isNewPR = true;
          newPRs.push({
            exerciseName: round.exerciseName,
            bestReps: actualReps,
            bestSeconds: null,
            sessionId: session.id,
          });
        }
      }
    }
  }

  return newPRs;
}

/**
 * Update personal records after a workout session
 */
export async function updatePersonalRecords(
  userId: string,
  session: WorkoutSession,
  rounds: WorkoutRound[]
): Promise<NewPersonalRecord[]> {
  const existingPRs = await storage.getPersonalRecords(userId);
  const newPRs = detectPersonalRecords(session, rounds, existingPRs);

  // Update database with new PRs
  for (const newPR of newPRs) {
    await storage.upsertPersonalRecord(userId, {
      exerciseName: newPR.exerciseName,
      bestReps: newPR.bestReps,
      bestSeconds: newPR.bestSeconds,
      bestSessionId: newPR.sessionId,
      achievedAt: new Date(),
    });
  }

  return newPRs;
}

/**
 * Get PR opportunities - suggest when user is close to setting a new PR
 */
export async function getPROpportunities(
  userId: string,
  exerciseName: string,
  targetReps: number,
  isHold: boolean
): Promise<{ isClose: boolean; currentPR: number | null; targetToBeat: number | null }> {
  const existingPRs = await storage.getPersonalRecords(userId);
  const pr = existingPRs.find(p => p.exerciseName === exerciseName);

  if (!pr) {
    // No PR exists, any performance is a PR opportunity
    return {
      isClose: true,
      currentPR: null,
      targetToBeat: null,
    };
  }

  const currentPR = isHold ? pr.bestSeconds : pr.bestReps;
  if (currentPR === null) {
    return {
      isClose: true,
      currentPR: null,
      targetToBeat: null,
    };
  }

  // Consider it "close" if target is within 10% of current PR
  const threshold = currentPR * 0.9;
  const isClose = targetReps >= threshold;

  return {
    isClose,
    currentPR,
    targetToBeat: currentPR + 1, // Need to beat by at least 1
  };
}

