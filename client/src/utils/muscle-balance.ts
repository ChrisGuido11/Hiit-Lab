export type MuscleBucket = "push" | "pull" | "legs" | "core" | "other";

export type VolumeBreakdown = Record<MuscleBucket, number>;

export interface VolumeSource {
  targetMuscleGroup?: string;
  reps?: number | null;
  actualReps?: number | null;
  actualSeconds?: number | null;
  isHold?: boolean;
}

const EMPTY_VOLUME: VolumeBreakdown = {
  push: 0,
  pull: 0,
  legs: 0,
  core: 0,
  other: 0,
};

function getEffortUnits(round: VolumeSource): number {
  if (typeof round.actualReps === "number") return Math.max(round.actualReps, 0);
  if (typeof round.reps === "number") return Math.max(round.reps, 0);
  if (round.isHold && typeof round.actualSeconds === "number") {
    return Math.max(Math.round(round.actualSeconds / 10), 1);
  }
  return 1;
}

export function bucketMuscleGroup(group?: string): MuscleBucket {
  if (!group) return "other";
  const normalized = group.toLowerCase();

  if (normalized.includes("leg") || normalized.includes("glute") || normalized.includes("quad") || normalized.includes("posterior")) {
    return "legs";
  }

  if (normalized.includes("chest") || normalized.includes("shoulder") || normalized.includes("tricep") || normalized.includes("press")) {
    return "push";
  }

  if (normalized.includes("back") || normalized.includes("pull") || normalized.includes("row")) {
    return "pull";
  }

  if (normalized.includes("core") || normalized.includes("abs") || normalized.includes("oblique")) {
    return "core";
  }

  return "other";
}

export function calculateVolumeFromRounds(rounds: VolumeSource[]): VolumeBreakdown {
  return rounds.reduce((totals, round) => {
    const bucket = bucketMuscleGroup(round.targetMuscleGroup);
    const effort = getEffortUnits(round);
    totals[bucket] += effort;
    return totals;
  }, { ...EMPTY_VOLUME });
}

export function mergeVolumeTotals(...volumes: VolumeBreakdown[]): VolumeBreakdown {
  return volumes.reduce((combined, volume) => {
    (Object.keys(volume) as MuscleBucket[]).forEach((bucket) => {
      combined[bucket] = (combined[bucket] ?? 0) + (volume[bucket] ?? 0);
    });
    return combined;
  }, { ...EMPTY_VOLUME });
}

export function primaryFocus(volume: VolumeBreakdown): MuscleBucket {
  const entries = Object.entries(volume) as Array<[MuscleBucket, number]>;
  const [bucket] = entries.reduce<[MuscleBucket, number]>(
    (best, current) => (current[1] > best[1] ? current : best),
    ["other", 0],
  );
  return bucket;
}

export function describeVolumeGaps(volume: VolumeBreakdown): MuscleBucket[] {
  const max = Math.max(...Object.values(volume));
  if (max === 0) return [];
  return (Object.entries(volume) as Array<[MuscleBucket, number]>)
    .filter(([, value]) => value < max * 0.6)
    .map(([bucket]) => bucket);
}
