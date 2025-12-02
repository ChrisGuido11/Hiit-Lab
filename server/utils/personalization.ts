import type { ExerciseStat, WorkoutRound, WorkoutSession } from "@shared/schema";

export interface ExerciseScore {
  acceptRate: number;
  skipRate: number;
  averageQuality: number;
  utility: number;
  sampleSize: number;
}

export interface PersonalizationInsights {
  averageHitRate: number;
  skipRate: number;
  averageRpe: number | null;
  fatigueTrend: number;
  exercisePreference: Record<string, number>;
  exerciseScores: Record<string, ExerciseScore>;
}

export interface SessionPerformanceSummary {
  averageHitRate: number;
  skipRate: number;
  averageRpe: number | null;
  movementPerformance: Record<string, { hitRate: number; skipRate: number; averageRpe: number | null }>;
}

export interface FrameworkOutcomeScore {
  successScore: number;
  completionRate: number;
  hitRate: number;
  skipRate: number;
  completedRounds: number;
  totalRounds: number;
}

export function buildPersonalizationInsights(
  sessions: Array<WorkoutSession & { rounds: WorkoutRound[] }>,
  windowSize = 8,
  exerciseStats?: ExerciseStat[],
): PersonalizationInsights {
  const recent = sessions.slice(0, windowSize);

  let hitSum = 0;
  let hitCount = 0;
  let skippedCount = 0;
  let totalRounds = 0;
  const preferenceBuckets: Record<string, { score: number; count: number }> = {};
  const rpeValues: number[] = [];
  const exerciseBuckets: Record<string, { accept: number; skip: number; completion: number; qualitySum: number }> = {};

  for (const session of recent) {
    if (typeof session.perceivedExertion === "number") {
      rpeValues.push(session.perceivedExertion);
    }

    for (const round of session.rounds) {
      totalRounds += 1;
      const exerciseBucket = exerciseBuckets[round.exerciseName] ?? { accept: 0, skip: 0, completion: 0, qualitySum: 0 };

      if (round.skipped) {
        skippedCount += 1;
        exerciseBucket.skip += 1;
        exerciseBuckets[round.exerciseName] = exerciseBucket;
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

      exerciseBucket.accept += 1;
      exerciseBucket.completion += 1;
      exerciseBucket.qualitySum += ratio;
      exerciseBuckets[round.exerciseName] = exerciseBucket;
    }
  }

  const averageHitRate = hitCount ? hitSum / hitCount : 1;
  const skipRate = totalRounds ? skippedCount / totalRounds : 0;
  const averageRpe = rpeValues.length ? rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length : null;
  const fatigueTrend = Math.max(
    0,
    skipRate * 0.5 +
      (averageHitRate < 1 ? 1 - averageHitRate : 0) +
      ((averageRpe ?? 0) > 3 ? ((averageRpe ?? 0) - 3) / 5 : 0),
  );

  const exercisePreference = Object.fromEntries(
    Object.entries(preferenceBuckets).map(([muscle, bucket]) => {
      const ratio = bucket.count ? bucket.score / bucket.count : 1;
      return [muscle, Math.min(Math.max(ratio, 0.8), 1.3)];
    }),
  );

  const mergedExerciseBuckets: Record<string, { accept: number; skip: number; completion: number; qualitySum: number }> = {
    ...exerciseBuckets,
  };

  for (const stat of exerciseStats ?? []) {
    const existing = mergedExerciseBuckets[stat.exerciseName] ?? { accept: 0, skip: 0, completion: 0, qualitySum: 0 };
    mergedExerciseBuckets[stat.exerciseName] = {
      accept: existing.accept + stat.acceptCount,
      skip: existing.skip + stat.skipCount,
      completion: existing.completion + stat.completionCount,
      qualitySum: existing.qualitySum + stat.qualitySum,
    };
  }

  const exerciseScores = Object.fromEntries(
    Object.entries(mergedExerciseBuckets).map(([exerciseName, bucket]) => {
      const attempts = bucket.accept + bucket.skip;
      const sampleSize = bucket.completion;
      const averageQuality = sampleSize ? bucket.qualitySum / sampleSize : 1;
      const acceptRate = attempts ? bucket.accept / attempts : 0.5;
      const skipRate = attempts ? bucket.skip / attempts : 0;
      const utility = Math.min(1.4, Math.max(0.7, 0.85 + acceptRate * 0.35 + (averageQuality - 1) * 0.3));

      return [exerciseName, { acceptRate, skipRate, averageQuality, utility, sampleSize } satisfies ExerciseScore];
    }),
  );

  return {
    averageHitRate,
    skipRate,
    averageRpe,
    fatigueTrend,
    exercisePreference,
    exerciseScores,
  };
}

export function summarizeSessionPerformance(
  rounds: Array<Pick<WorkoutRound, "reps" | "actualReps" | "actualSeconds" | "skipped" | "isHold">>,
  perceivedExertion?: number | null,
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

export function scoreFrameworkOutcome(
  performance: SessionPerformanceSummary,
  totalRounds: number,
  perceivedExertion?: number | null,
): FrameworkOutcomeScore {
  const completionRate = Math.max(0, 1 - performance.skipRate);
  const rpePenalty = typeof perceivedExertion === "number"
    ? Math.max(0.75, 1 - Math.max(0, perceivedExertion - 3) * 0.08)
    : 1;
  const weightedScore = ((performance.averageHitRate || 1) * 0.6 + completionRate * 0.4) * rpePenalty;

  return {
    successScore: Math.min(1.6, Math.max(0.6, weightedScore)),
    completionRate,
    hitRate: performance.averageHitRate,
    skipRate: performance.skipRate,
    completedRounds: Math.round(totalRounds * completionRate),
    totalRounds,
  };
}

export function aggregateExerciseOutcomes(
  rounds: Array<
    Pick<
      WorkoutRound,
      "exerciseName" | "reps" | "actualReps" | "actualSeconds" | "skipped" | "isHold"
    >
  >,
) {
  const aggregates: Record<string, { accept: number; skip: number; completion: number; qualitySum: number }> = {};

  for (const round of rounds) {
    const bucket = aggregates[round.exerciseName] ?? { accept: 0, skip: 0, completion: 0, qualitySum: 0 };

    if (round.skipped) {
      bucket.skip += 1;
      aggregates[round.exerciseName] = bucket;
      continue;
    }

    const target = round.reps || 1;
    const actualValue = round.isHold
      ? round.actualSeconds ?? round.actualReps ?? target
      : round.actualReps ?? round.actualSeconds ?? target;

    const ratio = Math.min(actualValue / target, 1.5);
    bucket.accept += 1;
    bucket.completion += 1;
    bucket.qualitySum += ratio;
    aggregates[round.exerciseName] = bucket;
  }

  return Object.entries(aggregates).map(([exerciseName, bucket]) => ({
    exerciseName,
    acceptCount: bucket.accept,
    skipCount: bucket.skip,
    completionCount: bucket.completion,
    qualitySum: bucket.qualitySum,
  }));
}
