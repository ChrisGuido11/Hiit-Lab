import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Play, Calendar, TrendingUp, Flame, Clock, ArrowRight, RotateCw } from "lucide-react";
import MobileLayout from "@/components/layout/mobile-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Home() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [user, authLoading, toast]);

  const { data: profile } = useQuery({
    queryKey: ["/api/profile"],
    enabled: !!user,
  });

  const { data: workout, isLoading: workoutLoading, refetch: regenerateWorkout } = useQuery({
    queryKey: ["/api/workout/generate"],
    enabled: !!profile,
    retry: false,
  });

  const { data: history = [] } = useQuery({
    queryKey: ["/api/workout/history"],
    enabled: !!user,
  });

  const totalWorkouts = history.length;
  const totalMinutes = history.reduce((sum: number, session: any) => sum + session.durationMinutes, 0);

  if (authLoading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </MobileLayout>
    );
  }

  if (!profile) {
    return (
      <MobileLayout hideNav>
        <div className="flex items-center justify-center h-full p-6 text-center">
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Welcome!</h2>
            <p className="text-muted-foreground mb-6">Complete your profile to start training</p>
            <Link href="/onboarding">
              <Button className="bg-primary text-black hover:bg-primary/90">
                Complete Onboarding
              </Button>
            </Link>
          </div>
        </div>
      </MobileLayout>
    );
  }

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

        {/* Main Action Card - Daily WOD */}
        {workoutLoading ? (
          <Card className="p-6 bg-card/50 border-border/50 h-48 flex items-center justify-center">
            <div className="text-muted-foreground">Generating workout...</div>
          </Card>
        ) : workout ? (
          <Card className="relative overflow-hidden border-0 group cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent z-0" />
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517963879466-cd11fa9e5d34?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-20" />
            
            <div className="relative z-10 p-6 flex flex-col h-52 justify-between">
              <div className="flex justify-between items-start">
                <div className="bg-primary/20 backdrop-blur-sm px-3 py-1 rounded text-primary text-xs font-bold uppercase tracking-wider border border-primary/20">
                  Daily WOD
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    regenerateWorkout();
                  }}
                  className="text-muted-foreground hover:text-primary"
                  data-testid="button-regenerate"
                >
                  <RotateCw size={16} />
                </Button>
              </div>
              
              <div>
                <h2 className="text-3xl font-bold text-white mb-1 uppercase">
                  {workout.focusLabel} EMOM
                </h2>
                <p className="text-gray-300 text-sm mb-4">
                  {workout.durationMinutes} Min • {workout.rounds.length} Exercises • {workout.difficultyTag}
                </p>
                
                <Link href="/workout">
                  <Button className="w-full bg-primary text-black hover:bg-primary/90 font-bold uppercase tracking-wider" data-testid="button-start-workout">
                    <Play className="w-4 h-4 mr-2 fill-current" /> Start Workout
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        ) : null}

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 bg-card/50 border-border/50 flex flex-col justify-between">
            <TrendingUp className="text-primary w-6 h-6 mb-3" />
            <div>
              <span className="text-3xl font-display font-bold">{totalWorkouts}</span>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Workouts</p>
            </div>
          </Card>
          <Card className="p-4 bg-card/50 border-border/50 flex flex-col justify-between">
            <Clock className="text-primary w-6 h-6 mb-3" />
            <div>
              <span className="text-3xl font-display font-bold">{totalMinutes}</span>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Minutes</p>
            </div>
          </Card>
        </div>

        {/* Recent Activity Preview */}
        {history.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl text-white">Recent Activity</h3>
              <Link href="/profile">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary">
                  VIEW ALL
                </Button>
              </Link>
            </div>
            
            <div className="space-y-3">
              {history.slice(0, 2).map((session: any) => (
                <Card key={session.id} className="p-4 bg-card/30 border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded bg-secondary/50 flex items-center justify-center font-display text-xl font-bold text-muted-foreground">
                      {session.durationMinutes}
                    </div>
                    <div>
                      <h4 className="text-lg leading-none mb-1 capitalize">{session.focusLabel} EMOM</h4>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.createdAt).toLocaleDateString()} • {session.difficultyTag}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="text-muted-foreground w-5 h-5" />
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
