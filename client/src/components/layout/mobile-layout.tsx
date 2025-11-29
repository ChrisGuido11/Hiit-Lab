import { ReactNode } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import BottomNav from "./bottom-nav";
import { AnimatePresence, motion } from "framer-motion";
import backgroundTexture from "@assets/generated_images/dark_abstract_carbon_fiber_texture_for_app_background.png";

interface MobileLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

export default function MobileLayout({ children, hideNav = false }: MobileLayoutProps) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen w-full bg-black flex justify-center overflow-hidden">
      {/* Desktop background wrapper */}
      <div 
        className="fixed inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `url(${backgroundTexture})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      {/* Mobile Container */}
      <div className="w-full max-w-md h-[100dvh] bg-background flex flex-col relative z-10 shadow-2xl overflow-hidden border-x border-border/20">
        <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
        {!hideNav && <BottomNav />}
      </div>
    </div>
  );
}
