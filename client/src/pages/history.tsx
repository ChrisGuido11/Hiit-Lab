import MobileLayout from "@/components/layout/mobile-layout";
import { Card } from "@/components/ui/card";
import { Calendar, TrendingUp, Award } from "lucide-react";

const HISTORY_DATA = [
  { date: "Today", name: "The Gauntlet", duration: "20 min", rating: "Hard" },
  { date: "Yesterday", name: "Core Crusher", duration: "10 min", rating: "Medium" },
  { date: "Nov 27", name: "Leg Day", duration: "15 min", rating: "Hard" },
  { date: "Nov 25", name: "Quick HIIT", duration: "12 min", rating: "Easy" },
];

export default function History() {
  return (
    <MobileLayout>
      <div className="p-6 pb-24 space-y-6">
        <h1 className="text-3xl font-bold text-white mb-6">ACTIVITY</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card className="p-4 bg-primary/10 border-primary/20 flex flex-col items-center justify-center py-6">
            <span className="text-4xl font-display font-bold text-primary neon-text">4</span>
            <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground">This Week</span>
          </Card>
          <Card className="p-4 bg-card/50 border-border/50 flex flex-col items-center justify-center py-6">
            <span className="text-4xl font-display font-bold text-white">12</span>
            <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Streak</span>
          </Card>
        </div>

        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Recent Workouts</h2>

        <div className="space-y-3">
          {HISTORY_DATA.map((item, idx) => (
            <Card key={idx} className="p-4 bg-card/40 border-border/40 flex items-center justify-between">
              <div className="flex gap-4 items-center">
                <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center">
                  <Award className="text-muted-foreground w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white">{item.name}</h3>
                  <p className="text-xs text-muted-foreground">{item.date} • {item.duration}</p>
                </div>
              </div>
              <div className="px-2 py-1 rounded bg-white/5 border border-white/10 text-xs font-bold uppercase text-gray-300">
                {item.rating}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </MobileLayout>
  );
}
