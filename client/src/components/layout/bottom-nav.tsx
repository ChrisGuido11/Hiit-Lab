import { Link, useLocation } from "wouter";
import { Home, Dumbbell, Timer, History, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Timer, label: "Workout", path: "/workout" }, // Direct link for prototype
    { icon: History, label: "History", path: "/history" },
  ];

  return (
    <nav className="h-16 glass-panel border-t border-border/40 flex items-center justify-around px-4 pb-safe">
      {navItems.map((item) => {
        const isActive = location === item.path;
        return (
          <Link key={item.path} href={item.path}>
            <div className={cn(
              "flex flex-col items-center justify-center w-16 h-full space-y-1 transition-all duration-200",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}>
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
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
