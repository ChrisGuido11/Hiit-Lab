import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Play, Calendar, TrendingUp, Flame, Clock, ArrowRight } from "lucide-react";
import MobileLayout from "@/components/layout/mobile-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  
  useEffect(() => {
    // Simulate loading user prefs
    const prefs = localStorage.getItem("emom_user_prefs");
    if (prefs) {
      setUser(JSON.parse(prefs));
    }
  }, []);

  const suggestedWorkouts = [
    { 
      title: "Leg Burner", 
      duration: "12 MIN", 
      exercises: ["Squats", "Lunges", "Box Jumps"],
      difficulty: "Hard"
    },
    { 
      title: "Core Crusher", 
      duration: "10 MIN", 
      exercises: ["Plank", "Leg Raises", "Russian Twists"],
      difficulty: "Med"
    }
  ];

  return (
    <MobileLayout>
      <div className="p-6 pb-24 space-y-8">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-muted-foreground font-medium uppercase tracking-wider text-sm">Good Morning</p>
            <h1 className="text-4xl font-bold text-white leading-none mt-1">
              READY TO <br/> 
              <span className="text-primary neon-text">SWEAT?</span>
            </h1>
          </div>
          <div className="h-12 w-12 rounded-full bg-secondary border border-border flex items-center justify-center">
            <Flame className="text-primary" />
          </div>
        </div>

        {/* Main Action Card */}
        <Card className="relative overflow-hidden border-0 group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent z-0" />
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517963879466-cd11fa9e5d34?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-20" />
          
          <div className="relative z-10 p-6 flex flex-col h-48 justify-between">
            <div className="flex justify-between items-start">
              <div className="bg-primary/20 backdrop-blur-sm px-3 py-1 rounded text-primary text-xs font-bold uppercase tracking-wider border border-primary/20">
                Daily WOD
              </div>
              <Clock className="text-muted-foreground w-5 h-5" />
            </div>
            
            <div>
              <h2 className="text-3xl font-bold text-white mb-1">THE GAUNTLET</h2>
              <p className="text-gray-300 text-sm mb-4">20 Min EMOM • Full Body • High Intensity</p>
              
              <Link href="/workout">
                <Button className="w-full bg-primary text-black hover:bg-primary/90 font-bold uppercase tracking-wider">
                  <Play className="w-4 h-4 mr-2 fill-current" /> Start Workout
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 bg-card/50 border-border/50 flex flex-col justify-between">
            <TrendingUp className="text-primary w-6 h-6 mb-3" />
            <div>
              <span className="text-3xl font-display font-bold">12</span>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Workouts</p>
            </div>
          </Card>
          <Card className="p-4 bg-card/50 border-border/50 flex flex-col justify-between">
            <Clock className="text-primary w-6 h-6 mb-3" />
            <div>
              <span className="text-3xl font-display font-bold">145</span>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Minutes</p>
            </div>
          </Card>
        </div>

        {/* Suggested Workouts */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl text-white">Recommended</h3>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary">
              VIEW ALL
            </Button>
          </div>
          
          <div className="space-y-4">
            {suggestedWorkouts.map((workout, idx) => (
              <Link key={idx} href="/workout">
                <Card className="p-4 bg-card/30 hover:bg-card/60 transition-colors border-border/50 cursor-pointer flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded bg-secondary/50 flex items-center justify-center font-display text-xl font-bold text-muted-foreground group-hover:text-primary group-hover:border group-hover:border-primary/50 transition-all">
                      {workout.title.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-lg leading-none mb-1">{workout.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {workout.duration} • {workout.exercises.length} Exercises
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="text-muted-foreground group-hover:text-primary transition-colors w-5 h-5" />
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
