import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Send, RotateCcw, AlertTriangle, Sparkles, ShieldAlert, User, Loader2 } from "lucide-react";
import EmergencyResources from "@/components/EmergencyResources";
import { sendChatMessage, type ChatMessage } from "@/lib/openai";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface ExtendedMessage extends ChatMessage {
  timestamp?: string;
  error?: boolean;
}

const STARTER_PROMPTS = [
  "How can I calm down before a stressful exam?",
  "I'm feeling disconnected from friends lately.",
  "What is a quick technique to stop overthinking?",
  "I have trouble falling asleep when my mind is racing.",
];

export default function Chat() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ExtendedMessage[]>(() => {
    return [
      {
        role: "assistant",
        content: "Hi there! I'm your ZenGen Assistant. I'm here to provide calm, practical mental wellness support and coping techniques. What's on your mind today?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ];
  });

  const [input, setInput] = useState("");
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: sendChatMessage,
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message.content,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    },
    onError: (err: any) => {
      toast({
        title: "Chat issue",
        description: "Could not send message. Please try again.",
        variant: "destructive",
      });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm having a slight problem connecting right now. Please try sending your message again.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          error: true,
        },
      ]);
    },
  });

  const handleSendMessage = (textToSend?: string) => {
    const content = textToSend || input;
    if (!content.trim() || chatMutation.isPending) return;

    const userMessage: ExtendedMessage = {
      role: "user",
      content: content.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Prepare message context
    const apiMessages: ChatMessage[] = [
      ...messages
        .filter((m) => !m.error)
        .map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: content.trim() },
    ];

    chatMutation.mutate(apiMessages);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: "Chat cleared. I'm ready whenever you'd like to share what's on your mind.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <Card className="border border-border bg-card shadow-sm overflow-hidden flex flex-col h-[75vh]">
        {/* Chat Header */}
        <CardHeader className="p-4 sm:p-5 border-b border-border bg-primary/5 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                ZenGen AI Assistant
                <span className="text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                  Online
                </span>
              </CardTitle>
              <CardDescription className="text-xs">
                Powered by Gemini 3.8 Flash • Supportive & Non-Clinical
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearChat}
            className="text-xs text-muted-foreground hover:text-foreground h-8 px-2.5 gap-1"
            title="Start new conversation"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        </CardHeader>

        {/* Messages Scroll Area */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-muted/20"
        >
          {messages.map((message, index) => {
            const isUser = message.role === "user";
            return (
              <div
                key={index}
                className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-1">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                  <div
                    className={`chat-message ${
                      isUser ? "chat-message-user" : "chat-message-bot"
                    }`}
                  >
                    {message.content.split("\n").map((paragraph, i) => (
                      <p key={i} className={i > 0 ? "mt-2" : ""}>
                        {paragraph}
                      </p>
                    ))}
                  </div>
                  {message.timestamp && (
                    <span className="text-[10px] text-muted-foreground px-1 mt-0.5">
                      {message.timestamp}
                    </span>
                  )}
                </div>

                {isUser && (
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 mt-1 font-bold text-xs">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing Indicator */}
          {chatMutation.isPending && (
            <div className="flex gap-2.5 justify-start">
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="chat-message chat-message-bot flex items-center gap-1.5 py-3 px-4">
                <span className="text-xs text-muted-foreground mr-1">Thinking</span>
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
              </div>
            </div>
          )}
        </div>

        {/* Starter Prompts (shown when only initial message) */}
        {messages.length === 1 && (
          <div className="p-3 bg-card border-t border-border shrink-0">
            <span className="text-[11px] font-semibold text-muted-foreground block mb-2 px-1">
              Suggestions to get started:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {STARTER_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(prompt)}
                  className="text-xs bg-accent/50 hover:bg-accent text-foreground px-3 py-1.5 rounded-full border border-border/80 transition-colors text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Input Bar */}
        <div className="p-3 sm:p-4 border-t border-border bg-card shrink-0 space-y-2">
          <div className="flex items-end gap-2 bg-muted/40 border border-border rounded-2xl p-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
            <Textarea
              ref={textareaRef}
              placeholder="Ask a question or share what you are going through..."
              className="flex-1 border-0 bg-transparent text-foreground placeholder:text-muted-foreground focus-visible:ring-0 resize-none min-h-[44px] max-h-32 p-2 text-sm"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={chatMutation.isPending}
            />
            <Button
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || chatMutation.isPending}
              size="icon"
              className="h-10 w-10 rounded-xl shrink-0 font-semibold"
            >
              {chatMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
            <span>Press Enter to send, Shift+Enter for newline</span>
            <span className="flex items-center gap-1 text-destructive/80 font-medium">
              <ShieldAlert className="h-3 w-3" /> Crisis? Dial 988
            </span>
          </div>
        </div>
      </Card>

      <EmergencyResources />
    </div>
  );
}
