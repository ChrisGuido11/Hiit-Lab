import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Play, Pause, SkipForward, X, RotateCcw, Settings } from "lucide-react";
import MobileLayout from "@/components/layout/mobile-layout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function WorkoutRunner() {
  const [, setLocation] = useLocation();
  const [isActive, setIsActive] = useState(false);
  const [currentMinute, setCurrentMinute] = useState(1);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: workout } = useQuery({
    queryKey: ["/api/workout/generate"],
  });

  useEffect(() => {
    if (!workout) {
      setLocation("/");
    }
  }, [workout, setLocation]);

  useEffect(() => {
    if (isActive && secondsLeft > 0) {
      timerRef.current = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    } else if (secondsLeft === 0) {
      if (currentMinute < (workout?.durationMinutes || 0)) {
        setCurrentMinute(m => m + 1);
        setSecondsLeft(60);
      } else {
        // Workout complete - navigate to complete screen
        setLocation("/workout/complete");
      }
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isActive, secondsLeft, currentMinute, workout, setLocation]);

  if (!workout) return null;

  const currentExercise = workout.rounds[currentMinute - 1];
  const nextExercise = workout.rounds[currentMinute] || null;

  const toggleTimer = () => setIsActive(!isActive);

  const formatTime = (s: number) => {
    return s < 10 ? `0${s}` : s;
  };

  return (
    <MobileLayout hideNav>
      <div className="h-full flex flex-col relative bg-black">
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="text-muted-foreground hover:text-white" data-testid="button-exit">
            <X />
          </Button>
          <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Round {currentMinute}/{workout.durationMinutes}
          </div>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white">
            <Settings size={20} />
          </Button>
        </div>

        {/* Main Timer Area */}
        <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
          {/* Background Pulse */}
          {isActive && (
             <motion.div 
               animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
               transition={{ repeat: Infinity, duration: 1 }}
               className="absolute w-[500px] h-[500px] rounded-full bg-primary/10 blur-3xl"
             />
          )}

          <div className="relative z-10 text-center">
            <motion.div
              key={secondsLeft}
              initial={{ y: 10, opacity: 0.8 }}
              animate={{ y: 0, opacity: 1 }}
              className="font-display text-[12rem] leading-none font-bold text-white tracking-tighter tabular-nums"
              style={{ textShadow: "0 0 40px rgba(255,255,255,0.1)" }}
            >
              :{formatTime(secondsLeft)}
            </motion.div>
            <div className="text-xl uppercase tracking-[0.2em] text-primary font-bold mt-4 neon-text">
              Go!
            </div>
          </div>
        </div>

        {/* Current Exercise Card */}
        <div className="bg-card border-t border-border/50 p-6 pb-12 rounded-t-3xl relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <div className="w-12 h-1 bg-border rounded-full mx-auto mb-6" />
          
          <div className="flex justify-between items-end mb-6">
            <div>
              <p className="text-muted-foreground uppercase text-xs font-bold tracking-wider mb-1">Current Move</p>
              <h2 className="text-4xl font-display font-bold text-white uppercase">{currentExercise.exerciseName}</h2>
            </div>
            <div className="text-right">
              <span className="text-4xl font-display font-bold text-primary">{currentExercise.reps}</span>
              <p className="text-muted-foreground uppercase text-xs font-bold tracking-wider">Reps</p>
            </div>
          </div>

          {/* Next Up Preview */}
          <div className="bg-black/40 rounded-xl p-4 flex items-center justify-between mb-6 border border-border/30">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1 bg-primary rounded-full" />
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold">Next Up</p>
                <p className="font-bold text-white">{nextExercise ? nextExercise.exerciseName : "Finish"}</p>
              </div>
            </div>
            {nextExercise && <span className="font-display text-xl text-muted-foreground">{nextExercise.reps}</span>}
          </div>

          {/* Controls */}
          <div className="grid grid-cols-3 gap-4">
             <Button 
              variant="outline" 
              className="h-14 border-border/50 hover:bg-secondary/50 hover:text-white"
              onClick={() => {
                setCurrentMinute(1);
                setSecondsLeft(60);
                setIsActive(false);
              }}
              data-testid="button-restart"
            >
              <RotateCcw />
            </Button>
            
            <Button 
              className={cn(
                "h-14 text-lg font-bold uppercase tracking-wider text-black hover:opacity-90 transition-all",
                isActive ? "bg-white" : "bg-primary neon-border"
              )}
              onClick={toggleTimer}
              data-testid="button-playpause"
            >
              {isActive ? <Pause className="fill-current" /> : <Play className="fill-current" />}
            </Button>
            
            <Button 
              variant="outline" 
              className="h-14 border-border/50 hover:bg-secondary/50 hover:text-white"
              onClick={() => {
                if (currentMinute < workout.durationMinutes) {
                  setCurrentMinute(m => m + 1);
                  setSecondsLeft(60);
                } else {
                  setLocation("/workout/complete");
                }
              }}
              data-testid="button-skip"
            >
              <SkipForward />
            </Button>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
