import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import EmergencyResources from "@/components/EmergencyResources";
import { assessmentQuestions } from "@shared/schema";

export default function AssessmentQuestion() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const [answers, setAnswers] = useState<Record<string, number>>(() => {
    // Get stored answers from sessionStorage
    const stored = sessionStorage.getItem("assessment_answers");
    return stored ? JSON.parse(stored) : {};
  });

  const questionId = parseInt(params.id ?? "", 10);
  const question = assessmentQuestions.find(q => q.id === questionId);

  // Calculate which step we're on for the progress indicator
  const getStep = (id: number) => {
    if (id <= 3) return 2;  // Mood questions (1-3)
    if (id <= 6) return 3;  // Thought questions (4-6)
    return 3; // Default to step 3
  };

  const currentStep = getStep(questionId);

  const handleAnswer = (value: string) => {
    const newAnswers = { ...answers, [questionId]: parseInt(value) };
    setAnswers(newAnswers);
    // Store answers in sessionStorage
    sessionStorage.setItem("assessment_answers", JSON.stringify(newAnswers));
  };

  const handleNext = () => {
    if (questionId < assessmentQuestions.length) {
      setLocation(`/assessment/question/${questionId + 1}`);
    } else {
      // Go to results
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
    return <div>Question not found</div>;
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="py-4">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">Mental Wellness Assessment</h1>
        <div className="flex justify-between items-center mb-8">
          <div className="w-full flex items-center">
            <div className="relative flex items-center justify-center">
              <div className={`progress-step ${currentStep >= 1 ? 'active' : ''}`}>1</div>
              <div className="absolute -bottom-6 w-max text-xs font-medium">Intro</div>
            </div>
            <div className={`flex-1 h-1 ${currentStep >= 2 ? 'bg-primary' : 'bg-gray-300'} mx-2`}></div>
            <div className="relative flex items-center justify-center">
              <div className={`progress-step ${currentStep >= 2 ? 'active' : ''}`}>2</div>
              <div className="absolute -bottom-6 w-max text-xs font-medium text-gray-500">Mood</div>
            </div>
            <div className={`flex-1 h-1 ${currentStep >= 3 ? 'bg-primary' : 'bg-gray-300'} mx-2`}></div>
            <div className="relative flex items-center justify-center">
              <div className={`progress-step ${currentStep >= 3 ? 'active' : ''}`}>3</div>
              <div className="absolute -bottom-6 w-max text-xs font-medium text-gray-500">Thoughts</div>
            </div>
            <div className={`flex-1 h-1 ${currentStep >= 4 ? 'bg-primary' : 'bg-gray-300'} mx-2`}></div>
            <div className="relative flex items-center justify-center">
              <div className={`progress-step ${currentStep >= 4 ? 'active' : ''}`}>4</div>
              <div className="absolute -bottom-6 w-max text-xs font-medium text-gray-500">Results</div>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">{question.text}</h2>

          <RadioGroup
            value={answers[questionId]?.toString() || ""}
            onValueChange={handleAnswer}
            className="space-y-3 mb-8"
          >
            {question.options.map((option, index) => (
              <div key={index} className="flex items-center p-3 bg-neutral-light rounded-lg cursor-pointer hover:bg-neutral transition">
                <RadioGroupItem
                  value={option.value.toString()}
                  id={`option-${index}`}
                  className="h-5 w-5"
                />
                <Label
                  htmlFor={`option-${index}`}
                  className="ml-3 text-gray-700 cursor-pointer"
                >
                  {option.text}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="flex justify-between">
            <Button
              onClick={handlePrevious}
              variant="outline"
              className="border border-primary text-primary hover:bg-primary-light hover:text-white"
            >
              Previous
            </Button>
            <Button
              onClick={handleNext}
              disabled={answers[questionId] === undefined}
              className="bg-primary hover:bg-primary-dark text-white"
            >
              {questionId < assessmentQuestions.length ? "Next" : "See Results"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <EmergencyResources />
    </div>
  );
}
