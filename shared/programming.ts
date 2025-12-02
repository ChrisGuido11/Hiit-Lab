import type { Framework } from "./frameworks";
import type { PrimaryGoalId } from "./goals";

export type MicrocycleIntensity = "low" | "moderate" | "high";

export interface MicrocycleDayPlan {
  framework: Framework;
  durationMinutes: number;
  intensity: MicrocycleIntensity;
  focus?: string;
}

export interface MicrocycleTemplate {
  id: string;
  lengthDays: number;
  days: MicrocycleDayPlan[];
  summary: string;
}

const MICRO_CYCLE_LIBRARY: Record<PrimaryGoalId, MicrocycleTemplate> = {
  cardio_endurance: {
    id: "cardio_endurance_base",
    summary: "Aerobic base with intervals and controlled recovery work",
    lengthDays: 10,
    days: [
      { framework: "Circuit", durationMinutes: 25, intensity: "moderate", focus: "Aerobic base builder" },
      { framework: "EMOM", durationMinutes: 18, intensity: "moderate", focus: "Engine control" },
      { framework: "Tabata", durationMinutes: 10, intensity: "high", focus: "VO2 intervals" },
      { framework: "Circuit", durationMinutes: 20, intensity: "low", focus: "Mobility and prehab" },
      { framework: "AMRAP", durationMinutes: 20, intensity: "moderate", focus: "Sustainable pacing" },
      { framework: "EMOM", durationMinutes: 22, intensity: "high", focus: "Threshold conditioning" },
      { framework: "Circuit", durationMinutes: 18, intensity: "low", focus: "Active recovery" },
      { framework: "AMRAP", durationMinutes: 18, intensity: "moderate", focus: "Mixed modal endurance" },
      { framework: "Tabata", durationMinutes: 8, intensity: "high", focus: "Speed work" },
      { framework: "Circuit", durationMinutes: 22, intensity: "moderate", focus: "Longer aerobic finish" },
    ],
  },
  fat_loss: {
    id: "fat_loss_hiit",
    summary: "High calorie burn with alternating HIIT and steady burn days",
    lengthDays: 7,
    days: [
      { framework: "Tabata", durationMinutes: 12, intensity: "high", focus: "Opener sprint day" },
      { framework: "Circuit", durationMinutes: 22, intensity: "moderate", focus: "Steady burn" },
      { framework: "EMOM", durationMinutes: 16, intensity: "moderate", focus: "Density training" },
      { framework: "Circuit", durationMinutes: 18, intensity: "low", focus: "Low-impact recovery" },
      { framework: "Tabata", durationMinutes: 10, intensity: "high", focus: "Intervals" },
      { framework: "AMRAP", durationMinutes: 15, intensity: "moderate", focus: "Mixed modal" },
      { framework: "Circuit", durationMinutes: 20, intensity: "moderate", focus: "Finish strong" },
    ],
  },
  muscle_gain: {
    id: "muscle_gain_strength",
    summary: "Hypertrophy cadence with higher volume and controlled rest",
    lengthDays: 8,
    days: [
      { framework: "Circuit", durationMinutes: 26, intensity: "moderate", focus: "Full-body hypertrophy" },
      { framework: "EMOM", durationMinutes: 22, intensity: "moderate", focus: "Strength density" },
      { framework: "Circuit", durationMinutes: 24, intensity: "moderate", focus: "Accessory volume" },
      { framework: "Tabata", durationMinutes: 8, intensity: "high", focus: "Metabolic finisher" },
      { framework: "Circuit", durationMinutes: 20, intensity: "low", focus: "Mobility and tissue work" },
      { framework: "AMRAP", durationMinutes: 18, intensity: "moderate", focus: "Pump endurance" },
      { framework: "EMOM", durationMinutes: 20, intensity: "moderate", focus: "Pressing focus" },
      { framework: "Circuit", durationMinutes: 24, intensity: "moderate", focus: "Leg volume" },
    ],
  },
  strength_power: {
    id: "strength_power_wave",
    summary: "Strength waves with explosive support work",
    lengthDays: 7,
    days: [
      { framework: "EMOM", durationMinutes: 18, intensity: "moderate", focus: "Skill primer" },
      { framework: "Circuit", durationMinutes: 24, intensity: "moderate", focus: "Strength volume" },
      { framework: "Tabata", durationMinutes: 8, intensity: "high", focus: "Power intervals" },
      { framework: "Circuit", durationMinutes: 18, intensity: "low", focus: "Recovery and mobility" },
      { framework: "EMOM", durationMinutes: 22, intensity: "high", focus: "Heavy density" },
      { framework: "AMRAP", durationMinutes: 16, intensity: "moderate", focus: "Work capacity" },
      { framework: "Circuit", durationMinutes: 20, intensity: "moderate", focus: "Accessory strength" },
    ],
  },
  metabolic_conditioning: {
    id: "metcon_block",
    summary: "Work-capacity block with repeated HIIT exposures",
    lengthDays: 10,
    days: [
      { framework: "Tabata", durationMinutes: 10, intensity: "high", focus: "Lactate tolerance" },
      { framework: "EMOM", durationMinutes: 18, intensity: "moderate", focus: "Engine control" },
      { framework: "Circuit", durationMinutes: 20, intensity: "moderate", focus: "Mixed modal" },
      { framework: "Tabata", durationMinutes: 8, intensity: "high", focus: "Speed endurance" },
      { framework: "Circuit", durationMinutes: 18, intensity: "low", focus: "Movement quality" },
      { framework: "AMRAP", durationMinutes: 18, intensity: "moderate", focus: "Sustainable pace" },
      { framework: "EMOM", durationMinutes: 20, intensity: "high", focus: "Threshold" },
      { framework: "Circuit", durationMinutes: 22, intensity: "moderate", focus: "Mixed volume" },
      { framework: "Tabata", durationMinutes: 12, intensity: "high", focus: "Finisher" },
      { framework: "Circuit", durationMinutes: 18, intensity: "low", focus: "Deload" },
    ],
  },
  mobility_recovery: {
    id: "mobility_recovery_flow",
    summary: "Low impact block prioritizing joint care and easy conditioning",
    lengthDays: 7,
    days: [
      { framework: "Circuit", durationMinutes: 18, intensity: "low", focus: "Mobility prep" },
      { framework: "EMOM", durationMinutes: 15, intensity: "low", focus: "Technique practice" },
      { framework: "Circuit", durationMinutes: 20, intensity: "low", focus: "Core and balance" },
      { framework: "AMRAP", durationMinutes: 14, intensity: "moderate", focus: "Sustainable flow" },
      { framework: "Circuit", durationMinutes: 18, intensity: "low", focus: "Tissue care" },
      { framework: "EMOM", durationMinutes: 16, intensity: "low", focus: "Form work" },
      { framework: "Circuit", durationMinutes: 20, intensity: "low", focus: "Easy conditioning" },
    ],
  },
  athletic_performance: {
    id: "athlete_builder",
    summary: "Power, speed, and agility exposures across the week",
    lengthDays: 9,
    days: [
      { framework: "EMOM", durationMinutes: 18, intensity: "moderate", focus: "Power skills" },
      { framework: "Circuit", durationMinutes: 22, intensity: "moderate", focus: "Strength accessory" },
      { framework: "Tabata", durationMinutes: 8, intensity: "high", focus: "Speed work" },
      { framework: "Circuit", durationMinutes: 18, intensity: "low", focus: "Mobility and footwork" },
      { framework: "AMRAP", durationMinutes: 18, intensity: "moderate", focus: "Athletic mixed modal" },
      { framework: "EMOM", durationMinutes: 20, intensity: "high", focus: "Explosive density" },
      { framework: "Circuit", durationMinutes: 20, intensity: "moderate", focus: "Strength support" },
      { framework: "Tabata", durationMinutes: 10, intensity: "high", focus: "Anaerobic intervals" },
      { framework: "Circuit", durationMinutes: 18, intensity: "low", focus: "Reset and recover" },
    ],
  },
};

