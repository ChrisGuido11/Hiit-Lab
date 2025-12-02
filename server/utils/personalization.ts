import type { WorkoutRound, WorkoutSession } from "@shared/schema";

export interface PersonalizationInsights {
  averageHitRate: number;
  skipRate: number;
  averageRpe: number | null;
  fatigueTrend: number;
  exercisePreference: Record<string, number>;
}

export interface SessionPerformanceSummary {
  averageHitRate: number;
  skipRate: number;
  averageRpe: number | null;
  movementPerformance: Record<string, { hitRate: number; skipRate: number; averageRpe: number | null }>;
}

export function buildPersonalizationInsights(
  sessions: Array<WorkoutSession & { rounds: WorkoutRound[] }>,
  windowSize = 8
): PersonalizationInsights {
  const recent = sessions.slice(0, windowSize);

  let hitSum = 0;
  let hitCount = 0;
  let skippedCount = 0;
  let totalRounds = 0;
  const preferenceBuckets: Record<string, { score: number; count: number }> = {};
  const rpeValues: number[] = [];

  for (const session of recent) {
    if (typeof session.perceivedExertion === "number") {
      rpeValues.push(session.perceivedExertion);
    }
    for (const round of session.rounds) {
      totalRounds += 1;
      if (round.skipped) {
        skippedCount += 1;
        continue;
      }

      const target = round.reps || 1;
      const actualValue = round.isHold
        ? round.actualSeconds ?? round.actualReps ?? target
        : round.actualReps ?? round.actualSeconds ?? target;

      const ratio = Math.min(actualValue / target, 1.5);
      hitSum += ratio;
      hitCount += 1;

      const bucket = preferenceBuckets[round.targetMuscleGroup] ?? { score: 0, count: 0 };
      bucket.score += ratio;
      bucket.count += 1;
      preferenceBuckets[round.targetMuscleGroup] = bucket;
    }
  }

  const averageHitRate = hitCount ? hitSum / hitCount : 1;
  const skipRate = totalRounds ? skippedCount / totalRounds : 0;
  const averageRpe = rpeValues.length ? rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length : null;
  const fatigueTrend = Math.max(0, skipRate * 0.5 + (averageHitRate < 1 ? 1 - averageHitRate : 0) + ((averageRpe ?? 0) > 3 ? ((averageRpe ?? 0) - 3) / 5 : 0));

  const exercisePreference = Object.fromEntries(
    Object.entries(preferenceBuckets).map(([muscle, bucket]) => {
      const ratio = bucket.count ? bucket.score / bucket.count : 1;
      return [muscle, Math.min(Math.max(ratio, 0.8), 1.3)];
    })
  );

  return {
    averageHitRate,
    skipRate,
    averageRpe,
    fatigueTrend,
    exercisePreference,
  };
}

export function summarizeSessionPerformance(
  rounds: Array<Pick<WorkoutRound, "reps" | "actualReps" | "actualSeconds" | "skipped" | "isHold">>,
  perceivedExertion?: number | null
): SessionPerformanceSummary {
  let hitSum = 0;
  let hitCount = 0;
  let skipped = 0;
  const movementBuckets: Record<string, { hitSum: number; hitCount: number; skipped: number; total: number }> = {};

  for (const round of rounds) {
    if (round.skipped) {
      skipped += 1;
      const movement = (round as any).targetMuscleGroup as string | undefined;
      if (movement) {
        const bucket = movementBuckets[movement] ?? { hitSum: 0, hitCount: 0, skipped: 0, total: 0 };
        bucket.skipped += 1;
        bucket.total += 1;
        movementBuckets[movement] = bucket;
      }
      continue;
    }
    const target = round.reps || 1;
    const actualValue = round.isHold
      ? round.actualSeconds ?? round.actualReps ?? target
      : round.actualReps ?? round.actualSeconds ?? target;
    hitSum += Math.min(actualValue / target, 1.5);
    hitCount += 1;

    const movement = (round as any).targetMuscleGroup as string | undefined;
    if (movement) {
      const bucket = movementBuckets[movement] ?? { hitSum: 0, hitCount: 0, skipped: 0, total: 0 };
      bucket.hitSum += Math.min(actualValue / target, 1.5);
      bucket.hitCount += 1;
      bucket.total += 1;
      movementBuckets[movement] = bucket;
    }
  }

  const totalRounds = rounds.length || 1;
  const movementPerformance = Object.fromEntries(
    Object.entries(movementBuckets).map(([movement, bucket]) => {
      const movementHitRate = bucket.hitCount ? bucket.hitSum / bucket.hitCount : 1;
      const movementSkipRate = bucket.total ? bucket.skipped / bucket.total : 0;
      return [movement, { hitRate: movementHitRate, skipRate: movementSkipRate, averageRpe: null }];
    })
  );
  const rpeValue = typeof perceivedExertion === "number" ? perceivedExertion : null;

  return {
    averageHitRate: hitCount ? hitSum / hitCount : 1,
    skipRate: skipped / totalRounds,
    averageRpe: rpeValue,
    movementPerformance: Object.fromEntries(
      Object.entries(movementPerformance).map(([movement, perf]) => [
        movement,
        { ...perf, averageRpe: rpeValue },
      ])
    ),
  };
}
