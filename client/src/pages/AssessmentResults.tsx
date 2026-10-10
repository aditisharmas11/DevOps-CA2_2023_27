import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Heart, Book, Users, AlertTriangle,
  Brain, UserCheck, ThumbsUp, Activity
} from "lucide-react";
import EmergencyResources from "@/components/EmergencyResources";
import MentalHealthRadarChart from "@/components/MentalHealthRadarChart";
import {
  analyzeAssessmentResults,
  type AssessmentResult,
  type MentalHealthPrediction
} from "@/lib/openai";
import { useQuery } from "@tanstack/react-query";

export default function AssessmentResults() {
  const [, setLocation] = useLocation();
  const [answers, setAnswers] = useState<Record<string, number>>({});

  useEffect(() => {
    // Get stored answers from sessionStorage
    const stored = sessionStorage.getItem("assessment_answers");
    if (stored) {
      setAnswers(JSON.parse(stored));
    } else {
      // Redirect to intro if no answers
      setLocation("/assessment/intro");
    }
  }, [setLocation]);

  const { data: results, isLoading, error } = useQuery({
    queryKey: ['/api/assessment/analyze'],
    queryFn: async () => {
      if (Object.keys(answers).length === 0) return null;
      return analyzeAssessmentResults(answers);
    },
    enabled: Object.keys(answers).length > 0
  });

  const handleViewDetailedReport = () => {
    // In a real app, this would show more detailed results or generate a PDF
    alert("Detailed report feature coming soon!");
  };

  const handleTalkToAssistant = () => {
    setLocation("/chat");
  };

  if (isLoading) {
    return (
      <div className="p-4 max-w-3xl mx-auto">
        <div className="py-4">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">Analyzing Your Results</h1>
          <Card className="p-6 mb-6 text-center">
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
                <p className="text-gray-600">Please wait while we analyze your assessment...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 max-w-3xl mx-auto">
        <Card className="p-6 mb-6">
          <CardContent>
            <div className="text-center py-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Something went wrong</h2>
              <p className="text-gray-600 mb-6">We couldn't process your assessment results. Please try again.</p>
              <Button onClick={() => setLocation("/assessment/intro")}>
                Start Over
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="p-4 max-w-3xl mx-auto">
        <Card className="p-6 mb-6">
          <CardContent>
            <div className="text-center py-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">No Results Available</h2>
              <p className="text-gray-600 mb-6">Please complete the assessment to see your results.</p>
              <Button onClick={() => setLocation("/assessment/intro")}>
                Take Assessment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="py-4">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">Mental Wellness Assessment</h1>
        <div className="flex justify-between items-center mb-8">
          <div className="w-full flex items-center">
            <div className="relative flex items-center justify-center">
              <div className="progress-step active">1</div>
              <div className="absolute -bottom-6 w-max text-xs font-medium">Intro</div>
            </div>
            <div className="flex-1 h-1 bg-primary mx-2"></div>
            <div className="relative flex items-center justify-center">
              <div className="progress-step active">2</div>
              <div className="absolute -bottom-6 w-max text-xs font-medium">Mood</div>
            </div>
            <div className="flex-1 h-1 bg-primary mx-2"></div>
            <div className="relative flex items-center justify-center">
              <div className="progress-step active">3</div>
              <div className="absolute -bottom-6 w-max text-xs font-medium">Thoughts</div>
            </div>
            <div className="flex-1 h-1 bg-primary mx-2"></div>
            <div className="relative flex items-center justify-center">
              <div className="progress-step active">4</div>
              <div className="absolute -bottom-6 w-max text-xs font-medium">Results</div>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Mental Wellness Results</h2>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Wellness Score</span>
              <span className="text-sm font-medium text-primary">{results.overallScore}/100</span>
            </div>
            <Progress value={results.overallScore} className="h-3" />
            <p className="mt-2 text-sm text-gray-600">{results.summary}</p>
          </div>

          <div className="mb-8">
            <div className="mb-4">
              <h3 className="font-medium text-gray-800 mb-2">Your Mental Health Profile</h3>
              <p className="text-sm text-gray-600">This radar chart shows your scores across different mental health dimensions.</p>
            </div>

            <div className="bg-neutral-light p-4 rounded-lg">
              <MentalHealthRadarChart
                moodScore={results.moodScore}
                anxietyScore={results.anxietyScore}
                socialScore={results.socialScore}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-accent/20 p-3 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-1">Mood & Emotions</h4>
                <div className="flex items-center mb-1">
                  <Progress value={results.moodScore} className="h-2 mr-2" />
                  <span className="text-sm text-gray-600">{results.moodScore}%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Higher score indicates better mood regulation</p>
              </div>

              <div className="bg-accent/20 p-3 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-1">Anxiety Levels</h4>
                <div className="flex items-center mb-1">
                  <Progress value={results.anxietyScore} className="h-2 mr-2" />
                  <span className="text-sm text-gray-600">{results.anxietyScore}%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Higher score indicates lower anxiety levels</p>
              </div>

              <div className="bg-accent/20 p-3 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-1">Social Connections</h4>
                <div className="flex items-center mb-1">
                  <Progress value={results.socialScore} className="h-2 mr-2" />
                  <span className="text-sm text-gray-600">{results.socialScore}%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Higher score indicates better social well-being</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-800 mb-2">What These Results Mean</h3>
            <p className="text-gray-600 text-sm">
              {results.summary}
            </p>
          </div>

          {/* Mental Health Predictions Section */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-800 mb-3">Mental Health Screening Results</h3>
            <p className="text-sm text-gray-600 mb-3">
              Based on your responses, we've generated the following mental health screening results.
              These are not diagnoses but potential indicators to discuss with a healthcare professional.
            </p>
            <div className="space-y-4">
              {results.predictions.map((prediction, index) => {
                // Choose icon and background color based on condition and severity
                let Icon = Brain;
                let bgColor = "bg-neutral-light";

                if (prediction.condition === "Depression") {
                  Icon = Brain;
                  bgColor = prediction.severity === "none" ? "bg-green-50" :
                    prediction.severity === "mild" ? "bg-yellow-50" :
                      prediction.severity === "moderate" ? "bg-orange-50" : "bg-red-50";
                } else if (prediction.condition === "Anxiety") {
                  Icon = Activity;
                  bgColor = prediction.severity === "none" ? "bg-green-50" :
                    prediction.severity === "mild" ? "bg-yellow-50" :
                      prediction.severity === "moderate" ? "bg-orange-50" : "bg-red-50";
                } else if (prediction.condition === "Social Isolation") {
                  Icon = Users;
                  bgColor = prediction.severity === "none" ? "bg-green-50" :
                    prediction.severity === "mild" ? "bg-yellow-50" :
                      prediction.severity === "moderate" ? "bg-orange-50" : "bg-red-50";
                } else if (prediction.condition === "Positive Mental Health") {
                  Icon = ThumbsUp;
                  bgColor = "bg-green-50";
                }

                return (
                  <div key={index} className={`${bgColor} p-4 rounded-lg`}>
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mr-3 mt-1">
                        <Icon className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="flex items-center mb-1">
                          <h4 className="font-medium text-gray-800">{prediction.condition}</h4>
                          {prediction.severity !== "none" && (
                            <span className={`ml-2 text-xs px-2 py-0.5 rounded ${prediction.severity === "mild" ? "bg-yellow-100 text-yellow-800" :
                                prediction.severity === "moderate" ? "bg-orange-100 text-orange-800" :
                                  prediction.severity === "severe" ? "bg-red-100 text-red-800" : ""
                              }`}>
                              {prediction.severity.charAt(0).toUpperCase() + prediction.severity.slice(1)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{prediction.description}</p>
                        {prediction.severity !== "none" && prediction.condition !== "Positive Mental Health" && (
                          <div className="flex items-center text-xs text-gray-500">
                            <AlertTriangle className="h-3.5 w-3.5 mr-1 text-gray-400" />
                            <span>
                              This is not a diagnosis. Please consult with a healthcare professional if you're concerned.
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-medium text-gray-800 mb-3">Recommendations For You</h3>
            <div className="space-y-3">
              {results.recommendations.map((rec, index) => (
                <div key={index} className="flex bg-neutral-light p-3 rounded-lg">
                  <div className="flex-shrink-0 text-primary mr-3">
                    {rec.icon === "heart" && <Heart className="h-5 w-5" />}
                    {rec.icon === "book" && <Book className="h-5 w-5" />}
                    {rec.icon === "users" && <Users className="h-5 w-5" />}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800">{rec.title}</h4>
                    <p className="text-sm text-gray-600">{rec.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Button
              onClick={handleViewDetailedReport}
              className="bg-primary hover:bg-primary-dark text-white"
            >
              View Detailed Report
            </Button>
            <Button
              onClick={handleTalkToAssistant}
              className="bg-secondary hover:bg-secondary-dark text-white"
            >
              Talk to AI Assistant
            </Button>
          </div>
        </CardContent>
      </Card>

      <EmergencyResources />
    </div>
  );
}
