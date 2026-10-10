import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, MessageCircle, FileText, HeartPulse } from "lucide-react";
import EmergencyResources from "@/components/EmergencyResources";
import zengenLogo from "../assets/zengen_logo.png";

export default function Home() {
  return (
    <div className="p-4 max-w-6xl mx-auto">
      <section className="mb-8">
        <Card className="bg-gradient-to-r from-primary to-secondary overflow-hidden">
          <CardContent className="p-8 text-white">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <img 
                src={zengenLogo} 
                alt="ZenGen Logo" 
                className="w-32 h-32 object-contain"
              />
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-4 text-center md:text-left">Welcome to ZenGen</h1>
                <p className="text-lg mb-6 max-w-2xl text-center md:text-left">
                  Your mental health companion designed specifically for teenagers.
                </p>
                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  <Link href="/assessment/intro">
                    <Button variant="secondary" size="lg" className="font-medium">
                      Take Mental Health Assessment
                    </Button>
                  </Link>
                  <Link href="/chat">
                    <Button variant="outline" size="lg" className="bg-white/20 text-white hover:bg-white/30 border-white">
                      Chat with AI Assistant
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">How ZenGen Can Help</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-primary-light flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Mental Health Assessment</h3>
              <p className="text-sm text-gray-600">
                Take our evidence-based assessment to understand your mental wellbeing
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-secondary-light flex items-center justify-center mb-4">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">AI Support Chat</h3>
              <p className="text-sm text-gray-600">
                Talk through your feelings with our supportive AI assistant
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-primary-light flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Resource Library</h3>
              <p className="text-sm text-gray-600">
                Explore articles, videos, and tools for better mental health
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-secondary-light flex items-center justify-center mb-4">
                <HeartPulse className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Crisis Support</h3>
              <p className="text-sm text-gray-600">
                Access emergency resources when you need immediate help
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mb-8">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-bold mb-4 text-gray-800">About ZenGen</h2>
          <p className="text-gray-600 mb-4">
            ZenGen was created to support teenagers' mental health journey. We provide tools to help you understand your mental wellbeing, access resources, and find support when needed.
          </p>
          <div className="bg-blue-50 border-l-4 border-primary p-4 rounded">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-gray-700">
                  <strong>Your privacy matters:</strong> Everything you share on ZenGen is anonymous. We don't collect any personal information that could identify you.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <EmergencyResources />
    </div>
  );
}
