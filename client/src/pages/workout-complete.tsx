import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Star } from "lucide-react";
import { motion } from "framer-motion";
import MobileLayout from "@/components/layout/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function WorkoutComplete() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRPE, setSelectedRPE] = useState<number | null>(null);

  const { data: workout } = useQuery({
    queryKey: ["/api/workout/generate"],
  });

  const saveWorkoutMutation = useMutation({
    mutationFn: async (rpe: number) => {
      if (!workout) throw new Error("No workout data");
      
      const res = await fetch("/api/workout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          framework: "EMOM",
          durationMinutes: workout.durationMinutes,
          difficultyTag: workout.difficultyTag,
          focusLabel: workout.focusLabel,
          perceivedExertion: rpe,
          rounds: workout.rounds,
        }),
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to save workout");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workout/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workout/generate"] });
      toast({ title: "Workout Saved!", description: "Great job crushing it!" });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (selectedRPE) {
      saveWorkoutMutation.mutate(selectedRPE);
    }
  };

  if (!workout) {
    return (
      <MobileLayout hideNav>
        <div className="flex items-center justify-center h-full">
          <Button onClick={() => setLocation("/")} className="bg-primary text-black">
            Go Home
          </Button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout hideNav>
      <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-8 bg-black">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary neon-border"
        >
          <CheckCircle2 className="w-16 h-16 text-primary" />
        </motion.div>
        
        <div>
          <h1 className="text-5xl font-bold text-white mb-2">CRUSHED IT!</h1>
          <p className="text-xl text-muted-foreground">Workout Complete</p>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full">
          <Card className="p-4 bg-card border-border/50 text-center">
            <span className="text-3xl font-display font-bold text-white">{workout.durationMinutes}</span>
            <p className="text-xs uppercase text-muted-foreground">Minutes</p>
          </Card>
          <Card className="p-4 bg-card border-border/50 text-center">
            <span className="text-3xl font-display font-bold text-white">{workout.durationMinutes * 15}</span>
            <p className="text-xs uppercase text-muted-foreground">Est. Cals</p>
          </Card>
        </div>

        {/* RPE Selection */}
        <div className="w-full space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-bold text-white mb-1">How hard was it?</h3>
            <p className="text-sm text-muted-foreground">Rate your perceived exertion (1-5)</p>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((rpe) => (
              <button
                key={rpe}
                onClick={() => setSelectedRPE(rpe)}
                className={cn(
                  "aspect-square rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1",
                  selectedRPE === rpe
                    ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(204,255,0,0.2)]"
                    : "border-border/50 bg-card/50 hover:border-primary/50"
                )}
                data-testid={`rpe-${rpe}`}
              >
                <Star className={cn(
                  "w-6 h-6",
                  selectedRPE === rpe ? "text-primary fill-primary" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "text-lg font-display font-bold",
                  selectedRPE === rpe ? "text-primary" : "text-muted-foreground"
                )}>
                  {rpe}
                </span>
              </button>
            ))}
          </div>

          <div className="flex justify-between text-xs text-muted-foreground px-1">
            <span>Too Easy</span>
            <span>Perfect</span>
            <span>Too Hard</span>
          </div>
        </div>

        <Button 
          className="w-full h-14 text-lg font-bold uppercase tracking-wider bg-primary text-black hover:bg-primary/90 mt-8"
          onClick={handleSave}
          disabled={!selectedRPE || saveWorkoutMutation.isPending}
          data-testid="button-save"
        >
          {saveWorkoutMutation.isPending ? "Saving..." : "Save Workout"}
        </Button>
      </div>
    </MobileLayout>
  );
}
