import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import MobileLayout from "@/components/layout/mobile-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Trash2, Edit, TrendingUp, Clock, Calendar, Award, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

/**
 * Equipment display mapping for backward compatibility
 * Handles both old and new equipment formats and returns user-friendly labels
 */
const EQUIPMENT_DISPLAY_MAP: Record<string, string> = {
  // Old format
  "None (Bodyweight)": "Bodyweight",
  "Dumbbells": "Dumbbells",
  "Kettlebell": "Kettlebells",
  "Pull-up Bar": "Pull-Up Bar",
  "Jump Rope": "Jump Rope",
  "Box": "Step/Box",
  // New format
  "bodyweight": "Bodyweight",
  "dumbbells": "Dumbbells",
  "kettlebells": "Kettlebells",
  "resistance_bands": "Resistance Bands",
  "barbell": "Barbell",
  "pull_up_bar": "Pull-Up Bar",
  "bench": "Bench",
  "medicine_ball": "Medicine Ball",
  "jump_rope": "Jump Rope",
  "treadmill": "Treadmill",
  "stationary_bike": "Stationary Bike",
  "rower": "Rower",
  "elliptical": "Elliptical",
  "sliders": "Sliders",
  "step_or_box": "Step/Box",
  "weight_machines": "Weight Machines",
};

function getEquipmentLabel(key: string): string {
  return EQUIPMENT_DISPLAY_MAP[key] || key;
}

export default function Profile() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);

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

  const { data: history = [] } = useQuery({
    queryKey: ["/api/workout/history"],
    enabled: !!user,
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/deleteAccount", {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete account");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Account deleted", description: "Your account has been permanently deleted." });
      setTimeout(() => window.location.href = "/", 500);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const handleDeleteAccount = () => {
    if (confirm("Are you sure? This will permanently delete your account and all workout data.")) {
      deleteAccountMutation.mutate();
    }
  };

  if (authLoading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </MobileLayout>
    );
  }

  const totalWorkouts = history.length;
  const totalMinutes = history.reduce((sum: number, session: any) => sum + session.durationMinutes, 0);
  const currentStreak = 3; // Mock for now

  return (
    <MobileLayout>
      <div className="p-6 pb-24 space-y-6">
        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary">
            {user?.profileImageUrl ? (
              <img src={user.profileImageUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-2xl font-display font-bold text-primary">
                {user?.firstName?.charAt(0) || user?.email?.charAt(0) || "U"}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {profile?.displayName || user?.firstName || "Athlete"}
            </h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 bg-primary/10 border-primary/20 text-center">
            <span className="text-3xl font-display font-bold text-primary">{totalWorkouts}</span>
            <p className="text-xs uppercase font-bold tracking-wider text-muted-foreground mt-1">Workouts</p>
          </Card>
          <Card className="p-4 bg-card/50 border-border/50 text-center">
            <span className="text-3xl font-display font-bold text-white">{totalMinutes}</span>
            <p className="text-xs uppercase font-bold tracking-wider text-muted-foreground mt-1">Minutes</p>
          </Card>
          <Card className="p-4 bg-card/50 border-border/50 text-center">
            <span className="text-3xl font-display font-bold text-white">{profile?.skillScore || 50}</span>
            <p className="text-xs uppercase font-bold tracking-wider text-muted-foreground mt-1">Skill</p>
          </Card>
        </div>

        {/* Fitness Profile */}
        {profile && (
          <Card className="p-5 bg-card/40 border-border/40">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Training Profile</h2>
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                <Edit size={16} />
              </Button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Level</span>
                <span className="font-bold text-white">{profile.fitnessLevel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Goal</span>
                <span className="font-bold text-white capitalize">{profile.goalFocus}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-muted-foreground">Equipment</span>
                <span className="font-bold text-white text-right max-w-[60%]">
                  {(profile.equipment as string[]).map(getEquipmentLabel).join(", ")}
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Workout History */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4">Recent Workouts</h2>
          {history.length === 0 ? (
            <Card className="p-6 bg-card/40 border-border/40 text-center">
              <p className="text-muted-foreground">No workouts yet. Start your first session!</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {history.slice(0, 5).map((session: any) => (
                <Card key={session.id} className="p-4 bg-card/40 border-border/40 flex items-center justify-between">
                  <div className="flex gap-4 items-center">
                    <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center">
                      <Award className="text-muted-foreground w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white capitalize">{session.focusLabel} HIIT</h3>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.createdAt).toLocaleDateString()} • {session.durationMinutes} min
                      </p>
                    </div>
                  </div>
                  <div className="px-2 py-1 rounded bg-white/5 border border-white/10 text-xs font-bold uppercase text-gray-300">
                    {session.difficultyTag}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Account Actions */}
        <div className="space-y-3 pt-4">
          <Button
            variant="outline"
            className="w-full justify-between border-border/50 hover:bg-secondary/50 hover:text-white"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <span className="flex items-center gap-2">
              <LogOut size={18} />
              Log Out
            </span>
            <ChevronRight size={18} />
          </Button>
          <Button
            variant="outline"
            className="w-full justify-between border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleDeleteAccount}
            data-testid="button-delete-account"
          >
            <span className="flex items-center gap-2">
              <Trash2 size={18} />
              Delete Account
            </span>
            <ChevronRight size={18} />
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}
