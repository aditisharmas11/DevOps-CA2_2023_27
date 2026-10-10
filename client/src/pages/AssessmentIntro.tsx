import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InfoIcon, CheckCircle, AlertTriangle } from "lucide-react";
import EmergencyResources from "@/components/EmergencyResources";

export default function AssessmentIntro() {
  const [, setLocation] = useLocation();

  const handleStart = () => {
    setLocation("/assessment/question/1");
  };

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
            <div className="flex-1 h-1 bg-gray-300 mx-2"></div>
            <div className="relative flex items-center justify-center">
              <div className="progress-step">2</div>
              <div className="absolute -bottom-6 w-max text-xs font-medium text-gray-500">Mood</div>
            </div>
            <div className="flex-1 h-1 bg-gray-300 mx-2"></div>
            <div className="relative flex items-center justify-center">
              <div className="progress-step">3</div>
              <div className="absolute -bottom-6 w-max text-xs font-medium text-gray-500">Thoughts</div>
            </div>
            <div className="flex-1 h-1 bg-gray-300 mx-2"></div>
            <div className="relative flex items-center justify-center">
              <div className="progress-step">4</div>
              <div className="absolute -bottom-6 w-max text-xs font-medium text-gray-500">Results</div>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Welcome to Your Mental Wellness Check-in</h2>
            <p className="text-gray-600 mb-4">This assessment will help you understand your mental health better. It takes about 5 minutes to complete.</p>
            
            <div className="bg-blue-50 border-l-4 border-primary p-4 rounded mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <InfoIcon className="h-5 w-5 text-primary mt-0.5" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-gray-700">
                    Your responses are completely anonymous. We don't collect any personal information that could identify you.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-2">Before we start:</h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-secondary mr-2 flex-shrink-0" />
                <span>Find a quiet place where you can focus</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-secondary mr-2 flex-shrink-0" />
                <span>Answer honestly - there are no right or wrong answers</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-secondary mr-2 flex-shrink-0" />
                <span>Think about how you've been feeling over the past 2 weeks</span>
              </li>
            </ul>
          </div>

          <div className="bg-red-50 border-l-4 border-destructive p-4 rounded mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-700 font-medium">
                  Important: This is not a diagnostic tool
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  This app can't replace professional help. If you're in crisis, please reach out for immediate support.
                </p>
                <p className="text-sm font-medium text-destructive mt-2">
                  Crisis Helpline: 988 or text HOME to 741741
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <Button 
              onClick={handleStart}
              className="bg-primary hover:bg-primary-dark text-white font-medium py-2 px-6 rounded-full transition duration-150 ease-in-out"
            >
              Start Assessment
            </Button>
          </div>
        </CardContent>
      </Card>

      <EmergencyResources />
    </div>
  );
}
