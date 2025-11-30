import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Play, Pause, SkipForward, X, RotateCcw, Settings } from "lucide-react";
import MobileLayout from "@/components/layout/mobile-layout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GeneratedWorkout } from "@/../../shared/schema";

export default function WorkoutRunner() {
  const [, setLocation] = useLocation();
  const [isActive, setIsActive] = useState(false);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isResting, setIsResting] = useState(false); // For Tabata work/rest phases
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: workout, isLoading, isError } = useQuery<GeneratedWorkout | null>({
    queryKey: ["/api/workout/generate"],
  });

  useEffect(() => {
    if (isLoading) return;

    if (isError || workout === null) {
      setLocation("/");
      return;
    }

    if (workout) {
      // Initialize timer based on framework
      if (workout.framework === "EMOM") {
        setSecondsLeft(60);
      } else if (workout.framework === "Tabata") {
        setSecondsLeft(workout.workSeconds || 20);
      } else if (workout.framework === "AMRAP") {
        setSecondsLeft(workout.durationMinutes * 60);
      } else if (workout.framework === "Circuit") {
        setSecondsLeft(45); // ~45 seconds per exercise
      }
    }
  }, [workout, isLoading, isError, setLocation]);

  useEffect(() => {
    if (!workout) return;

    if (isActive && secondsLeft > 0) {
      timerRef.current = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    } else if (secondsLeft === 0) {
      handleIntervalComplete();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isActive, secondsLeft, currentRoundIndex, workout, isResting]);

  const handleIntervalComplete = () => {
    if (!workout) return;

    if (workout.framework === "EMOM") {
      // EMOM: Move to next minute
      if (currentRoundIndex < workout.rounds.length - 1) {
        setCurrentRoundIndex(i => i + 1);
        setSecondsLeft(60);
      } else {
        setLocation("/workout/complete");
      }
    } else if (workout.framework === "Tabata") {
      // Tabata: Alternate between work and rest
      if (isResting) {
        // Rest complete, move to next interval
        if (currentRoundIndex < workout.rounds.length - 1) {
          setCurrentRoundIndex(i => i + 1);
          setSecondsLeft(workout.workSeconds || 20);
          setIsResting(false);
        } else {
          setLocation("/workout/complete");
        }
      } else {
        // Work complete, start rest
        setSecondsLeft(workout.restSeconds || 10);
        setIsResting(true);
      }
    } else if (workout.framework === "AMRAP") {
      // AMRAP: Time expired, workout complete
      setLocation("/workout/complete");
    } else if (workout.framework === "Circuit") {
      // Circuit: Move to next exercise or rest between rounds
      if (currentRoundIndex < workout.rounds.length - 1) {
        setCurrentRoundIndex(i => i + 1);

        // Check if we completed a full circuit (for rest periods)
        const exercisesPerRound = workout.rounds.length / (workout.totalRounds || 1);
        if ((currentRoundIndex + 1) % exercisesPerRound === 0 && currentRoundIndex < workout.rounds.length - 1) {
          // Rest between rounds
          setSecondsLeft(workout.restSeconds || 60);
          setIsResting(true);
        } else {
          setSecondsLeft(45);
          setIsResting(false);
        }
      } else {
        setLocation("/workout/complete");
      }
    }
  };

  if (isLoading || workout === undefined) {
    return (
      <MobileLayout hideNav>
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </MobileLayout>
    );
  }

  if (isError || workout === null) return null;

  const currentExercise = workout.rounds[currentRoundIndex];
  const nextExercise = workout.rounds[currentRoundIndex + 1] || null;

  const toggleTimer = () => setIsActive(!isActive);

  const formatTime = (s: number) => {
    if (workout.framework === "AMRAP") {
      // Show minutes:seconds for AMRAP countdown
      const mins = Math.floor(s / 60);
      const secs = s % 60;
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return s < 10 ? `0${s}` : s;
  };

  const getProgressText = () => {
    if (workout.framework === "EMOM") {
      return `Round ${currentRoundIndex + 1}/${workout.rounds.length}`;
    } else if (workout.framework === "Tabata") {
      const intervalsPerExercise = workout.sets || 8;
      const totalExercises = Math.ceil(workout.rounds.length / intervalsPerExercise);
      const exerciseIndex = Math.floor(currentRoundIndex / intervalsPerExercise) + 1;
      const intervalInExercise = (currentRoundIndex % intervalsPerExercise) + 1;
      return `Exercise ${exerciseIndex}/${totalExercises} • Interval ${intervalInExercise}/${intervalsPerExercise}`;
    } else if (workout.framework === "AMRAP") {
      return `AMRAP • ${workout.durationMinutes} min`;
    } else if (workout.framework === "Circuit") {
      const exercisesPerRound = workout.rounds.length / (workout.totalRounds || 1);
      const currentRound = Math.floor(currentRoundIndex / exercisesPerRound) + 1;
      return `Round ${currentRound}/${workout.totalRounds || 1}`;
    }
    return "";
  };

  const getTimerLabel = () => {
    if (workout.framework === "Tabata") {
      return isResting ? "Rest" : "Go!";
    } else if (workout.framework === "AMRAP") {
      return "Time Left";
    } else if (workout.framework === "Circuit" && isResting) {
      return "Rest";
    }
    return "Go!";
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
            {getProgressText()}
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
              {workout.framework === "AMRAP" ? formatTime(secondsLeft) : `:${formatTime(secondsLeft)}`}
            </motion.div>
            <div className={cn(
              "text-xl uppercase tracking-[0.2em] font-bold mt-4 neon-text",
              isResting ? "text-yellow-500" : "text-primary"
            )}>
              {getTimerLabel()}
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
              {workout.framework === "Tabata" ? (
                <>
                  <span className="text-4xl font-display font-bold text-primary">
                    {secondsLeft}s
                  </span>
                  <p className="text-muted-foreground uppercase text-xs font-bold tracking-wider">
                    {isResting ? "Rest Interval" : "Work Interval"}
                  </p>
                  {currentExercise.reps ? (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Target ~{currentExercise.reps} reps
                    </p>
                  ) : null}
                </>
              ) : (
                <>
                  <span className="text-4xl font-display font-bold text-primary">
                    {currentExercise.reps}
                  </span>
                  <p className="text-muted-foreground uppercase text-xs font-bold tracking-wider">
                    Reps
                  </p>
                </>
              )}
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
            {nextExercise && (
              <span className="font-display text-xl text-muted-foreground">
                {workout.framework === "Tabata"
                  ? `${workout.workSeconds ?? 20}s`
                  : `${nextExercise.reps} reps`}
              </span>
            )}
          </div>

          {/* Controls */}
          <div className="grid grid-cols-3 gap-4">
             <Button
              variant="outline"
              className="h-14 border-border/50 hover:bg-secondary/50 hover:text-white"
              onClick={() => {
                setCurrentRoundIndex(0);
                setIsActive(false);
                setIsResting(false);

                // Reset timer based on framework
                if (workout.framework === "EMOM") {
                  setSecondsLeft(60);
                } else if (workout.framework === "Tabata") {
                  setSecondsLeft(workout.workSeconds || 20);
                } else if (workout.framework === "AMRAP") {
                  setSecondsLeft(workout.durationMinutes * 60);
                } else if (workout.framework === "Circuit") {
                  setSecondsLeft(45);
                }
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
                if (workout.framework === "AMRAP") {
                  // For AMRAP, just complete the workout
                  setLocation("/workout/complete");
                } else if (currentRoundIndex < workout.rounds.length - 1) {
                  setCurrentRoundIndex(i => i + 1);
                  setIsResting(false);

                  // Reset timer based on framework
                  if (workout.framework === "EMOM") {
                    setSecondsLeft(60);
                  } else if (workout.framework === "Tabata") {
                    setSecondsLeft(workout.workSeconds || 20);
                  } else if (workout.framework === "Circuit") {
                    setSecondsLeft(45);
                  }
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
