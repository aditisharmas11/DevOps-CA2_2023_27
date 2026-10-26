import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, MessageSquare, ShieldAlert, Heart, Wind, CheckCircle2, Globe, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function CrisisSupport() {
  // Box breathing state
  const [breathingPhase, setBreathingPhase] = useState<"Inhale" | "Hold" | "Exhale" | "Rest">("Inhale");
  const [breathingTimer, setBreathingTimer] = useState(4);
  const [isBreathingActive, setIsBreathingActive] = useState(false);

  useEffect(() => {
    if (!isBreathingActive) return;

    const interval = setInterval(() => {
      setBreathingTimer((prev) => {
        if (prev <= 1) {
          setBreathingPhase((phase) => {
            if (phase === "Inhale") return "Hold";
            if (phase === "Hold") return "Exhale";
            if (phase === "Exhale") return "Rest";
            return "Inhale";
          });
          return 4;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isBreathingActive]);

  // Grounding technique check items
  const [groundingChecks, setGroundingChecks] = useState<Record<string, boolean>>({});
  const toggleGrounding = (key: string) => {
    setGroundingChecks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-4xl mx-auto p-4 py-8 space-y-8">
      {/* Urgent Warning Banner */}
      <div className="bg-destructive/10 border-2 border-destructive/40 text-destructive rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-destructive text-destructive-foreground rounded-xl shrink-0">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-1">Immediate Crisis & Emergency Support</h1>
            <p className="text-destructive/90 text-sm leading-relaxed mb-4">
              If you or someone you know is in immediate physical danger, having thoughts of self-harm, or experiencing a medical emergency, please use the resources below immediately. You do not have to go through this alone.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="tel:988"
                className="inline-flex items-center gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 px-4 py-2.5 rounded-xl font-semibold text-sm transition-transform active:scale-95"
              >
                <Phone className="h-4 w-4" /> Call 988 Lifeline
              </a>
              <a
                href="sms:988"
                className="inline-flex items-center gap-2 bg-destructive/20 text-destructive hover:bg-destructive/30 border border-destructive/40 px-4 py-2.5 rounded-xl font-semibold text-sm transition-transform active:scale-95"
              >
                <MessageSquare className="h-4 w-4" /> Text 988
              </a>
              <a
                href="tel:911"
                className="inline-flex items-center gap-2 bg-card text-foreground hover:bg-accent border border-border px-4 py-2.5 rounded-xl font-semibold text-sm transition-transform active:scale-95"
              >
                Emergency: 911
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 24/7 Helplines Grid */}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-foreground">
          <Phone className="h-5 w-5 text-primary" /> Free, Confidential 24/7 Helplines
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>988 Suicide & Crisis Lifeline</span>
                <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">Free & 24/7</span>
              </CardTitle>
              <CardDescription>Available across the United States & Canada</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Trained compassionate counselors available anytime for emotional distress, anxiety, depression, or suicidal crisis.
              </p>
              <div className="flex gap-2">
                <a href="tel:988" className="flex-1">
                  <Button variant="default" className="w-full text-xs font-semibold">
                    <Phone className="h-3.5 w-3.5 mr-1" /> Call 988
                  </Button>
                </a>
                <a href="sms:988" className="flex-1">
                  <Button variant="outline" className="w-full text-xs font-semibold">
                    <MessageSquare className="h-3.5 w-3.5 mr-1" /> Text 988
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Crisis Text Line</span>
                <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">Text Support</span>
              </CardTitle>
              <CardDescription>Confidential text support anywhere</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Text HOME to 741741 from anywhere in the US, UK, or Canada to connect with a crisis counselor over SMS text.
              </p>
              <a href="sms:741741?body=HOME" className="block">
                <Button variant="outline" className="w-full text-xs font-semibold">
                  <MessageSquare className="h-3.5 w-3.5 mr-1" /> Text HOME to 741741
                </Button>
              </a>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>The Trevor Project</span>
                <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">LGBTQ Youth</span>
              </CardTitle>
              <CardDescription>Support for LGBTQ youth & teens</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Safe, judgment-free crisis intervention for LGBTQ young people available 24/7/365.
              </p>
              <div className="flex gap-2">
                <a href="tel:18664887386" className="flex-1">
                  <Button variant="outline" className="w-full text-xs font-semibold">
                    <Phone className="h-3.5 w-3.5 mr-1" /> 1-866-488-7386
                  </Button>
                </a>
                <a href="sms:678678?body=START" className="flex-1">
                  <Button variant="outline" className="w-full text-xs font-semibold">
                    <MessageSquare className="h-3.5 w-3.5 mr-1" /> Text START to 678-678
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>International Helplines</span>
                <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">Worldwide</span>
              </CardTitle>
              <CardDescription>Resources for users outside North America</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Find local crisis lines globally via Befrienders Worldwide or the International Association for Suicide Prevention.
              </p>
              <a
                href="https://www.befrienders.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button variant="outline" className="w-full text-xs font-semibold">
                  <Globe className="h-3.5 w-3.5 mr-1" /> View Global Directory
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Interactive Box Breathing Widget */}
      <Card className="border-primary/30 overflow-hidden">
        <CardHeader className="bg-primary/5 border-b border-primary/10">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Wind className="h-5 w-5" /> Interactive Box Breathing (Calm Down Now)
          </CardTitle>
          <CardDescription>
            A clinically proven technique to slow your heart rate and reset your nervous system within 2 minutes.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 flex flex-col items-center text-center">
          <div className="relative my-6 flex items-center justify-center">
            <div
              className={`w-44 h-44 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-1000 ${
                isBreathingActive
                  ? breathingPhase === "Inhale"
                    ? "border-primary bg-primary/15 scale-110 shadow-lg shadow-primary/20"
                    : breathingPhase === "Hold"
                    ? "border-secondary bg-secondary/15 scale-110 shadow-lg shadow-secondary/20"
                    : breathingPhase === "Exhale"
                    ? "border-primary/50 bg-primary/5 scale-90"
                    : "border-muted-foreground/30 bg-muted/40 scale-95"
                  : "border-border bg-card"
              }`}
            >
              <span className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                {isBreathingActive ? breathingPhase : "Ready"}
              </span>
              <span className="text-4xl font-extrabold text-foreground mt-1">
                {isBreathingActive ? breathingTimer : "4s"}
              </span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground max-w-md mb-6">
            Inhale deeply for 4 seconds, hold your breath for 4 seconds, exhale slowly for 4 seconds, and rest for 4 seconds. Repeat until you feel centered.
          </p>

          <Button
            onClick={() => setIsBreathingActive(!isBreathingActive)}
            className="px-8 font-semibold"
          >
            {isBreathingActive ? "Stop Exercise" : "Start Guided Breathing"}
          </Button>
        </CardContent>
      </Card>

      {/* 5-4-3-2-1 Sensory Grounding Tool */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-secondary" /> The 5-4-3-2-1 Grounding Technique
          </CardTitle>
          <CardDescription>
            If your mind is racing or you feel detached, use your senses to bring yourself back to the present moment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { id: "see", text: "Look around and name 5 things you can see right now." },
            { id: "touch", text: "Touch 4 different textures or objects (your shirt, a desk, a pen, your hair)." },
            { id: "hear", text: "Listen closely and identify 3 distinct sounds around you." },
            { id: "smell", text: "Notice 2 things you can smell (or two scents you enjoy)." },
            { id: "taste", text: "Notice 1 thing you can taste (or take a slow sip of water)." },
          ].map((item, idx) => (
            <div
              key={item.id}
              onClick={() => toggleGrounding(item.id)}
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                groundingChecks[item.id]
                  ? "bg-accent/40 border-primary/40 text-foreground"
                  : "bg-card border-border hover:bg-accent/20"
              }`}
            >
              <CheckCircle2
                className={`h-5 w-5 shrink-0 mt-0.5 transition-colors ${
                  groundingChecks[item.id] ? "text-primary fill-primary/20" : "text-muted-foreground"
                }`}
              />
              <span className={`text-sm ${groundingChecks[item.id] ? "line-through text-muted-foreground" : ""}`}>
                <strong>Step {idx + 1}:</strong> {item.text}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Reaching Out Guidance */}
      <div className="bg-card border border-border rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-lg text-foreground mb-1">Need a gentle sounding board?</h3>
          <p className="text-sm text-muted-foreground max-w-xl">
            Our AI wellness assistant is available to talk through everyday coping strategies and stress reduction techniques.
          </p>
        </div>
        <Link href="/chat">
          <Button variant="default" className="shrink-0 gap-2 font-semibold">
            Chat with AI Assistant <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
