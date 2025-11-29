import MobileLayout from "@/components/layout/mobile-layout";
import { Card } from "@/components/ui/card";
import { Calendar, TrendingUp, Award, Clock, Zap } from "lucide-react";

const HISTORY_DATA = [
  { date: "Today", name: "The Gauntlet", duration: "20 min", calories: "300", rating: "4.8" },
  { date: "Yesterday", name: "Core Crusher", duration: "10 min", calories: "150", rating: "4.5" },
  { date: "Nov 27", name: "Leg Day", duration: "15 min", calories: "220", rating: "4.9" },
  { date: "Nov 25", name: "Quick HIIT", duration: "12 min", calories: "180", rating: "4.2" },
];

export default function History() {
  return (
    <MobileLayout>
      <div className="p-6 pb-32 space-y-8">
        <div className="flex items-center justify-between">
           <h1 className="text-3xl font-bold text-white">Statistic</h1>
           <div className="flex gap-2">
             <button className="px-4 py-1.5 rounded-full bg-[#121726] text-xs font-bold text-white border border-white/10">This Month</button>
             <button className="px-4 py-1.5 rounded-full bg-transparent text-xs font-bold text-muted-foreground hover:text-white">Yearly</button>
           </div>
        </div>

        {/* Main Chart Card Placeholder */}
        <div className="p-6 rounded-[2rem] bg-[#121726] border border-white/5 relative overflow-hidden">
          {/* Fake Chart Line */}
          <div className="h-32 flex items-end justify-between gap-2 mb-6 px-2">
            <div className="w-full bg-primary/20 h-[2px] absolute bottom-24 left-0 right-0" />
            <div className="w-1/6 h-12 bg-gradient-to-t from-primary/20 to-transparent rounded-t-lg border-t-2 border-primary" />
            <div className="w-1/6 h-20 bg-gradient-to-t from-primary/20 to-transparent rounded-t-lg border-t-2 border-primary" />
            <div className="w-1/6 h-16 bg-gradient-to-t from-primary/20 to-transparent rounded-t-lg border-t-2 border-primary" />
            <div className="w-1/6 h-24 bg-gradient-to-t from-primary/20 to-transparent rounded-t-lg border-t-2 border-primary" />
            <div className="w-1/6 h-10 bg-gradient-to-t from-primary/20 to-transparent rounded-t-lg border-t-2 border-primary" />
            <div className="w-1/6 h-28 bg-gradient-to-t from-primary/20 to-transparent rounded-t-lg border-t-2 border-primary" />
          </div>

          <div className="flex items-end gap-3 mb-4">
             <span className="text-4xl font-bold text-white">9,826</span>
             <span className="text-sm font-bold text-muted-foreground mb-1.5 uppercase">Steps</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="block text-lg font-bold text-white">366</span>
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Calories</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                <Award className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="block text-lg font-bold text-white">75 kg</span>
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Weight</span>
              </div>
            </div>
          </div>
        </div>

        <h2 className="text-lg font-bold text-white">Recent History</h2>

        <div className="space-y-4">
          {HISTORY_DATA.map((item, idx) => (
            <div key={idx} className="p-4 rounded-[1.5rem] bg-white flex items-center justify-between">
              <div className="flex gap-4 items-center">
                <div className="h-12 w-12 rounded-[1rem] bg-slate-100 flex items-center justify-center text-2xl">
                  🧘‍♀️
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{item.name}</h3>
                  <p className="text-xs text-slate-500 font-medium">{item.duration} • {item.calories} Cal</p>
                </div>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-full">
                <span className="text-[10px] font-bold text-slate-900">★ {item.rating}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MobileLayout>
  );
}
