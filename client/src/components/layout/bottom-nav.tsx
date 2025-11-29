import { Link, useLocation } from "wouter";
import { Home, Calendar, Utensils, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BottomNav() {
  const [location] = useLocation();

  // Matching the icons from the screenshot
  const navItems = [
    { icon: Home, path: "/" },
    { icon: Calendar, path: "/schedule" }, // Placeholder path
    { icon: Utensils, path: "/nutrition" }, // Placeholder path
    { icon: User, path: "/profile" }, // Placeholder path
    { icon: Settings, path: "/settings" } // Placeholder path
  ];

  return (
    <nav className="h-16 rounded-3xl bg-[#121726]/90 backdrop-blur-xl border border-white/5 flex items-center justify-between px-6 shadow-2xl shadow-black/50">
      {navItems.map((item, idx) => {
        // For prototype, map non-home items to home or workout to prevent 404s if they don't exist yet
        // But keep visually distinct
        const isActive = location === item.path || (location === "/" && idx === 0);
        
        return (
          <Link key={idx} href={item.path === "/" ? "/" : location}> 
            <div className="relative flex items-center justify-center w-10 h-10">
              <item.icon 
                size={22} 
                className={cn(
                  "transition-colors duration-200",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-white"
                )}
                strokeWidth={2}
              />
              {isActive && (
                <div className="absolute -bottom-2 w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_rgba(204,255,0,0.8)]" />
              )}
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
