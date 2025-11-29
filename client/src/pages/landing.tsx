import { motion } from "framer-motion";
import { Zap, Timer, TrendingUp, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import MobileLayout from "@/components/layout/mobile-layout";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <MobileLayout hideNav>
      <div className="h-full flex flex-col justify-between p-6 bg-black">
        {/* Hero Section */}
        <div className="flex-1 flex flex-col justify-center items-center text-center space-y-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary neon-border"
          >
            <Zap className="w-12 h-12 text-primary" fill="currentColor" />
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-6xl font-display font-bold text-white mb-3 leading-none">
              EMOM<br />PULSE
            </h1>
            <p className="text-xl text-muted-foreground">
              Every Minute Matters
            </p>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 gap-3 w-full max-w-sm mt-8"
          >
            {[
              { icon: Timer, label: "EMOM Timer" },
              { icon: Target, label: "Personalized" },
              { icon: TrendingUp, label: "Track Progress" },
              { icon: Zap, label: "Adaptive AI" },
            ].map((feature, idx) => (
              <Card key={idx} className="p-4 bg-card/50 border-border/50 flex flex-col items-center justify-center gap-2">
                <feature.icon className="w-6 h-6 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wide text-white">{feature.label}</span>
              </Card>
            ))}
          </motion.div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="space-y-4"
        >
          <Button
            onClick={handleLogin}
            className="w-full h-14 text-lg font-bold uppercase tracking-wider bg-primary text-black hover:bg-primary/90 neon-border"
            data-testid="button-login"
          >
            <Zap className="w-5 h-5 mr-2 fill-current" />
            Get Started
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Sign in with your Replit account
          </p>
        </motion.div>
      </div>
    </MobileLayout>
  );
}
