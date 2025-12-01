import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Play, Pause, SkipForward, X, RotateCcw, Settings } from "lucide-react";
import MobileLayout from "@/components/layout/mobile-layout";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { GeneratedWorkout } from "@/../../shared/schema";

type RunnerSettings = {
  soundCues: boolean;
  voiceCues: boolean;
  preStartCountdown: boolean;
  restAutoSkip: boolean;
  intervalVibration: boolean;
};

export default function WorkoutRunner() {
  const [, setLocation] = useLocation();
  const [isActive, setIsActive] = useState(false);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isResting, setIsResting] = useState(false); // For Tabata work/rest phases
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [wasActiveBeforeSettings, setWasActiveBeforeSettings] = useState(false);
  const [isPrestartCountdown, setIsPrestartCountdown] = useState(false);
  const [prestartSecondsLeft, setPrestartSecondsLeft] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const prestartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const previousActiveRef = useRef(false);
  const lastBeepSecondRef = useRef<number | null>(null);
  const hasAnnouncedFirstRoundRef = useRef(false);
  const SETTINGS_KEY = "workout-runner-settings";
  const [settings, setSettings] = useState<RunnerSettings>({
    soundCues: true,
    voiceCues: true,
    preStartCountdown: true,
    restAutoSkip: false,
    intervalVibration: true,
  });

  const { data: workout, isLoading, isError } = useQuery<GeneratedWorkout | null>({
    queryKey: ["/api/workout/generate"],
  });

  const goToWorkoutComplete = () => {
    setLocation("/workout/complete", { state: workout });
  };

  const ensureAudioContext = () => {
    if (typeof window === "undefined") return null;

    const AudioContextConstructor =
      window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextConstructor) return null;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextConstructor();
    }

    if (audioContextRef.current.state === "suspended") {
      void audioContextRef.current.resume();
    }

    return audioContextRef.current;
  };

  const playBeep = (frequency = 880, duration = 180, volume = 0.2) => {
    if (!settings.soundCues) return;

    const ctx = ensureAudioContext();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.value = volume;

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + duration / 1000);
  };

  const playChime = () => {
    playBeep(660, 160, 0.18);
    setTimeout(() => playBeep(880, 200, 0.18), 120);
  };

  const speakCue = (message: string) => {
    if (!settings.voiceCues || typeof window === "undefined") return;

    const synth = window.speechSynthesis;
    if (!synth) return;

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    // Add small delay to let beep finish before speech starts
    setTimeout(() => {
      synth.cancel();
      synth.speak(utterance);
    }, 200);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error("Failed to parse workout settings", error);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

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

    if (isPrestartCountdown) {
      if (prestartSecondsLeft > 0) {
        prestartTimerRef.current = setTimeout(() => setPrestartSecondsLeft(s => s - 1), 1000);
      } else {
        setIsPrestartCountdown(false);
        setIsActive(true);
      }
    }
    return () => {
      if (prestartTimerRef.current) clearTimeout(prestartTimerRef.current);
    };
  }, [isPrestartCountdown, prestartSecondsLeft, workout]);

  useEffect(() => {
    if (!workout) return;

    if (isActive && !isPrestartCountdown) {
      if (secondsLeft > 0) {
        timerRef.current = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
      } else if (secondsLeft === 0) {
        handleIntervalComplete();
      }
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isActive, secondsLeft, currentRoundIndex, workout, isResting, isPrestartCountdown]);

  useEffect(() => {
    if (!settings.soundCues || !isActive || isPrestartCountdown) return;
    if (secondsLeft > 0 && secondsLeft <= 3) {
      if (lastBeepSecondRef.current !== secondsLeft) {
        playBeep();
        lastBeepSecondRef.current = secondsLeft;
      }
    }
  }, [secondsLeft, isActive, settings.soundCues, isPrestartCountdown]);

  useEffect(() => {
    if (isPrestartCountdown && prestartSecondsLeft > 0 && settings.soundCues) {
      playBeep();
    }
  }, [isPrestartCountdown, prestartSecondsLeft, settings.soundCues]);

  useEffect(() => {
    lastBeepSecondRef.current = null;
  }, [currentRoundIndex, isResting, settings.restAutoSkip]);

  // Announce first exercise when timer starts (after prestart countdown ends)
  useEffect(() => {
    if (!workout || !isActive || isPrestartCountdown || currentRoundIndex !== 0) return;
    if (!hasAnnouncedFirstRoundRef.current) {
      // Small delay to ensure prestart countdown has fully finished
      const announceTimer = setTimeout(() => {
        const currentRound = workout.rounds[0];
        triggerIntervalCues(`${currentRound.exerciseName}, ${currentRound.reps} reps`);
        hasAnnouncedFirstRoundRef.current = true;
      }, 100);
      return () => clearTimeout(announceTimer);
    }
  }, [isActive, isPrestartCountdown, workout, currentRoundIndex]);

  const vibrate = (duration = 150) => {
    if (!settings.intervalVibration || typeof navigator === "undefined") return;
    if (navigator.vibrate) {
      navigator.vibrate(duration);
    }
  };

  const triggerIntervalCues = (message?: string) => {
    if (settings.soundCues) {
      playBeep();
    }
    if (message) {
      speakCue(message);
    }
    vibrate();
  };

  const handleIntervalComplete = () => {
    if (!workout) return;

    if (workout.framework === "EMOM") {
      // EMOM: Move to next minute
      if (currentRoundIndex < workout.rounds.length - 1) {
        const nextRound = workout.rounds[currentRoundIndex + 1];
        setCurrentRoundIndex(i => i + 1);
        setSecondsLeft(60);
        triggerIntervalCues(`${nextRound.exerciseName}, ${nextRound.reps} reps`);
      } else {
        goToWorkoutComplete();
      }
    } else if (workout.framework === "Tabata") {
      // Tabata: Alternate between work and rest
      if (isResting) {
        // Rest complete, move to next interval
        if (currentRoundIndex < workout.rounds.length - 1) {
          const nextRound = workout.rounds[currentRoundIndex + 1];
          setCurrentRoundIndex(i => i + 1);
          setSecondsLeft(workout.workSeconds || 20);
          setIsResting(false);
          triggerIntervalCues(`${nextRound.exerciseName}, ${nextRound.reps} reps`);
        } else {
          goToWorkoutComplete();
        }
      } else {
        // Work complete, start rest
        if (settings.restAutoSkip) {
          if (currentRoundIndex < workout.rounds.length - 1) {
            const nextRound = workout.rounds[currentRoundIndex + 1];
            setCurrentRoundIndex(i => i + 1);
            setSecondsLeft(workout.workSeconds || 20);
            setIsResting(false);
            triggerIntervalCues(`Skipping rest, ${nextRound.exerciseName}, ${nextRound.reps} reps`);
          } else {
            goToWorkoutComplete();
          }
        } else {
          setSecondsLeft(workout.restSeconds || 10);
          setIsResting(true);
          triggerIntervalCues("Rest");
        }
      }
    } else if (workout.framework === "AMRAP") {
      // AMRAP: Time expired, workout complete
      goToWorkoutComplete();
    } else if (workout.framework === "Circuit") {
      // Circuit: Move to next exercise or rest between rounds
      if (currentRoundIndex < workout.rounds.length - 1) {
        const nextRound = workout.rounds[currentRoundIndex + 1];
        setCurrentRoundIndex(i => i + 1);

        // Check if we completed a full circuit (for rest periods)
        const exercisesPerRound = workout.rounds.length / (workout.totalRounds || 1);
        if ((currentRoundIndex + 1) % exercisesPerRound === 0 && currentRoundIndex < workout.rounds.length - 1) {
          // Rest between rounds
          if (settings.restAutoSkip) {
            setSecondsLeft(45);
            setIsResting(false);
            triggerIntervalCues("Next round");
          } else {
            setSecondsLeft(workout.restSeconds || 60);
            setIsResting(true);
            triggerIntervalCues("Round rest");
          }
        } else {
          setSecondsLeft(45);
          setIsResting(false);
          triggerIntervalCues(`${nextRound.exerciseName}, ${nextRound.reps} reps`);
        }
      } else {
        goToWorkoutComplete();
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

  const toggleTimer = () => {
    if (isActive || isPrestartCountdown) {
      setIsActive(false);
      setIsPrestartCountdown(false);
      setPrestartSecondsLeft(0);
      return;
    }

    if (settings.preStartCountdown && secondsLeft > 0) {
      hasAnnouncedFirstRoundRef.current = false; // Reset for this new start
      setPrestartSecondsLeft(3);
      setIsPrestartCountdown(true);
    } else {
      hasAnnouncedFirstRoundRef.current = false; // Reset for this new start
      setIsActive(true);
    }
  };

  const handleSettingsOpenChange = (open: boolean) => {
    if (open) {
      setWasActiveBeforeSettings(isActive);
      setIsActive(false);
    }
    if (!open) {
      setPrestartSecondsLeft(0);
      setIsPrestartCountdown(false);
    }
    if (!open && wasActiveBeforeSettings) {
      setIsActive(true);
    }
    setIsSettingsOpen(open);
  };

  const formatTime = (s: number) => {
    if (workout.framework === "AMRAP") {
      // Show minutes:seconds for AMRAP countdown
      const mins = Math.floor(s / 60);
      const secs = s % 60;
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return s < 10 ? `0${s}` : s;
  };

  useEffect(() => {
    if (!workout || isPrestartCountdown) return;

    if (isActive && !previousActiveRef.current) {
      playChime();
      speakCue(`Starting ${workout.rounds[currentRoundIndex]?.exerciseName ?? "work"}`);
    } else if (!isActive && previousActiveRef.current) {
      playBeep(420, 150, 0.18);
      speakCue("Paused");
    }

    previousActiveRef.current = isActive;
  }, [isActive, workout, currentRoundIndex, isPrestartCountdown]);

  useEffect(() => {
    if (!workout || !isActive || isPrestartCountdown) {
      return;
    }

    if (workout.framework === "AMRAP" && secondsLeft === 60) {
      playChime();
      speakCue("Final minute. Empty the tank.");
    }
  }, [secondsLeft, isActive, workout, isPrestartCountdown]);

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
    if (isPrestartCountdown) {
      return "Get Ready";
    }
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
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-white"
            onClick={() => handleSettingsOpenChange(true)}
          >
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
              key={`${secondsLeft}-${prestartSecondsLeft}-${isPrestartCountdown}`}
              initial={{ y: 10, opacity: 0.8 }}
              animate={{ y: 0, opacity: 1 }}
              className="font-display text-[12rem] leading-none font-bold text-white tracking-tighter tabular-nums"
              style={{ textShadow: "0 0 40px rgba(255,255,255,0.1)" }}
            >
              {isPrestartCountdown
                ? `:${formatTime(prestartSecondsLeft)}`
                : workout.framework === "AMRAP"
                ? formatTime(secondsLeft)
                : `:${formatTime(secondsLeft)}`}
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
                setIsPrestartCountdown(false);
                setPrestartSecondsLeft(0);

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
                  goToWorkoutComplete();
                } else if (currentRoundIndex < workout.rounds.length - 1) {
                  const nextRound = workout.rounds[currentRoundIndex + 1];
                  setCurrentRoundIndex(i => i + 1);
                  setIsResting(false);
                  setIsPrestartCountdown(false);
                  setPrestartSecondsLeft(0);

                  // Reset timer based on framework
                  if (workout.framework === "EMOM") {
                    setSecondsLeft(60);
                  } else if (workout.framework === "Tabata") {
                    setSecondsLeft(workout.workSeconds || 20);
                  } else if (workout.framework === "Circuit") {
                    setSecondsLeft(45);
                  }
                  
                  // Announce the next exercise
                  triggerIntervalCues(`${nextRound.exerciseName}, ${nextRound.reps} reps`);
                } else {
                  goToWorkoutComplete();
                }
              }}
              data-testid="button-skip"
            >
              <SkipForward />
            </Button>
          </div>
        </div>
        <Sheet open={isSettingsOpen} onOpenChange={handleSettingsOpenChange}>
          <SheetContent
            side="bottom"
            className="bg-card border-border/50 sm:max-w-md sm:rounded-t-3xl"
          >
            <SheetHeader className="mb-4">
              <SheetTitle>Workout Settings</SheetTitle>
              <SheetDescription>
                Adjust how the timer, sounds, and display behave during your session.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/10 p-4">
                <div>
                  <Label htmlFor="setting-sound-cues" className="text-base">Sound cues</Label>
                  <p className="text-sm text-muted-foreground">Play countdown beeps before intervals change.</p>
                </div>
                <Switch
                  id="setting-sound-cues"
                  checked={settings.soundCues}
                  onCheckedChange={checked => setSettings(prev => ({ ...prev, soundCues: checked }))}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/10 p-4">
                <div>
                  <Label htmlFor="setting-voice-cues" className="text-base">Voice cues</Label>
                  <p className="text-sm text-muted-foreground">Announce phase changes like rest or next round.</p>
                </div>
                <Switch
                  id="setting-voice-cues"
                  checked={settings.voiceCues}
                  onCheckedChange={checked => setSettings(prev => ({ ...prev, voiceCues: checked }))}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/10 p-4">
                <div>
                  <Label htmlFor="setting-prestart" className="text-base">Pre-start countdown</Label>
                  <p className="text-sm text-muted-foreground">Add a 3-second buffer before the timer begins.</p>
                </div>
                <Switch
                  id="setting-prestart"
                  checked={settings.preStartCountdown}
                  onCheckedChange={checked => setSettings(prev => ({ ...prev, preStartCountdown: checked }))}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/10 p-4">
                <div>
                  <Label htmlFor="setting-auto-skip" className="text-base">Auto-skip rest</Label>
                  <p className="text-sm text-muted-foreground">Jump straight to the next interval when rest starts.</p>
                </div>
                <Switch
                  id="setting-auto-skip"
                  checked={settings.restAutoSkip}
                  onCheckedChange={checked => setSettings(prev => ({ ...prev, restAutoSkip: checked }))}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/10 p-4">
                <div>
                  <Label htmlFor="setting-vibration" className="text-base">Interval vibration</Label>
                  <p className="text-sm text-muted-foreground">Feel haptics when phases change.</p>
                </div>
                <Switch
                  id="setting-vibration"
                  checked={settings.intervalVibration}
                  onCheckedChange={checked => setSettings(prev => ({ ...prev, intervalVibration: checked }))}
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </MobileLayout>
  );
}
