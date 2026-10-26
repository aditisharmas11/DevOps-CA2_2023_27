import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import EmergencyResources from "@/components/EmergencyResources";
import { assessmentQuestions } from "@shared/schema";
import { ArrowLeft, ArrowRight, Brain, Activity, Users } from "lucide-react";

export default function AssessmentQuestion() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const [answers, setAnswers] = useState<Record<string, number>>(() => {
    const stored = sessionStorage.getItem("assessment_answers");
    return stored ? JSON.parse(stored) : {};
  });

  const questionId = parseInt(params.id ?? "1", 10);
  const question = assessmentQuestions.find((q) => q.id === questionId);

  const totalQuestions = assessmentQuestions.length;
  const progressPercent = Math.round((questionId / totalQuestions) * 100);

  const getCategoryInfo = (category: string) => {
    switch (category) {
      case "mood":
        return { label: "Mood & Emotions", icon: Brain, color: "text-purple-600 dark:text-purple-400 bg-purple-500/10" };
      case "anxiety":
        return { label: "Anxiety & Stress", icon: Activity, color: "text-violet-600 dark:text-violet-400 bg-violet-500/10" };
      case "social":
        return { label: "Social Connections", icon: Users, color: "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10" };
      default:
        return { label: "Self-Reflection", icon: Brain, color: "text-primary bg-primary/10" };
    }
  };

  const handleAnswer = (value: string) => {
    const newAnswers = { ...answers, [questionId]: parseInt(value, 10) };
    setAnswers(newAnswers);
    sessionStorage.setItem("assessment_answers", JSON.stringify(newAnswers));
  };

  const handleNext = () => {
    if (questionId < totalQuestions) {
      setLocation(`/assessment/question/${questionId + 1}`);
    } else {
      setLocation("/assessment/results");
    }
  };

  const handlePrevious = () => {
    if (questionId > 1) {
      setLocation(`/assessment/question/${questionId - 1}`);
    } else {
      setLocation("/assessment/intro");
    }
  };

  if (!question) {
    return (
      <div className="p-4 max-w-3xl mx-auto py-12 text-center">
        <h2 className="text-lg font-bold text-foreground">Question Not Found</h2>
        <Button onClick={() => setLocation("/assessment/intro")} className="mt-4">
          Return to Start
        </Button>
      </div>
    );
  }

  const catInfo = getCategoryInfo(question.category);
  const CatIcon = catInfo.icon;
  const currentAnswer = answers[questionId];

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      {/* Progress Indicator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/40 text-foreground">
            <CatIcon className="h-3.5 w-3.5 text-primary" /> {catInfo.label}
          </span>
          <span>Question {questionId} of {totalQuestions} ({progressPercent}%)</span>
        </div>
        <Progress value={progressPercent} className="h-2 rounded-full" />
      </div>

      <Card className="border border-border bg-card shadow-sm">
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-wider font-bold text-primary">
              Section: {catInfo.label}
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-foreground leading-snug">
              {question.text}
            </h2>
            <p className="text-xs text-muted-foreground">
              Select the option that best reflects your feelings over the past 2 weeks:
            </p>
          </div>

          <RadioGroup
            value={currentAnswer !== undefined ? currentAnswer.toString() : ""}
            onValueChange={handleAnswer}
            className="space-y-3 pt-2"
          >
            {question.options.map((option, index) => {
              const isSelected = currentAnswer === option.value;
              return (
                <div
                  key={index}
                  onClick={() => handleAnswer(option.value.toString())}
                  className={`flex items-center p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border bg-card hover:bg-accent/30 hover:border-primary/40"
                  }`}
                >
                  <RadioGroupItem
                    value={option.value.toString()}
                    id={`opt-${index}`}
                    className="h-4 w-4 text-primary"
                  />
                  <Label
                    htmlFor={`opt-${index}`}
                    className="ml-3.5 text-sm text-foreground font-medium cursor-pointer flex-1"
                  >
                    {option.text}
                  </Label>
                </div>
              );
            })}
          </RadioGroup>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button
              onClick={handlePrevious}
              variant="outline"
              size="sm"
              className="font-semibold text-xs gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Previous
            </Button>
            <Button
              onClick={handleNext}
              disabled={currentAnswer === undefined}
              size="sm"
              className="font-semibold text-xs gap-1.5 px-5 shadow-sm active:scale-95"
            >
              {questionId < totalQuestions ? (
                <>Next <ArrowRight className="h-3.5 w-3.5" /></>
              ) : (
                <>View Results <ArrowRight className="h-3.5 w-3.5" /></>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <EmergencyResources />
    </div>
  );
}
