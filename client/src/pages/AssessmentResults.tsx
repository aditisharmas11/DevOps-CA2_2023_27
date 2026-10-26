import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Heart, Book, Users, AlertTriangle,
  Brain, UserCheck, ThumbsUp, Activity,
  RotateCcw, MessageSquare, BookOpen, ShieldAlert,
  Sparkles, CheckCircle2, TrendingUp, BarChart3
} from "lucide-react";
import EmergencyResources from "@/components/EmergencyResources";
import {
  MentalHealthRadarChart,
  MentalHealthBarChart,
  AssessmentTrendChart,
} from "@/components/AssessmentVisualizations";
import {
  analyzeAssessmentResults,
  type AssessmentResult,
} from "@/lib/openai";
import { useQuery } from "@tanstack/react-query";

export default function AssessmentResults() {
  const [, setLocation] = useLocation();
  const [answers, setAnswers] = useState<Record<string, number>>({});

  useEffect(() => {
    const stored = sessionStorage.getItem("assessment_answers");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
          setAnswers(parsed);
          return;
        }
      } catch (e) {
        console.error("Failed to parse stored answers:", e);
      }
    }
    // If no answers stored, redirect to intro
    setLocation("/assessment/intro");
  }, [setLocation]);

  // Query assessment analysis
  const { data: results, isLoading, error } = useQuery({
    queryKey: ['/api/assessment/analyze', answers],
    queryFn: async () => {
      if (Object.keys(answers).length === 0) return null;
      return analyzeAssessmentResults(answers);
    },
    enabled: Object.keys(answers).length > 0,
    staleTime: Infinity, // Don't refetch on tab switch
  });

  // Query historical assessments for trend chart
  const { data: history = [] } = useQuery<any[]>({
    queryKey: ['/api/assessment/history'],
    queryFn: async () => {
      const res = await fetch('/api/assessment/history');
      if (!res.ok) return [];
      return res.json();
    },
  });

  const handleRetake = () => {
    sessionStorage.removeItem("assessment_answers");
    setLocation("/assessment/intro");
  };

  if (isLoading) {
    return (
      <div className="p-4 max-w-3xl mx-auto py-12">
        <Card className="p-8 text-center border border-border">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <Brain className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Analyzing Your Responses</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Evaluating your scores across mood regulation, anxiety indicators, and social connectivity...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="p-4 max-w-3xl mx-auto py-12">
        <Card className="border border-border">
          <CardContent className="text-center py-12 space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Unable to Calculate Results</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              We encountered an issue processing your assessment. Please try taking the questionnaire again.
            </p>
            <Button onClick={() => setLocation("/assessment/intro")} className="font-semibold">
              <RotateCcw className="h-4 w-4 mr-2" /> Start Assessment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Format historical trend data
  const trendHistory = history
    .filter((h) => h.results && h.results.overallScore !== undefined)
    .map((h) => ({
      id: h.id,
      createdAt: h.createdAt || new Date().toISOString(),
      overallScore: h.results.overallScore,
    }));

  const getScoreBadge = (score: number) => {
    if (score >= 70) {
      return { label: "Optimal Resilience", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" };
    }
    if (score >= 45) {
      return { label: "Moderate Balance", color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" };
    }
    return { label: "Support Recommended", color: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30" };
  };

  const badge = getScoreBadge(results.overallScore);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-8">
      {/* Progress header */}
      <div className="py-2">
        <div className="flex justify-between items-center max-w-md mx-auto">
          {["Intro", "Mood", "Thoughts", "Results"].map((label, idx) => (
            <div key={label} className="flex items-center">
              <div className="relative flex flex-col items-center">
                <div className="progress-step active">{idx + 1}</div>
                <span className="text-[11px] font-semibold mt-1 text-primary">{label}</span>
              </div>
              {idx < 3 && <div className="w-12 sm:w-16 h-1 bg-primary mx-1 sm:mx-2 rounded" />}
            </div>
          ))}
        </div>
      </div>

      {/* Main Results Card */}
      <Card className="border border-border bg-card shadow-sm overflow-hidden">
        <CardHeader className="bg-primary/5 border-b border-border pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border mb-2 ${badge.color}`}>
                {badge.label}
              </span>
              <CardTitle className="text-2xl font-bold text-foreground">
                Your Mental Wellness Summary
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Generated from your answers across 20 evidence-based self-reflection questions.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-3xl font-extrabold text-primary">{results.overallScore}<span className="text-sm font-medium text-muted-foreground">/100</span></div>
                <div className="text-[11px] text-muted-foreground">Overall Index</div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-8">
          {/* AI Summary Insight */}
          <div className="p-4 rounded-2xl bg-accent/30 border border-primary/20 space-y-2">
            <div className="flex items-center gap-2 text-primary font-semibold text-sm">
              <Sparkles className="h-4 w-4" /> AI Wellness Analysis
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed">
              {results.summary}
            </p>
          </div>

          {/* Visualizations Section: Radar and Bar side-by-side */}
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" /> Dimension Breakdown
              </h3>
              <p className="text-xs text-muted-foreground">
                Compare your scores across Mood Regulation, Anxiety Management, and Social Connectivity.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="p-4 rounded-2xl bg-card border border-border flex flex-col items-center">
                <span className="text-xs font-semibold text-muted-foreground mb-2">Radar Dimension Mapping</span>
                <MentalHealthRadarChart
                  moodScore={results.moodScore}
                  anxietyScore={results.anxietyScore}
                  socialScore={results.socialScore}
                />
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border flex flex-col items-center">
                <span className="text-xs font-semibold text-muted-foreground mb-2">Category Score Comparison</span>
                <MentalHealthBarChart
                  moodScore={results.moodScore}
                  anxietyScore={results.anxietyScore}
                  socialScore={results.socialScore}
                />
              </div>
            </div>

            {/* Individual Dimension Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-4">
              <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-foreground">Mood & Emotions</span>
                  <span className="text-xs font-bold text-primary">{results.moodScore}%</span>
                </div>
                <Progress value={results.moodScore} className="h-2" />
                <p className="text-[11px] text-muted-foreground">Measures optimism, energy, and joy.</p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-foreground">Anxiety Regulation</span>
                  <span className="text-xs font-bold text-primary">{results.anxietyScore}%</span>
                </div>
                <Progress value={results.anxietyScore} className="h-2" />
                <p className="text-[11px] text-muted-foreground">Higher score indicates lower daily anxiety.</p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-foreground">Social Well-Being</span>
                  <span className="text-xs font-bold text-primary">{results.socialScore}%</span>
                </div>
                <Progress value={results.socialScore} className="h-2" />
                <p className="text-[11px] text-muted-foreground">Reflects peer support and belonging.</p>
              </div>
            </div>
          </div>

          {/* Historical Trend Chart (when user has multiple assessments) */}
          {trendHistory.length > 1 && (
            <div className="border border-border rounded-2xl p-5 bg-card space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" /> Your Historical Wellness Trend
                  </h4>
                  <p className="text-xs text-muted-foreground">Tracking your overall wellness across {trendHistory.length} assessments.</p>
                </div>
              </div>
              <AssessmentTrendChart history={trendHistory} />
            </div>
          )}

          {/* Screen Indicators */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-foreground">Potential Wellness Indicators</h3>
            <div className="space-y-3">
              {results.predictions?.map((pred, i) => {
                const isPositive = pred.condition === "Positive Mental Health";
                const isModerateOrSevere = pred.severity === "moderate" || pred.severity === "severe";

                return (
                  <div
                    key={i}
                    className={`p-4 rounded-2xl border transition-colors ${
                      isPositive
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : isModerateOrSevere
                        ? "bg-amber-500/10 border-amber-500/30"
                        : "bg-muted/40 border-border"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {isPositive ? (
                          <ThumbsUp className="h-5 w-5 text-emerald-500" />
                        ) : pred.condition.includes("Anxiety") ? (
                          <Activity className="h-5 w-5 text-amber-500" />
                        ) : (
                          <Brain className="h-5 w-5 text-purple-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm text-foreground">{pred.condition}</h4>
                          {pred.severity !== "none" && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-background border border-border">
                              {pred.severity}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {pred.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actionable Recommendations */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-foreground">Suggested Action Steps</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {results.recommendations?.map((rec, i) => (
                <div key={i} className="p-4 rounded-2xl border border-border bg-card flex flex-col justify-between space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      {rec.icon === "heart" ? <Heart className="h-4 w-4" /> : rec.icon === "book" ? <Book className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                    </div>
                    <h4 className="text-sm font-semibold text-foreground">{rec.title}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {rec.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Clinical Disclaimer Alert */}
          <div className="p-4 rounded-2xl bg-muted/60 border border-border flex items-start gap-3 text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <strong>Mental Wellness Self-Reflection Notice:</strong> ZenGen is not a medical device and does not provide clinical diagnoses. These results are designed to foster personal self-awareness. If you are experiencing persistent distress, please consult a licensed mental health professional.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              onClick={handleRetake}
              variant="outline"
              className="font-semibold text-xs gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Retake Assessment
            </Button>
            <Link href="/chat">
              <Button className="font-semibold text-xs gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" /> Discuss with AI Assistant
              </Button>
            </Link>
            <Link href="/resources">
              <Button variant="secondary" className="font-semibold text-xs gap-1.5">
                <BookOpen className="h-3.5 w-3.5" /> Explore Recommended Resources
              </Button>
            </Link>
            <Link href="/crisis">
              <Button variant="destructive" className="font-semibold text-xs gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5" /> Crisis Support
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <EmergencyResources />
    </div>
  );
}
