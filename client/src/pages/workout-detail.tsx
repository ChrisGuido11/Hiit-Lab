import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Play, RotateCw } from "lucide-react";
import MobileLayout from "@/components/layout/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function WorkoutDetail() {
  const [, setLocation] = useLocation();

  const { data: workout, isLoading, refetch } = useQuery({
    queryKey: ["/api/workout/generate"],
  });

  if (isLoading) {
    return (
      <MobileLayout hideNav>
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </MobileLayout>
    );
  }

  if (!workout) {
    return (
      <MobileLayout hideNav>
        <div className="flex items-center justify-center h-full p-6 text-center">
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">No Workout Generated</h2>
            <Button onClick={() => setLocation("/")} className="bg-primary text-black">
              Go Home
            </Button>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout hideNav>
      <div className="h-full flex flex-col bg-black">
        {/* Header */}
        <div className="p-4 flex justify-between items-center border-b border-border/20">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} data-testid="button-back">
            <ArrowLeft />
          </Button>
          <h2 className="text-sm font-bold uppercase tracking-widest">Workout Preview</h2>
          <Button variant="ghost" size="icon" onClick={() => refetch()} data-testid="button-regenerate">
            <RotateCw size={20} />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary */}
          <div className="text-center space-y-2">
            <h1 className="text-5xl font-display font-bold text-white uppercase">{workout.focusLabel}</h1>
            <p className="text-xl text-muted-foreground">{workout.durationMinutes} Minute EMOM</p>
            <div className="inline-block px-4 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-sm font-bold uppercase">
              {workout.difficultyTag}
            </div>
          </div>

          {/* Exercise List */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Exercises</h3>
            {workout.rounds.map((round: any, idx: number) => (
              <Card key={idx} className="p-4 bg-card/40 border-border/40 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center font-display text-lg font-bold text-primary">
                    {round.minuteIndex}
                  </div>
                  <div>
                    <h4 className="font-bold text-white">{round.exerciseName}</h4>
                    <p className="text-xs text-muted-foreground capitalize">{round.targetMuscleGroup}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-display font-bold text-white">{round.reps}</span>
                  <p className="text-xs text-muted-foreground uppercase">Reps</p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="p-6 border-t border-border/20">
          <Button
            className="w-full h-14 text-lg font-bold uppercase tracking-wider bg-primary text-black hover:bg-primary/90"
            onClick={() => setLocation("/workout/runner")}
            data-testid="button-start-emom"
          >
            <Play className="w-5 h-5 mr-2 fill-current" />
            Start EMOM
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}