const DEFAULT_TEMPLATE: MicrocycleTemplate = {
  id: "general_fitness",
  summary: "Balanced mix of HIIT and skill work",
  lengthDays: 7,
  days: [
    { framework: "Circuit", durationMinutes: 20, intensity: "moderate" },
    { framework: "EMOM", durationMinutes: 16, intensity: "moderate" },
    { framework: "Tabata", durationMinutes: 8, intensity: "high" },
    { framework: "Circuit", durationMinutes: 18, intensity: "low" },
    { framework: "AMRAP", durationMinutes: 16, intensity: "moderate" },
    { framework: "EMOM", durationMinutes: 20, intensity: "high" },
    { framework: "Circuit", durationMinutes: 18, intensity: "low" },
  ],
};

function getDominantGoal(
  primaryGoal: PrimaryGoalId | null | undefined,
  goalWeights?: Record<PrimaryGoalId, number>
): PrimaryGoalId | null {
  if (goalWeights && Object.keys(goalWeights).length) {
    const sorted = Object.entries(goalWeights).sort(([, a], [, b]) => b - a);
    const [topGoal, weight] = sorted[0];
    if (weight > 0) return topGoal as PrimaryGoalId;
  }
  return primaryGoal ?? null;
}

export function getMicrocycleTemplate(
  primaryGoal: PrimaryGoalId | null | undefined,
  goalWeights?: Record<PrimaryGoalId, number>
): MicrocycleTemplate {
  const dominant = getDominantGoal(primaryGoal, goalWeights);
  if (dominant && MICRO_CYCLE_LIBRARY[dominant]) {
    return MICRO_CYCLE_LIBRARY[dominant];
  }
  return DEFAULT_TEMPLATE;
}

export function pickMicrocycleDay(
  template: MicrocycleTemplate,
  date: Date = new Date()
): { dayIndex: number; dayPlan: MicrocycleDayPlan } {
  const dayNumber = Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
  const dayIndex = dayNumber % template.days.length;
  const dayPlan = template.days[dayIndex];
  return { dayIndex, dayPlan };
}
