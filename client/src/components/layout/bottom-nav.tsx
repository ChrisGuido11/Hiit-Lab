import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Home, Timer, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GeneratedWorkout } from "@/../../shared/schema";

export default function BottomNav() {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const handleNavigation = (path: string) => {
    if (path === "/workout") {
      const cachedWorkout = queryClient.getQueryData<GeneratedWorkout>([
        "/api/workout/generate",
      ]);

      setLocation(cachedWorkout ? "/workout" : "/workout-lab");
      return;
    }

    setLocation(path);
  };

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Timer, label: "Workout", path: "/workout" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  return (
    <nav className="h-16 glass-panel border-t border-border/40 flex items-center justify-around px-4 pb-safe">
      {navItems.map((item) => {
        const isWorkoutPath = item.path === "/workout";
        const isActive =
          location === item.path ||
          (isWorkoutPath &&
            (location.startsWith("/workout") || location.startsWith("/workout-lab")));
        return (
          <button
            key={item.path}
            type="button"
            onClick={() => handleNavigation(item.path)}
            className={cn(
              "flex flex-col items-center justify-center w-16 h-full space-y-1 transition-all duration-200",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon
              size={24}
              strokeWidth={isActive ? 2.5 : 2}
              className={cn(
                "transition-all duration-200",
                isActive && "neon-drop-shadow"
              )}
            />
            <span className="text-[10px] font-medium tracking-wide uppercase">{item.label}</span>
            {isActive && (
              <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary neon-border" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
