import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Check,
  Dumbbell,
  Clock,
  Activity,
  User,
  Weight,
  Circle,
  AlignVerticalJustifyStart,
  RectangleHorizontal,
  CircleDot,
  Cable,
  MonitorPlay,
  Bike,
  Waves,
  TrendingUp,
  Disc,
  Box,
  Cog
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import MobileLayout from "@/components/layout/mobile-layout";

/**
 * EQUIPMENT CONFIGURATION
 * ========================
 * Comprehensive equipment list for HIIT/strength workouts.
 *
 * Current Equipment Options (expanded from 6 to 16):
 * - Bodyweight (no equipment)
 * - Dumbbells
 * - Kettlebells
 * - Resistance Bands
 * - Barbell
 * - Pull-Up Bar
 * - Bench
 * - Medicine Ball
 * - Jump Rope
 * - Treadmill
 * - Stationary Bike
 * - Rower
 * - Elliptical
 * - Sliders
 * - Step/Box
 * - Weight Machines
 *
 * Storage: PostgreSQL JSONB array (schema.ts: profiles.equipment)
 * Icon Library: lucide-react
 * Multi-select: Supported
 *
 * Icon Mapping Notes:
 * - All icons from lucide-react library (no new dependencies)
 * - Chosen for visual clarity and best semantic match
 * - Some equipment types use approximate icons where exact matches don't exist
 *   (e.g., Circle for medicine ball, Waves for rower, Disc for sliders)
 */
const EQUIPMENT_OPTIONS = [
  { key: "bodyweight", label: "Bodyweight", icon: User },
  { key: "dumbbells", label: "Dumbbells", icon: Dumbbell },
  { key: "kettlebells", label: "Kettlebells", icon: Weight },
  { key: "resistance_bands", label: "Resistance Bands", icon: Cable },
  { key: "barbell", label: "Barbell", icon: TrendingUp },
  { key: "pull_up_bar", label: "Pull-Up Bar", icon: AlignVerticalJustifyStart },
  { key: "bench", label: "Bench", icon: RectangleHorizontal },
  { key: "medicine_ball", label: "Medicine Ball", icon: CircleDot },
  { key: "jump_rope", label: "Jump Rope", icon: Cable },
  { key: "treadmill", label: "Treadmill", icon: MonitorPlay },
  { key: "stationary_bike", label: "Stationary Bike", icon: Bike },
  { key: "rower", label: "Rower", icon: Waves },
  { key: "elliptical", label: "Elliptical", icon: Activity },
  { key: "sliders", label: "Sliders", icon: Disc },
  { key: "step_or_box", label: "Step/Box", icon: Box },
  { key: "weight_machines", label: "Weight Machines", icon: Cog },
] as const;

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [preferences, setPreferences] = useState({
    fitnessLevel: "",
    equipment: [] as string[],
    goalFocus: ""
  });

  const createProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create profile");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({ title: "Profile Created!", description: "Let's start training!" });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSelect = (key: string, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const toggleEquipment = (item: string) => {
    setPreferences(prev => {
      const current = prev.equipment;
      if (current.includes(item)) {
        return { ...prev, equipment: current.filter(i => i !== item) };
      }
      return { ...prev, equipment: [...current, item] };
    });
  };

  const nextStep = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      // Save to backend
      createProfileMutation.mutate(preferences);
    }
  };

  const steps = [
    {
      title: "Fitness Level",
      subtitle: "Help us tailor the intensity",
      component: (
        <div className="space-y-3">
          {["Beginner", "Intermediate", "Advanced", "Elite"].map((level) => (
            <Card 
              key={level}
              className={cn(
                "p-4 border-2 cursor-pointer transition-all duration-200 flex items-center justify-between",
                preferences.fitnessLevel === level
                  ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(0,229,255,0.15)]"
                  : "border-border/50 bg-card/50 hover:border-primary/50"
              )}
              onClick={() => handleSelect("fitnessLevel", level)}
              data-testid={`option-fitness-${level.toLowerCase()}`}
            >
              <span className="text-lg font-bold tracking-wide">{level}</span>
              {preferences.fitnessLevel === level && <Check className="text-primary" size={20} />}
            </Card>
          ))}
        </div>
      )
    },
    {
      title: "Equipment",
      subtitle: "What do you have access to?",
      component: (
        <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[calc(100vh-22rem)] pr-1">
          {EQUIPMENT_OPTIONS.map((equipment) => {
            const IconComponent = equipment.icon;
            return (
              <Card
                key={equipment.key}
                className={cn(
                  "p-4 border-2 cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2 aspect-square",
                  preferences.equipment.includes(equipment.key)
                    ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(0,229,255,0.15)]"
                    : "border-border/50 bg-card/50 hover:border-primary/50"
                )}
                onClick={() => toggleEquipment(equipment.key)}
                data-testid={`option-equipment-${equipment.key}`}
              >
                <IconComponent className={cn(
                  "w-8 h-8",
                  preferences.equipment.includes(equipment.key) ? "text-primary" : "text-muted-foreground"
                )} />
                <span className="text-sm font-bold text-center leading-tight">{equipment.label}</span>
              </Card>
            );
          })}
        </div>
      )
    },
    {
      title: "Primary Goal",
      subtitle: "What are you training for?",
      component: (
        <div className="space-y-3">
          {[
            { id: "cardio", label: "Cardio & Endurance", icon: Activity },
            { id: "strength", label: "Strength & Power", icon: Dumbbell },
            { id: "metcon", label: "Metabolic Conditioning", icon: Clock }
          ].map((goal) => (
            <Card 
              key={goal.id}
              className={cn(
                "p-5 border-2 cursor-pointer transition-all duration-200 flex items-center gap-4",
                preferences.goalFocus === goal.id
                  ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(0,229,255,0.15)]"
                  : "border-border/50 bg-card/50 hover:border-primary/50"
              )}
              onClick={() => handleSelect("goalFocus", goal.id)}
              data-testid={`option-goal-${goal.id}`}
            >
              <goal.icon className={cn(
                preferences.goalFocus === goal.id ? "text-primary" : "text-muted-foreground"
              )} />
              <span className="text-lg font-bold tracking-wide">{goal.label}</span>
            </Card>
          ))}
        </div>
      )
    }
  ];

  const currentStep = steps[step];

  return (
    <MobileLayout hideNav>
      <div className="p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "h-1 w-8 rounded-full transition-all duration-300",
                  i <= step ? "bg-primary" : "bg-secondary"
                )} 
              />
            ))}
          </div>
          <span className="font-display text-muted-foreground">STEP {step + 1}/{steps.length}</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col"
          >
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-2 text-white">{currentStep.title}</h1>
              <p className="text-muted-foreground text-lg">{currentStep.subtitle}</p>
            </div>

            <div className="flex-1">
              {currentStep.component}
            </div>
          </motion.div>
        </AnimatePresence>

        <Button 
          size="lg" 
          className="w-full h-14 text-lg font-bold uppercase tracking-wider bg-primary text-black hover:bg-primary/90 mt-4"
          onClick={nextStep}
          disabled={
            (step === 0 && !preferences.fitnessLevel) ||
            (step === 2 && !preferences.goalFocus) ||
            createProfileMutation.isPending
          }
          data-testid="button-next"
        >
          {createProfileMutation.isPending ? "Saving..." : step === steps.length - 1 ? "Start Training" : "Next"}
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </MobileLayout>
  );
}
