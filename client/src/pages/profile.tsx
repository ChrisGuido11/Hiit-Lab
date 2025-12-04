// CHANGE SUMMARY (2025-11-29):
// - Added equipment editing dialog using EquipmentSelector component.
// - Updated to use centralized getEquipmentLabel from shared/equipment.
// - Persists equipment changes to PostgreSQL via PATCH /api/profile endpoint.
// - Ensures consistent equipment UX across onboarding and settings.
// - Added goal viewing and editing with primary/secondary goal support.
// - Displays user's training goals with visual badges and allows inline editing.

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { supabase } from "@/lib/supabase";
import MobileLayout from "@/components/layout/mobile-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  LogOut,
  Trash2,
  Edit,
  TrendingUp,
  Clock,
  Calendar,
  Award,
  ChevronRight,
  Activity,
  Dumbbell,
  Flame,
  Target,
  Heart,
  Zap,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { EquipmentSelector } from "@/components/equipment-selector";
import { getEquipmentLabel, normalizeEquipment, migrateEquipment, type EquipmentId } from "@shared/equipment";
import { PRIMARY_GOALS, buildGoalWeights, type PrimaryGoalId } from "@shared/goals";
import type { Profile as ProfileModel, WorkoutRound, WorkoutSession } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";

// Icon mapping for goals
const GOAL_ICONS = {
  activity: Activity,
  dumbbell: Dumbbell,
  flame: Flame,
  target: Target,
  'trending-up': TrendingUp,
  heart: Heart,
  zap: Zap,
};

