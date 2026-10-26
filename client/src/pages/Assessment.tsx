import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import EmergencyResources from "@/components/EmergencyResources";
import { 
  assessmentQuestions, 
  type Question, 
  type AssessmentData 
} from "@shared/schema";

export default function Assessment() {
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    // Redirect to intro page by default
    setLocation("/assessment/intro");
  }, [setLocation]);
  
  return (
    <div className="p-4 max-w-3xl mx-auto">
      <EmergencyResources />
    </div>
  );
}
