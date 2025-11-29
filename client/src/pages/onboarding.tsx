import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Dumbbell, Clock, Activity, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import MobileLayout from "@/components/layout/mobile-layout";

// Mock user preferences storage (local storage wrapper)
const PREFS_KEY = "emom_user_prefs";

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [, setLocation] = useLocation();
  const [preferences, setPreferences] = useState({
    fitnessLevel: "",
    equipment: [] as string[],
    duration: 10,
    goal: ""
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
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Save and finish
      localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
      setLocation("/");
    }
  };

  const steps = [
    {
      title: "Fitness Level",
      subtitle: "Help us tailor the intensity",
      component: (
        <div className="space-y-4">
          {["Beginner", "Intermediate", "Advanced", "Elite"].map((level) => (
            <div 
              key={level}
              className={cn(
                "p-5 rounded-[1.5rem] cursor-pointer transition-all duration-200 flex items-center justify-between border",
                preferences.fitnessLevel === level 
                  ? "bg-white border-white text-slate-900 shadow-lg" 
                  : "bg-[#121726] border-white/5 text-white hover:bg-[#1a2133]"
              )}
              onClick={() => handleSelect("fitnessLevel", level)}
            >
              <span className="text-lg font-bold">{level}</span>
              {preferences.fitnessLevel === level && (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="text-slate-900 w-4 h-4" strokeWidth={3} />
                </div>
              )}
            </div>
          ))}
        </div>
      )
    },
    {
      title: "Equipment",
      subtitle: "What do you have access to?",
      component: (
        <div className="grid grid-cols-2 gap-4">
          {["Dumbbells", "Kettlebell", "Pull-up Bar", "Jump Rope", "Box", "None (Bodyweight)"].map((item) => (
            <div 
              key={item}
              className={cn(
                "p-4 rounded-[1.5rem] cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 aspect-square border",
                preferences.equipment.includes(item) 
                  ? "bg-white border-white text-slate-900 shadow-lg" 
                  : "bg-[#121726] border-white/5 text-white hover:bg-[#1a2133]"
              )}
              onClick={() => toggleEquipment(item)}
            >
              <Dumbbell className={cn(
                "w-8 h-8",
                preferences.equipment.includes(item) ? "text-primary fill-current" : "text-muted-foreground"
              )} />
              <span className="text-sm font-bold text-center leading-tight">{item}</span>
            </div>
          ))}
        </div>
      )
    },
    {
      title: "Duration",
      subtitle: "How much time do you have?",
      component: (
        <div className="space-y-8 py-8">
          <div className="flex justify-between text-muted-foreground font-bold text-sm uppercase tracking-wider">
            <span>5 min</span>
            <span>30 min</span>
          </div>
          <input 
            type="range" 
            min="5" 
            max="30" 
            step="1"
            value={preferences.duration}
            onChange={(e) => handleSelect("duration", parseInt(e.target.value))}
            className="w-full h-2 bg-[#121726] rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="text-center">
            <div className="inline-flex items-baseline justify-center">
              <span className="text-8xl font-bold text-white tracking-tighter">
                {preferences.duration}
              </span>
              <span className="text-xl font-bold text-primary ml-2">MIN</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Primary Goal",
      subtitle: "What are you training for?",
      component: (
        <div className="space-y-4">
          {[
            { id: "cardio", label: "Cardio & Endurance", icon: Activity },
            { id: "strength", label: "Strength & Power", icon: Dumbbell },
            { id: "metcon", label: "Metabolic Conditioning", icon: Clock }
          ].map((goal) => (
            <div 
              key={goal.id}
              className={cn(
                "p-5 rounded-[1.5rem] cursor-pointer transition-all duration-200 flex items-center gap-4 border",
                preferences.goal === goal.id 
                  ? "bg-white border-white text-slate-900 shadow-lg" 
                  : "bg-[#121726] border-white/5 text-white hover:bg-[#1a2133]"
              )}
              onClick={() => handleSelect("goal", goal.id)}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                preferences.goal === goal.id ? "bg-slate-100" : "bg-white/5"
              )}>
                <goal.icon className={cn(
                  "w-5 h-5",
                  preferences.goal === goal.id ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <span className="text-lg font-bold">{goal.label}</span>
            </div>
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
          {step > 0 ? (
             <Button variant="ghost" size="icon" onClick={() => setStep(step - 1)} className="text-white hover:bg-white/10 -ml-2">
               <ChevronLeft />
             </Button>
          ) : <div />}
          
          <div className="flex gap-2">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "h-1.5 w-8 rounded-full transition-all duration-300",
                  i <= step ? "bg-primary" : "bg-[#121726]"
                )} 
              />
            ))}
          </div>
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
              <h1 className="text-3xl font-bold mb-2 text-white">{currentStep.title}</h1>
              <p className="text-muted-foreground text-base">{currentStep.subtitle}</p>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide pb-4">
              {currentStep.component}
            </div>
          </motion.div>
        </AnimatePresence>

        <Button 
          size="lg" 
          className="w-full h-16 rounded-[1.5rem] text-lg font-bold bg-primary text-black hover:bg-primary/90 mt-4 shadow-[0_0_20px_rgba(204,255,0,0.3)]"
          onClick={nextStep}
          disabled={
            (step === 0 && !preferences.fitnessLevel) ||
            (step === 3 && !preferences.goal)
          }
        >
          {step === steps.length - 1 ? "Start Training" : "Continue"}
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </MobileLayout>
  );
}
