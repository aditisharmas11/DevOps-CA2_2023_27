import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, MessageSquare, BookOpen, ShieldAlert, ArrowRight, Sparkles, CheckCircle, Lock, Compass } from "lucide-react";
import EmergencyResources from "@/components/EmergencyResources";
import zengenLogo from "../assets/zengen_logo.png";
import { useAuth } from "@/hooks/use-auth";

export default function Home() {
  const { user } = useAuth();

  const featureCards = [
    {
      title: "Mental Health Assessment",
      description: "Take our structured 20-question check-in to evaluate mood, anxiety, and social well-being with radar & bar insights.",
      href: "/assessment/intro",
      icon: Brain,
      badge: "Self-Reflection",
      color: "from-purple-500/10 to-indigo-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
      cta: "Take Assessment",
    },
    {
      title: "AI Support Chat",
      description: "Discuss what is on your mind and receive supportive, actionable coping strategies powered by Google Gemini AI.",
      href: "/chat",
      icon: MessageSquare,
      badge: "AI Companion",
      color: "from-violet-500/10 to-fuchsia-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
      cta: "Open AI Chat",
    },
    {
      title: "Resource Library",
      description: "Explore genuine articles and video guides from NIMH, Mayo Clinic, and Child Mind Institute curated for teens.",
      href: "/resources",
      icon: BookOpen,
      badge: "Verified Tools",
      color: "from-blue-500/10 to-cyan-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      cta: "Browse Resources",
    },
    {
      title: "Crisis Support",
      description: "Access immediate 24/7 emergency hotlines (988 Lifeline, Crisis Text Line), box breathing tools, and de-escalation tips.",
      href: "/crisis",
      icon: ShieldAlert,
      badge: "24/7 Emergency",
      color: "from-rose-500/10 to-pink-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
      cta: "Get Crisis Help",
    },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-10">
      {/* Hero Section */}
      <section>
        <div className="relative rounded-3xl bg-gradient-to-br from-primary via-primary/95 to-secondary text-white p-6 sm:p-10 shadow-xl overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 sm:gap-8">
            <div className="relative shrink-0">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-white/15 backdrop-blur-md p-3 flex items-center justify-center border border-white/20 shadow-inner">
                <img
                  src={zengenLogo}
                  alt="ZenGen Logo"
                  className="w-full h-full object-contain filter drop-shadow"
                />
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm mb-3">
                <Sparkles className="h-3.5 w-3.5" />
                <span>AI-Powered Teen Mental Wellness</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
                Welcome to ZenGen{user ? `, ${user.username}` : ""}
              </h1>
              <p className="text-white/90 text-sm sm:text-base max-w-2xl leading-relaxed mb-6">
                Your supportive space designed specifically for teenagers. Understand your emotional landscape, learn practical coping methods, and build daily resilience.
              </p>
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                <Link href="/assessment/intro">
                  <Button
                    size="lg"
                    className="bg-white text-primary hover:bg-white/90 font-bold rounded-xl shadow-md text-sm gap-2 active:scale-95 transition-all"
                  >
                    Take Assessment <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/chat">
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-white/15 text-white hover:bg-white/25 border-white/30 font-semibold rounded-xl text-sm gap-2 active:scale-95 transition-all"
                  >
                    <MessageSquare className="h-4 w-4" /> Chat with AI
                  </Button>
                </Link>
                <Link href="/crisis">
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-rose-500/30 text-white hover:bg-rose-500/40 border-rose-300/40 font-semibold rounded-xl text-sm gap-2 active:scale-95 transition-all"
                  >
                    <ShieldAlert className="h-4 w-4" /> Crisis Support
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Grid - All Fully Clickable */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Explore Platform Features</h2>
            <p className="text-sm text-muted-foreground">Every feature is designed to support your personal wellness journey.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {featureCards.map((feat) => {
            const Icon = feat.icon;
            return (
              <Link key={feat.title} href={feat.href}>
                <Card className="h-full border border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-300 group cursor-pointer flex flex-col justify-between overflow-hidden">
                  <CardContent className="p-6 flex flex-col h-full justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-2xl bg-gradient-to-br ${feat.color} border flex items-center justify-center transition-transform group-hover:scale-110 duration-200`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <span className="text-[11px] font-semibold bg-muted px-2.5 py-1 rounded-full text-muted-foreground group-hover:text-foreground transition-colors">
                          {feat.badge}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                        {feat.title}
                      </h3>

                      <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                        {feat.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                      <span>{feat.cta}</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* How ZenGen Works */}
      <section className="bg-card border border-border rounded-3xl p-6 sm:p-8">
        <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Compass className="h-5 w-5 text-primary" /> How ZenGen Helps You Thrive
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
              1
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground mb-1">Check In Honestly</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Complete a 20-question self-reflection on mood, anxiety, and social dynamics. No scores are shared publicly.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
              2
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground mb-1">Visualize Your Balance</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Review interactive radar and dimension charts to see where you are doing well and where stress tends to accumulate.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
              3
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground mb-1">Take Actionable Steps</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Use AI-recommended breathing exercises, explore verified articles, or discuss feelings with our companion chatbot.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            <span><strong>Your Privacy Guaranteed:</strong> Responses and profile data are securely isolated to your account.</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span>Wellness Self-Reflection Tool (Non-Clinical)</span>
          </div>
        </div>
      </section>

      {/* Emergency Resources Banner */}
      <EmergencyResources />
    </div>
  );
}
