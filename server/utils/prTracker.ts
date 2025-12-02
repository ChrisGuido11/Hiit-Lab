import type {
  PerformanceModality,
  PersonalRecord,
  PrCelebration,
  WorkoutRound,
  WorkoutSession,
} from "@shared/schema";
import type { PersonalizationInsights } from "./personalization";

export interface PrReadiness {
  ready: boolean;
  reason: string;
  hoursSinceLast?: number;
}

export interface PrAttemptPlan {
  rounds: Array<Partial<WorkoutRound> & {
    minuteIndex: number;
    exerciseName: string;
    targetMuscleGroup: string;
    difficulty: string;
    reps: number;
    isHold?: boolean;
    alternatesSides?: boolean;
    prAttempt?: boolean;
    prModality?: PerformanceModality;
  }>;
  attempts: Array<{ minuteIndex: number; exerciseName: string; modality: PerformanceModality }>;
}

export interface PerformanceSnapshot {
  movement: string;
  modality: PerformanceModality;
  value: number;
  unit: string;
  prAttempt: boolean;
  sessionId: string;
  roundId?: string | null;
}

export function detectPrReadiness(
  history: Array<WorkoutSession & { rounds: WorkoutRound[] }>,
  personalization?: PersonalizationInsights,
): PrReadiness {
  if (!history.length) {
    return { ready: true, reason: "Fresh slate—no fatigue risk detected." };
  }

  const lastSession = history[0];
  const hoursSinceLast = Math.max(
    0,
    (Date.now() - new Date(lastSession.createdAt as unknown as string).getTime()) / (1000 * 60 * 60),
  );

  const fatigue = personalization?.fatigueTrend ?? 0;
  const skipRate = personalization?.skipRate ?? 0;
  const averageRpe = personalization?.averageRpe ?? 3;

  const recovered = hoursSinceLast >= 20;
  const manageableFatigue = fatigue < 0.65;
  const consistentExecution = skipRate < 0.25;
  const rpeOk = averageRpe <= 3.6;

  const ready = recovered && manageableFatigue && consistentExecution && rpeOk;

  const blockers: string[] = [];
  if (!recovered) blockers.push("allowing more recovery time");
  if (!manageableFatigue) blockers.push("waiting for fatigue trend to ease");
  if (!consistentExecution) blockers.push("reducing skipped intervals");
  if (!rpeOk) blockers.push("letting RPE settle under 3.6");

  return {
    ready,
    hoursSinceLast,
    reason: ready
      ? "Recovered (20h+), steady RPE, and low skips—green-lit for PR focus."
      : `PR attempts paused; ${blockers.join(" + ")}`,
  };
}

export function schedulePrAttempts(
  rounds: PrAttemptPlan["rounds"],
  readiness: PrReadiness,
  maxAttempts = 2,
): PrAttemptPlan {
  const clonedRounds = rounds.map((round) => ({ ...round }));

  if (!readiness.ready) {
    return { rounds: clonedRounds, attempts: [] };
  }

  const candidates = clonedRounds
    .filter((round) => !round.prAttempt)
    .sort((a, b) => a.minuteIndex - b.minuteIndex);

  const attempts: PrAttemptPlan["attempts"] = [];

  for (const round of candidates) {
    if (attempts.length >= maxAttempts) break;
    if (round.minuteIndex <= 2) continue; // avoid very first minutes—build up first

    const modality: PerformanceModality = round.prModality
      ? round.prModality
      : round.isHold
      ? "time"
      : "reps";

    round.prAttempt = true;
    round.prModality = modality;
    attempts.push({ minuteIndex: round.minuteIndex, exerciseName: round.exerciseName, modality });
  }

  return { rounds: clonedRounds, attempts };
}

export function buildPerformanceSnapshots(
  rounds: WorkoutRound[],
  sessionId: string,
): PerformanceSnapshot[] {
  return rounds
    .map((round) => {
      const hasLoad = typeof round.actualLoad === "number" && !Number.isNaN(round.actualLoad);
      const modality: PerformanceModality = hasLoad ? "load" : round.isHold ? "time" : "reps";

      const value = hasLoad
        ? round.actualLoad ?? round.targetLoad ?? 0
        : modality === "time"
        ? round.actualSeconds ?? round.actualReps ?? round.reps
        : round.actualReps ?? round.actualSeconds ?? round.reps;

      if (!value || value <= 0) return null;

      const unit = modality === "load" ? "kg" : modality === "time" ? "sec" : "reps";

      return {
        movement: round.exerciseName,
        modality,
        value,
        unit,
        prAttempt: Boolean(round.prAttempt),
        sessionId,
        roundId: round.id,
      } satisfies PerformanceSnapshot;
    })
    .filter(Boolean) as PerformanceSnapshot[];
}

export function evaluatePerformanceForPrs(
  snapshots: PerformanceSnapshot[],
  existingRecords: PersonalRecord[],
): { newRecords: PrCelebration[]; nearMisses: PrCelebration[]; recordUpdates: PersonalRecord[] } {
  const recordMap = new Map<string, PersonalRecord>();
  for (const record of existingRecords) {
    recordMap.set(`${record.movement}:${record.modality}`, record);
  }

  const newRecords: PrCelebration[] = [];
  const nearMisses: PrCelebration[] = [];
  const updates: PersonalRecord[] = [];

  for (const snapshot of snapshots) {
    const key = `${snapshot.movement}:${snapshot.modality}`;
    const previous = recordMap.get(key);

    if (!previous || snapshot.value > previous.value) {
      newRecords.push({
        movement: snapshot.movement,
        modality: snapshot.modality,
        value: snapshot.value,
        unit: snapshot.unit,
        previousValue: previous?.value ?? null,
        type: "new",
      });

      updates.push({
        id: previous?.id,
        userId: previous?.userId ?? "", // will be overwritten by storage layer
        movement: snapshot.movement,
        modality: snapshot.modality,
        value: snapshot.value,
        unit: snapshot.unit,
        sessionId: snapshot.sessionId,
        roundId: snapshot.roundId ?? undefined,
        createdAt: new Date(),
      } as PersonalRecord);
      recordMap.set(key, {
        ...(previous ?? {}),
        userId: previous?.userId ?? "",
        id: previous?.id,
        value: snapshot.value,
        modality: snapshot.modality,
        movement: snapshot.movement,
        unit: snapshot.unit,
        sessionId: previous?.sessionId,
        roundId: previous?.roundId,
        createdAt: previous?.createdAt ?? new Date(),
      } as PersonalRecord);
      continue;
    }

    const nearMissThreshold = previous.value * 0.95;
    if (snapshot.value >= nearMissThreshold) {
      nearMisses.push({
        movement: snapshot.movement,
        modality: snapshot.modality,
        value: snapshot.value,
        unit: snapshot.unit,
        previousValue: previous.value,
        type: "near_miss",
      });
    }
  }

  return { newRecords, nearMisses, recordUpdates: updates };
}
