import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Send } from "lucide-react";
import EmergencyResources from "@/components/EmergencyResources";
import { sendChatMessage, type ChatMessage } from "@/lib/openai";
import { useMutation } from "@tanstack/react-query";

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Initialize with welcome message
    return [
      {
        role: "assistant",
        content: "Hi there! I'm your ZenGen Assistant. I'm here to provide practical mental health support and coping strategies. Share what's on your mind, and I'll offer specific techniques and solutions that can help right away. I focus on giving you actionable advice rather than just asking questions."
      }
    ];
  });
  
  const [input, setInput] = useState("");
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);
  
  const chatMutation = useMutation({
    mutationFn: sendChatMessage,
    onSuccess: (data) => {
      setMessages(prev => [...prev, data.message]);
    }
  });
  
  const handleSendMessage = () => {
    if (!input.trim()) return;
    
    const userMessage: ChatMessage = {
      role: "user",
      content: input
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    
    // Include existing conversation history for context
    chatMutation.mutate([
      {
        role: "system",
        content: "You are ZenGen Assistant, a mental health support chatbot for teenagers. VERY IMPORTANT: Always provide direct, solution-focused responses that are concise and actionable. Avoid asking questions in your responses - instead offer practical coping strategies, clear advice, and concrete steps. Give specific techniques and tools that can be immediately implemented. Use a friendly, empathetic tone but prioritize providing direct solutions. For example, if a teen mentions anxiety, don't ask 'What triggers your anxiety?' - instead say 'Here are three proven techniques to reduce anxiety: deep breathing (inhale for 4, hold for 4, exhale for 4), progressive muscle relaxation, and thought challenging.' If the teen mentions self-harm, suicidal thoughts, or abuse, immediately instruct them to contact emergency services, a crisis line (988), or a trusted adult."
      },
      ...messages,
      userMessage
    ]);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  return (
    <div className="p-4 max-w-3xl mx-auto">
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="mb-4">
            <div className="flex items-center mb-3">
              <div className="h-10 w-10 rounded-full bg-primary-light flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <h2 className="ml-3 text-xl font-semibold text-gray-800">ZenGen Assistant</h2>
            </div>
            <p className="text-gray-600 text-sm">I'll provide specific techniques and practical solutions for whatever you're going through.</p>
          </div>
          
          <div 
            ref={chatContainerRef}
            className="h-96 overflow-y-auto mb-4 p-2 bg-neutral-light rounded-lg"
          >
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`chat-message ${message.role === "user" ? "chat-message-user" : "chat-message-bot"}`}
              >
                {message.content.split("\n").map((paragraph, i) => (
                  <p key={i} className={i > 0 ? "mt-2" : ""}>{paragraph}</p>
                ))}
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="chat-message chat-message-bot">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center bg-neutral-light rounded-lg p-2">
            <Textarea 
              placeholder="Type your message here..." 
              className="flex-1 border-0 bg-transparent text-gray-700 focus:ring-0 resize-none p-2"
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={chatMutation.isPending}
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!input.trim() || chatMutation.isPending}
              className="ml-2 bg-primary hover:bg-primary-dark text-white rounded-full p-2 w-10 h-10 flex items-center justify-center"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="mt-4 flex justify-center">
            <div className="bg-neutral-light rounded-lg p-3 max-w-md">
              <p className="text-xs text-gray-500 text-center">
                Remember: I'm an AI assistant, not a therapist or medical professional. If you're in crisis or need immediate help, please contact a crisis line or medical professional.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <EmergencyResources />
    </div>
  );
}
