import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InfoIcon, CheckCircle, AlertTriangle, ArrowRight, Brain } from "lucide-react";
import EmergencyResources from "@/components/EmergencyResources";

export default function AssessmentIntro() {
  const [, setLocation] = useLocation();

  const handleStart = () => {
    // Clear old assessment answers
    sessionStorage.removeItem("assessment_answers");
    setLocation("/assessment/question/1");
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      {/* Progress header */}
      <div className="py-2">
        <h1 className="text-2xl font-bold text-center text-foreground mb-6">Mental Wellness Check-in</h1>
        <div className="flex justify-between items-center max-w-md mx-auto">
          {["Intro", "Mood", "Thoughts", "Results"].map((label, idx) => (
            <div key={label} className="flex items-center">
              <div className="relative flex flex-col items-center">
                <div className={`progress-step ${idx === 0 ? "active" : ""}`}>{idx + 1}</div>
                <span className={`text-[11px] font-semibold mt-1 ${idx === 0 ? "text-primary" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </div>
              {idx < 3 && <div className="w-12 sm:w-16 h-1 bg-border mx-1 sm:mx-2 rounded" />}
            </div>
          ))}
        </div>
      </div>

      <Card className="border border-border bg-card shadow-sm">
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
              <Brain className="h-3.5 w-3.5" /> 20 Questions • ~4 Minutes
            </div>
            <h2 className="text-xl font-bold text-foreground">Welcome to Your Mental Wellness Self-Reflection</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This assessment evaluates recent emotional patterns across mood, anxiety, and social connection. It helps identify personal strengths and areas where intentional self-care or extra support could help.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-accent/30 border border-primary/20 space-y-2">
            <div className="flex items-start gap-2.5">
              <InfoIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="text-xs text-foreground/90 leading-relaxed">
                <strong>Confidential and Private:</strong> Your responses are safely isolated to your personal ZenGen account. We never sell your data or expose sensitive responses.
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground">Before You Begin:</h3>
            <ul className="space-y-2.5 text-xs text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Find a quiet, comfortable space where you can focus for 4 minutes.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Answer honestly based on how you have felt over the past 2 weeks—there are no right or wrong answers.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>You can review or retake the assessment anytime from your profile.</span>
              </li>
            </ul>
          </div>

          {/* Clinical notice */}
          <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-xs text-foreground space-y-1">
            <div className="flex items-center gap-2 font-bold text-destructive">
              <AlertTriangle className="h-4 w-4" /> Non-Clinical Self-Reflection Tool
            </div>
            <p className="text-muted-foreground">
              ZenGen does not provide clinical medical diagnosis. If you are in acute crisis, please call or text <strong>988</strong> immediately or contact a licensed healthcare provider.
            </p>
          </div>

          <div className="flex justify-center pt-2">
            <Button
              onClick={handleStart}
              size="lg"
              className="font-bold text-sm gap-2 px-8 rounded-xl shadow-md active:scale-95 transition-all"
            >
              Start Assessment <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <EmergencyResources />
    </div>
  );
}
