import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Play, Pause, SkipForward, X, RotateCcw, CheckCircle2, Settings, ChevronRight } from "lucide-react";
import MobileLayout from "@/components/layout/mobile-layout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Mock Workout Data
const WORKOUT = {
  name: "The Gauntlet",
  totalMinutes: 5, // Short for demo
  exercises: [
    { name: "Burpees", reps: 10 },
    { name: "Kettlebell Swings", reps: 15 },
    { name: "Box Jumps", reps: 12 },
    { name: "Push-ups", reps: 20 },
    { name: "Air Squats", reps: 25 }
  ]
};

export default function Workout() {
  const [location, setLocation] = useLocation();
  const [isActive, setIsActive] = useState(false);
  const [currentMinute, setCurrentMinute] = useState(1);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [isFinished, setIsFinished] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentExercise = WORKOUT.exercises[(currentMinute - 1) % WORKOUT.exercises.length];
  const nextExercise = WORKOUT.exercises[currentMinute % WORKOUT.exercises.length];

  useEffect(() => {
    if (isActive && secondsLeft > 0) {
      timerRef.current = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    } else if (secondsLeft === 0) {
      if (currentMinute < WORKOUT.totalMinutes) {
        setCurrentMinute(m => m + 1);
        setSecondsLeft(60);
        // Play sound here
      } else {
        setIsFinished(true);
        setIsActive(false);
      }
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isActive, secondsLeft, currentMinute]);

  const toggleTimer = () => setIsActive(!isActive);

  const formatTime = (s: number) => {
    return s < 10 ? `0${s}` : s;
  };

  if (isFinished) {
    return (
      <MobileLayout hideNav>
        <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-8 bg-[#090E16]">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary shadow-[0_0_30px_rgba(204,255,0,0.3)]"
          >
            <CheckCircle2 className="w-16 h-16 text-primary" />
          </motion.div>
          
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Great Job!!</h1>
            <p className="text-muted-foreground">Successfully completed today's training</p>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full">
             <div className="p-4 rounded-[1.5rem] bg-[#121726] border border-white/5 flex flex-col items-center justify-center gap-2">
              <span className="text-3xl font-bold text-primary">{WORKOUT.totalMinutes * 15}</span>
              <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Calories</p>
            </div>
            <div className="p-4 rounded-[1.5rem] bg-[#121726] border border-white/5 flex flex-col items-center justify-center gap-2">
              <span className="text-3xl font-bold text-white">75 kg</span>
              <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Weight</p>
            </div>
          </div>

          <Button 
            className="w-full h-16 rounded-[1.5rem] text-lg font-bold bg-primary text-black hover:bg-primary/90 mt-8 shadow-[0_0_20px_rgba(204,255,0,0.3)]"
            onClick={() => setLocation("/history")}
          >
            Save Workout
          </Button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout hideNav>
      <div className="h-full flex flex-col relative bg-[#090E16]">
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="text-white hover:bg-white/10 -ml-2">
            <X />
          </Button>
          <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Round {currentMinute}/{WORKOUT.totalMinutes}
          </div>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 -mr-2">
            <Settings size={20} />
          </Button>
        </div>

        {/* Main Timer Area */}
        <div className="flex-1 flex flex-col items-center justify-center relative">
          <div className="relative z-10 text-center">
            <motion.div
              key={secondsLeft}
              initial={{ y: 10, opacity: 0.8 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-[9rem] leading-none font-bold text-white tracking-tighter tabular-nums"
            >
              :{formatTime(secondsLeft)}
            </motion.div>
            <div className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-bold tracking-widest uppercase mt-4">
              {isActive ? "In Progress" : "Paused"}
            </div>
          </div>
        </div>

        {/* Bottom Card */}
        <div className="bg-[#121726] rounded-t-[2.5rem] p-8 pb-12 relative shadow-2xl border-t border-white/5">
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                 <div className="w-2 h-2 rounded-full bg-primary" />
                 <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Current Exercise</span>
              </div>
              <h2 className="text-3xl font-bold text-white leading-tight">{currentExercise.name}</h2>
            </div>
            <div className="text-right">
              <span className="text-4xl font-bold text-primary block leading-none">{currentExercise.reps}</span>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reps</span>
            </div>
          </div>

          {/* Next Up */}
          <div className="flex items-center justify-between p-4 rounded-[1.25rem] bg-[#090E16] border border-white/5 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white font-bold">
                {currentMinute + 1}
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Up Next</p>
                <p className="font-bold text-white">{nextExercise ? nextExercise.name : "Finish"}</p>
              </div>
            </div>
            <ChevronRight className="text-muted-foreground w-5 h-5" />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-6">
             <Button 
              variant="outline" 
              size="icon"
              className="h-14 w-14 rounded-full border-white/10 hover:bg-white/5 text-white"
              onClick={() => {
                setCurrentMinute(1);
                setSecondsLeft(60);
                setIsActive(false);
              }}
            >
              <RotateCcw size={20} />
            </Button>
            
            <Button 
              className={cn(
                "h-20 w-20 rounded-full shadow-[0_0_30px_rgba(204,255,0,0.2)] transition-all",
                isActive ? "bg-white text-black hover:bg-gray-200" : "bg-primary text-black hover:bg-primary/90"
              )}
              onClick={toggleTimer}
            >
              {isActive ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
            </Button>
            
            <Button 
              variant="outline" 
              size="icon"
              className="h-14 w-14 rounded-full border-white/10 hover:bg-white/5 text-white"
              onClick={() => {
                if (currentMinute < WORKOUT.totalMinutes) {
                  setCurrentMinute(m => m + 1);
                  setSecondsLeft(60);
                } else {
                  setIsFinished(true);
                }
              }}
            >
              <SkipForward size={20} />
            </Button>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
