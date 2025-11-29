import { Link } from "wouter";
import { Search, Bell, User, Heart, Play, ArrowRight, Flame } from "lucide-react";
import MobileLayout from "@/components/layout/mobile-layout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import stretchImg from "@assets/generated_images/woman_doing_stretching_exercises_at_home.png";
import sprintImg from "@assets/generated_images/woman_sprinting_outdoors_or_on_track.png";

export default function Home() {
  return (
    <MobileLayout>
      <div className="p-6 pb-32 space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white leading-tight">
              TRACK YOUR <br />
              FITNESS
            </h1>
          </div>
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center bg-card">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center bg-card">
              <User className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search Workout..." 
            className="w-full h-14 bg-card rounded-full pl-12 pr-4 text-white placeholder:text-muted-foreground border border-white/5 focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        {/* Daily Goal Card (White) */}
        <Link href="/workout">
          <Card className="p-5 bg-white rounded-[2rem] flex items-center justify-between relative overflow-hidden cursor-pointer shadow-lg border-0">
            <div className="relative z-10">
              <div className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-900 text-xs font-bold mb-3">
                Everyday Goal
              </div>
              <div className="flex gap-4 mb-4">
                <div>
                  <Flame className="w-4 h-4 text-slate-400 mb-1" />
                  <span className="text-lg font-bold text-slate-900">500 Cal</span>
                  <p className="text-[10px] text-slate-500 uppercase">Calories</p>
                </div>
                <div>
                  <Heart className="w-4 h-4 text-slate-400 mb-1" />
                  <span className="text-lg font-bold text-slate-900">72 Bpm</span>
                  <p className="text-[10px] text-slate-500 uppercase">Heart Rate</p>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center">
                <Play className="w-4 h-4 text-white fill-current ml-1" />
              </div>
            </div>
            
            <img 
              src={stretchImg} 
              alt="Stretching" 
              className="absolute right-0 bottom-0 w-40 h-40 object-cover translate-x-4 translate-y-4 opacity-100 z-0 rounded-tl-[3rem]"
            />
          </Card>
        </Link>

        {/* Get Premium Banner */}
        <div className="bg-gradient-to-r from-[#1D2618] to-[#121726] p-5 rounded-[1.5rem] border border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-primary font-bold text-lg">Get Premium</h3>
            <p className="text-xs text-muted-foreground">Personal trainer, Exclusive content</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <ArrowRight className="text-black w-5 h-5" />
          </div>
        </div>

        {/* Popular Exercises Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-white">Popular Exercises</h3>
            <span className="text-xs text-muted-foreground">See more →</span>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
            {/* Card 1 */}
            <Card className="min-w-[160px] p-3 bg-[#E3E6ED] rounded-[1.5rem] border-0 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <h4 className="text-slate-900 font-bold leading-tight">Home<br/>Workout</h4>
              </div>
              <div className="flex-1 bg-white rounded-[1rem] overflow-hidden relative h-24">
                 <img src={stretchImg} className="w-full h-full object-cover" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-500">10 Exercises</span>
                <div className="px-2 py-1 bg-white rounded-full text-[10px] font-bold text-slate-900">
                  ★ 4.5
                </div>
              </div>
            </Card>

            {/* Card 2 */}
            <Card className="min-w-[160px] p-3 bg-[#E3E6ED] rounded-[1.5rem] border-0 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <h4 className="text-slate-900 font-bold leading-tight">Sprint<br/>& Halt</h4>
              </div>
              <div className="flex-1 bg-white rounded-[1rem] overflow-hidden relative h-24">
                <img src={sprintImg} className="w-full h-full object-cover" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-500">12 Exercises</span>
                <div className="px-2 py-1 bg-white rounded-full text-[10px] font-bold text-slate-900">
                  ★ 4.8
                </div>
              </div>
            </Card>

             {/* Card 3 Placeholder */}
             <Card className="min-w-[160px] p-3 bg-[#2A3040] rounded-[1.5rem] border border-white/5 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <h4 className="text-white font-bold leading-tight">Core<br/>Power</h4>
              </div>
              <div className="flex-1 bg-white/10 rounded-[1rem] overflow-hidden relative h-24 flex items-center justify-center">
                 <Flame className="text-primary w-8 h-8" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400">8 Exercises</span>
                <div className="px-2 py-1 bg-white/10 rounded-full text-[10px] font-bold text-white">
                  ★ 5.0
                </div>
              </div>
            </Card>
          </div>
        </div>

      </div>
    </MobileLayout>
  );
}
