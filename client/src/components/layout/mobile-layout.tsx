import { ReactNode } from "react";
import { useLocation } from "wouter";
import BottomNav from "./bottom-nav";
import { AnimatePresence, motion } from "framer-motion";

interface MobileLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

export default function MobileLayout({ children, hideNav = false }: MobileLayoutProps) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen w-full bg-[#05080d] flex justify-center overflow-hidden">
      {/* Mobile Container */}
      <div className="w-full max-w-md h-[100dvh] bg-background flex flex-col relative z-10 shadow-2xl overflow-hidden border-x border-white/5">
        <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide relative z-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
        {/* Floating Nav Container */}
        {!hideNav && (
          <div className="absolute bottom-6 left-0 right-0 px-6 z-50">
            <BottomNav />
          </div>
        )}
      </div>
    </div>
  );
}