export default function Profile() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditEquipmentOpen, setIsEditEquipmentOpen] = useState(false);
  const [isEditGoalsOpen, setIsEditGoalsOpen] = useState(false);
  const [isEditLevelOpen, setIsEditLevelOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<EquipmentId[]>([]);
  const [editingPrimaryGoal, setEditingPrimaryGoal] = useState<PrimaryGoalId | null>(null);
  const [editingSecondaryGoals, setEditingSecondaryGoals] = useState<PrimaryGoalId[]>([]);
  const [editingLevel, setEditingLevel] = useState<"Beginner" | "Intermediate" | "Advanced">("Beginner");

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Unauthorized",
        description: "Please log in to continue.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/landing";
      }, 500);
    }
  }, [user, authLoading, toast]);

  const { data: localUser } = useQuery<any>({
    queryKey: ["/api/auth/user"],
    enabled: !!user,
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: profile } = useQuery<ProfileModel | null>({
    queryKey: ["/api/profile"],
    enabled: !!user,
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: history = [] } = useQuery<Array<WorkoutSession & { rounds: WorkoutRound[] }>>({
    queryKey: ["/api/workout/history"],
    enabled: !!user,
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: personalRecords = [] } = useQuery<any[]>({
    queryKey: ["/api/personal-records"],
    enabled: !!user,
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: mastery = [] } = useQuery<any[]>({
    queryKey: ["/api/mastery"],
    enabled: !!user,
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: recovery = {} } = useQuery<Record<string, number>>({
    queryKey: ["/api/recovery"],
    enabled: !!user,
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: {
      equipment?: EquipmentId[];
      primaryGoal?: PrimaryGoalId | null;
      secondaryGoals?: PrimaryGoalId[];
      goalWeights?: Record<PrimaryGoalId, number>;
      skillScore?: number;
      fitnessLevel?: string;
    }) => {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update profile");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      let message = "Profile updated.";
      if (variables.equipment) message = "Your equipment preferences have been saved.";
      else if (variables.primaryGoal) message = "Your training goals have been updated.";
      else if (variables.skillScore !== undefined) message = "Your training level has been updated.";
      toast({ title: "Profile Updated", description: message });
      setIsEditEquipmentOpen(false);
      setIsEditGoalsOpen(false);
      setIsEditLevelOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/landing";
  };

  const handleDeleteAccount = () => {
    if (confirm("Are you sure? This will permanently delete your account and all workout data.")) {
      deleteAccountMutation.mutate();
    }
  };

  const handleEditEquipment = () => {
    if (profile?.equipment) {
      // Migrate and normalize existing equipment
      const migrated = migrateEquipment(profile.equipment as string[]);
      setEditingEquipment(migrated);
      setIsEditEquipmentOpen(true);
    }
  };

  const handleSaveEquipment = () => {
    const normalized = normalizeEquipment(editingEquipment);
    updateProfileMutation.mutate({ equipment: normalized });
  };

  const handleEditGoals = () => {
    setEditingPrimaryGoal(profile?.primaryGoal ?? null);
    setEditingSecondaryGoals(profile?.secondaryGoals ?? []);
    setIsEditGoalsOpen(true);
  };

  const handleGoalSelect = (goalId: PrimaryGoalId) => {
    if (editingPrimaryGoal === goalId) {
      // Deselect primary
      setEditingPrimaryGoal(null);
      setEditingSecondaryGoals(prev => prev.filter(g => g !== goalId));
      return;
    }

    if (editingSecondaryGoals.includes(goalId)) {
      // Promote to primary
      setEditingPrimaryGoal(goalId);
      setEditingSecondaryGoals(prev =>
        editingPrimaryGoal ? [editingPrimaryGoal, ...prev.filter(g => g !== goalId)] : prev.filter(g => g !== goalId)
      );
      return;
    }

    // New selection: set as primary, demote old primary to secondary
    const newSecondaryGoals = editingPrimaryGoal
      ? [editingPrimaryGoal, ...editingSecondaryGoals].slice(0, 2)
      : editingSecondaryGoals;

    setEditingPrimaryGoal(goalId);
    setEditingSecondaryGoals(newSecondaryGoals);
  };

  const handleSaveGoals = () => {
    if (!editingPrimaryGoal) {
      toast({
        title: "Goal Required",
        description: "Choose at least one primary goal.",
        variant: "destructive"
      });
      return;
    }

    const goalWeights = buildGoalWeights(editingPrimaryGoal, editingSecondaryGoals);

    updateProfileMutation.mutate({
      primaryGoal: editingPrimaryGoal,
      secondaryGoals: editingSecondaryGoals,
      goalWeights,
    });
  };

  const getLevelSkillScore = (level: "Beginner" | "Intermediate" | "Advanced"): number => {
    switch (level) {
      case "Beginner":
        return 17; // Mid-point of 0-35
      case "Intermediate":
        return 53; // Mid-point of 36-70
      case "Advanced":
        return 85; // Mid-point of 71-100
    }
  };

  const handleEditLevel = () => {
    const currentLevel = profile?.fitnessLevel || "Beginner";
    setEditingLevel(currentLevel as "Beginner" | "Intermediate" | "Advanced");
    setIsEditLevelOpen(true);
  };

  const handleSaveLevel = () => {
    const newSkillScore = getLevelSkillScore(editingLevel);
    updateProfileMutation.mutate({ 
      skillScore: newSkillScore,
      fitnessLevel: editingLevel 
    });
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
    const totalMinutes = history.reduce(
      (sum, session) => sum + (session?.durationMinutes ?? 0),
      0,
    );
  const currentStreak = 3; // Mock for now

  return (
    <MobileLayout>
      <div className="p-6 pb-24 space-y-6">
        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary">
            {localUser?.profileImageUrl ? (
              <img src={localUser.profileImageUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-2xl font-display font-bold text-primary">
                {localUser?.firstName?.charAt(0) || localUser?.email?.charAt(0) || "U"}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {profile?.displayName || localUser?.firstName || "Athlete"}
            </h1>
            <p className="text-sm text-muted-foreground">{localUser?.email}</p>
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
            <h2 className="text-lg font-bold text-white mb-4">Training Profile</h2>

            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Level</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{profile.fitnessLevel}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-primary hover:text-primary/80"
                    onClick={handleEditLevel}
                    data-testid="button-edit-level"
                  >
                    <Edit size={14} />
                  </Button>
                </div>
              </div>

              {/* Goals Section */}
              <div className="border-t border-border/50 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-muted-foreground">Training Goals</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-primary hover:text-primary/80"
                    onClick={handleEditGoals}
                  >
                    <Edit size={14} />
                  </Button>
                </div>

                {profile.primaryGoal ? (
                  <div className="space-y-2">
                    {(() => {
                      const primaryConfig = PRIMARY_GOALS.find(g => g.id === profile.primaryGoal);
                      const PrimaryIcon = primaryConfig ? GOAL_ICONS[primaryConfig.iconName] : Target;
                      return (
                        <div className="flex items-center gap-2">
                          <PrimaryIcon className="text-primary flex-shrink-0" size={16} />
                          <span className="font-bold text-white flex-1">{primaryConfig?.label || 'General Fitness'}</span>
                          <span className="px-2 py-0.5 text-xs font-bold uppercase bg-primary/20 text-primary rounded">
                            Primary
                          </span>
                        </div>
                      );
                    })()}

                    {profile.secondaryGoals && profile.secondaryGoals.length > 0 && (
                      <div className="pl-6 space-y-1.5">
                        {profile.secondaryGoals.map((goalId) => {
                          const goalConfig = PRIMARY_GOALS.find(g => g.id === goalId);
                          const SecondaryIcon = goalConfig ? GOAL_ICONS[goalConfig.iconName] : Target;
                          return (
                            <div key={goalId} className="flex items-center gap-2 text-xs">
                              <SecondaryIcon className="text-primary/70 flex-shrink-0" size={14} />
                              <span className="text-muted-foreground">{goalConfig?.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No goals set</p>
                )}
              </div>

              {/* Equipment Section */}
              <div className="border-t border-border/50 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">Equipment</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-primary hover:text-primary/80"
                    onClick={handleEditEquipment}
                  >
                    <Edit size={14} />
                  </Button>
                </div>
                <p className="font-bold text-white text-sm">
                  {migrateEquipment(profile.equipment as string[]).map(getEquipmentLabel).join(", ")}
                </p>
              </div>
            </div>

            {/* Equipment Edit Dialog */}
            <Dialog open={isEditEquipmentOpen} onOpenChange={setIsEditEquipmentOpen}>
              <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Equipment</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <EquipmentSelector
                    value={editingEquipment}
                    onChange={setEditingEquipment}
                    mode="settings"
                  />
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditEquipmentOpen(false)}
                    disabled={updateProfileMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveEquipment}
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Level Edit Dialog */}
            <Dialog open={isEditLevelOpen} onOpenChange={setIsEditLevelOpen}>
              <DialogContent className="max-w-[90vw]">
                <DialogHeader>
                  <DialogTitle>Change Training Level</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-3">
                  {(["Beginner", "Intermediate", "Advanced"] as const).map((level) => (
                    <Card
                      key={level}
                      className={cn(
                        "p-4 border-2 cursor-pointer transition-all duration-200",
                        editingLevel === level && "border-primary bg-primary/10",
                        editingLevel !== level && "border-border/50 bg-card/50 hover:border-primary/50"
                      )}
                      onClick={() => setEditingLevel(level)}
                      data-testid={`button-level-${level.toLowerCase()}`}
                    >
                      <div className="font-bold text-white text-center">{level}</div>
                      <div className="text-xs text-muted-foreground text-center mt-1">
                        {level === "Beginner" && "Skill Score: 0-35"}
                        {level === "Intermediate" && "Skill Score: 36-70"}
                        {level === "Advanced" && "Skill Score: 71-100"}
                      </div>
                    </Card>
                  ))}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditLevelOpen(false)}
                    disabled={updateProfileMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveLevel}
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Goals Edit Dialog */}
            <Dialog open={isEditGoalsOpen} onOpenChange={setIsEditGoalsOpen}>
              <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Training Goals</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto">
                  {PRIMARY_GOALS.map((goal) => {
                    const Icon = GOAL_ICONS[goal.iconName];
                    const isPrimary = editingPrimaryGoal === goal.id;
                    const isSecondary = editingSecondaryGoals.includes(goal.id);

                    return (
                      <Card
                        key={goal.id}
                        className={cn(
                          "p-3 border-2 cursor-pointer transition-all duration-200",
                          isPrimary && "border-primary bg-primary/10",
                          isSecondary && "border-primary/60 bg-primary/5",
                          !isPrimary && !isSecondary && "border-border/50 bg-card/50 hover:border-primary/50"
                        )}
                        onClick={() => handleGoalSelect(goal.id)}
                      >
                        <div className="flex items-start gap-3">
                          <Icon
                            className={cn(
                              "mt-0.5 flex-shrink-0",
                              isPrimary && "text-primary",
                              isSecondary && "text-primary/70",
                              !isPrimary && !isSecondary && "text-muted-foreground"
                            )}
                            size={20}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-sm">{goal.label}</span>
                              {isPrimary && (
                                <span className="px-1.5 py-0.5 text-xs font-bold uppercase bg-primary/20 text-primary rounded">
                                  Primary
                                </span>
                              )}
                              {isSecondary && (
                                <span className="px-1.5 py-0.5 text-xs font-bold uppercase bg-primary/10 text-primary/70 rounded">
                                  Secondary
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{goal.subtitle}</p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditGoalsOpen(false)}
                    disabled={updateProfileMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveGoals}
                    disabled={updateProfileMutation.isPending || !editingPrimaryGoal}
                  >
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Card>
        )}

        {/* Personal Records */}
        {personalRecords && personalRecords.length > 0 && (
          <Card className="p-5 bg-card/40 border-border/40">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-white">Personal Records</h2>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {personalRecords.slice(0, 10).map((pr: any) => (
                <div key={pr.id} className="flex items-center justify-between p-2 bg-secondary/30 rounded">
                  <div>
                    <p className="font-bold text-white text-sm">{pr.exerciseName}</p>
                    <p className="text-xs text-muted-foreground">
                      {pr.bestReps !== null && `${pr.bestReps} reps`}
                      {pr.bestReps !== null && pr.bestSeconds !== null && " • "}
                      {pr.bestSeconds !== null && `${pr.bestSeconds}s`}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    PR
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Exercise Mastery */}
        {mastery && mastery.length > 0 && (
          <Card className="p-5 bg-card/40 border-border/40">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-white">Exercise Mastery</h2>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {mastery
                .sort((a: any, b: any) => b.masteryScore - a.masteryScore)
                .slice(0, 10)
                .map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between p-2 bg-secondary/30 rounded">
                    <div className="flex-1">
                      <p className="font-bold text-white text-sm">{m.exerciseName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${m.masteryScore}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground font-bold">
                          {Math.round(m.masteryScore)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        )}

        {/* Recovery Status */}
        {recovery && Object.keys(recovery).length > 0 && (
          <Card className="p-5 bg-card/40 border-border/40">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-white">Recovery Status</h2>
            </div>
            <div className="space-y-2">
              {Object.entries(recovery)
                .sort(([, a], [, b]) => (a as number) - (b as number))
                .slice(0, 8)
                .map(([muscleGroup, score]) => {
                  const recoveryPercent = Math.round((score as number) * 100);
                  const isLow = (score as number) < 0.5;
                  return (
                    <div key={muscleGroup} className="flex items-center justify-between p-2 bg-secondary/30 rounded">
                      <div className="flex-1">
                        <p className="font-bold text-white text-sm capitalize">{muscleGroup}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${isLow ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${recoveryPercent}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold ${isLow ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {recoveryPercent}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                {history.slice(0, 5).map((session) => (
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
