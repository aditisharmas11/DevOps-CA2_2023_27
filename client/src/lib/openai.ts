import { apiRequest } from "./queryClient";

// The newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
export const MODEL_NAME = "gpt-4o";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatResponse {
  message: ChatMessage;
}

export async function sendChatMessage(messages: ChatMessage[]): Promise<ChatResponse> {
  if (messages.length > 0 && messages[messages.length - 1].role === "user") {

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
    });

    if (!res.ok) {
      throw new Error("Chat request failed");
    }

    return res.json();

  } else {
    throw new Error("Invalid message format");
  }
}

export interface MentalHealthPrediction {
  condition: string;
  probability: number;
  severity: 'none' | 'mild' | 'moderate' | 'severe';
  description: string;
}

export interface AssessmentResult {
  overallScore: number;
  moodScore: number;
  anxietyScore: number;
  socialScore: number;
  predictions: Array<MentalHealthPrediction>;
  recommendations: Array<{
    title: string;
    description: string;
    icon: string;
  }>;
  summary: string;
}

export async function analyzeAssessmentResults(answers: Record<string, number>): Promise<AssessmentResult> {
  const response = await apiRequest("POST", "/api/assessment/analyze", { answers });
  const data = await response.json();
  return data;
}
