/**
 * Framework Type Definitions & Configurations
 *
 * Central source of truth for all HIIT framework metadata used across
 * client and server components.
 */

export type Framework = "EMOM" | "Tabata" | "AMRAP" | "Circuit"

export interface FrameworkConfig {
  id: Framework
  name: string
  fullName: string
  description: string
  shortDescription: string
  icon: string
  defaultDuration: number
  durationRange: [number, number] // [min, max] in minutes
  intensityLevel: "low" | "moderate" | "high"
  bestFor: string[] // User goals this framework excels at
  keyFeature: string // One-liner highlight
}

export const FRAMEWORK_CONFIGS: Record<Framework, FrameworkConfig> = {
  EMOM: {
    id: "EMOM",
    name: "EMOM",
    fullName: "Every Minute On the Minute",
    description: "Complete assigned reps within each minute, then rest for the remaining time. Builds work capacity and mental toughness.",
    shortDescription: "Every Minute Mastery",
    icon: "⚡",
    defaultDuration: 20,
    durationRange: [8, 30],
    intensityLevel: "moderate",
    bestFor: ["Strength & Power", "Cardio & Endurance", "Athletic Performance"],
    keyFeature: "Self-paced intensity with built-in rest"
  },

  Tabata: {
    id: "Tabata",
    name: "Tabata",
    fullName: "Tabata Protocol",
    description: "Ultra-high intensity intervals: 20 seconds all-out effort, 10 seconds rest, repeated for 8 rounds per exercise. Maximum calorie burn in minimal time.",
    shortDescription: "Max Burn in Minutes",
    icon: "🔥",
    defaultDuration: 8,
    durationRange: [4, 12],
    intensityLevel: "high",
    bestFor: ["Fat Loss", "Metabolic Conditioning", "Cardio & Endurance"],
    keyFeature: "Science-backed 4-minute intervals"
  },

  AMRAP: {
    id: "AMRAP",
    name: "AMRAP",
    fullName: "As Many Rounds As Possible",
    description: "Complete a circuit of exercises as many times as you can before time runs out. Tests endurance, pacing, and mental resilience.",
    shortDescription: "Endurance Challenge",
    icon: "♾️",
    defaultDuration: 15,
    durationRange: [10, 20],
    intensityLevel: "moderate",
    bestFor: ["Cardio & Endurance", "Metabolic Conditioning", "Athletic Performance"],
    keyFeature: "Race against the clock"
  },

  Circuit: {
    id: "Circuit",
    name: "Circuit",
    fullName: "Circuit Training",
    description: "Complete all exercises for a set number of rounds with rest between rounds. Perfect for building strength and muscle with structured recovery.",
    shortDescription: "Full-Body Strength",
    icon: "🔄",
    defaultDuration: 25,
    durationRange: [15, 30],
    intensityLevel: "low",
    bestFor: ["Muscle Gain", "Strength & Power", "Mobility & Recovery"],
    keyFeature: "Controlled pace with built-in recovery"
  }
}

/**
 * Get all frameworks as an array (for iteration)
 */
export function getAllFrameworks(): Framework[] {
  return Object.keys(FRAMEWORK_CONFIGS) as Framework[]
}

/**
 * Get framework config by ID
 */
export function getFrameworkConfig(framework: Framework): FrameworkConfig {
  return FRAMEWORK_CONFIGS[framework]
}

/**
 * Validate if a string is a valid framework
 */
export function isValidFramework(value: string): value is Framework {
  return value in FRAMEWORK_CONFIGS
}
