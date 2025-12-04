import { motion } from "framer-motion";
import { Zap, Timer, TrendingUp, Target, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import MobileLayout from "@/components/layout/mobile-layout";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Input } from "@/components/ui/input";

export default function Landing() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);

  // Listen for deep link (magic link callback)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      let listenerHandle: any;

      CapacitorApp.addListener("appUrlOpen", async (event) => {
        const url = new URL(event.url);
        const hash = url.hash.substring(1); // Remove '#'

        if (hash) {
          const params = new URLSearchParams(hash);
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          if (accessToken && refreshToken) {
            // Set session from deep link tokens
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            // User will be redirected by App.tsx route protection
          }
        }
      }).then(handle => {
        listenerHandle = handle;
      });

      return () => {
        if (listenerHandle) {
          listenerHandle.remove();
        }
      };
    }
  }, []);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const redirectTo = Capacitor.isNativePlatform()
        ? "com.myhiitlab.app://auth/callback"
        : `${window.location.origin}`;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) throw error;

      setMessage("Check your email for the magic link!");
    } catch (error: any) {
      setMessage(error.message || "Failed to send magic link");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetStarted = () => {
    setShowEmailForm(true);
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
              HIIT<br />LAB
            </h1>
            <p className="text-xl text-muted-foreground">
              AI-Powered Training, Personalized for Every Level
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
              { icon: Timer, label: "HIIT Timer" },
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
          {!showEmailForm ? (
            <Button
              onClick={handleGetStarted}
              className="w-full h-14 text-lg font-bold uppercase tracking-wider bg-primary text-black hover:bg-primary/90 neon-border"
              data-testid="button-login"
            >
              <Zap className="w-5 h-5 mr-2 fill-current" />
              Get Started
            </Button>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="h-14 text-lg bg-card/50 border-border/50 text-white placeholder:text-muted-foreground"
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 text-lg font-bold uppercase tracking-wider bg-primary text-black hover:bg-primary/90 neon-border"
              >
                <Mail className="w-5 h-5 mr-2" />
                {isLoading ? "Sending..." : "Send Magic Link"}
              </Button>
              {message && (
                <p className={`text-sm text-center ${message.includes("Check") ? "text-primary" : "text-red-500"}`}>
                  {message}
                </p>
              )}
              <Button
                type="button"
                onClick={() => setShowEmailForm(false)}
                variant="ghost"
                className="w-full text-muted-foreground hover:text-white"
              >
                Back
              </Button>
            </form>
          )}
        </motion.div>
      </div>
    </MobileLayout>
  );
}
