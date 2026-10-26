import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";

import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Assessment from "@/pages/Assessment";
import AssessmentIntro from "@/pages/AssessmentIntro";
import AssessmentQuestion from "@/pages/AssessmentQuestion";
import AssessmentResults from "@/pages/AssessmentResults";
import Chat from "@/pages/Chat";
import Resources from "@/pages/Resources";
import Profile from "@/pages/Profile";
import CrisisSupport from "@/pages/CrisisSupport";
import AuthPage from "@/pages/auth-page";

import Navigation from "@/components/Navigation";
import MobileNavigation from "@/components/MobileNavigation";

function AppContent() {
  const { user, isLoading } = useAuth();

  // Clean loading indicator while determining auth state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Loading ZenGen...
        </p>
      </div>
    );
  }

  // If unauthenticated, force the Sign In / Create Account page immediately
  if (!user) {
    return (
      <Switch>
        <Route path="/auth" component={AuthPage} />
        {/* Any path for unauthenticated users directly renders AuthPage */}
        <Route component={AuthPage} />
      </Switch>
    );
  }

  // Authenticated app experience
  return (
    <>
      <Navigation />
      <main className="pt-16 pb-20 md:pb-8 min-h-screen">
        <Switch>
          {/* Root redirect to home */}
          <Route path="/">
            <Redirect to="/home" />
          </Route>

          {/* Already logged in: redirect /auth back to /home */}
          <Route path="/auth">
            <Redirect to="/home" />
          </Route>

          {/* Protected routes */}
          <Route path="/home" component={Home} />
          <Route path="/assessment" component={Assessment} />
          <Route path="/assessment/intro" component={AssessmentIntro} />
          <Route path="/assessment/question/:id" component={AssessmentQuestion} />
          <Route path="/assessment/results" component={AssessmentResults} />
          <Route path="/chat" component={Chat} />
          <Route path="/resources" component={Resources} />
          <Route path="/profile" component={Profile} />
          <Route path="/crisis" component={CrisisSupport} />

          {/* 404 fallback */}
          <Route component={NotFound} />
        </Switch>
      </main>
      <MobileNavigation />
    </>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
              <AppContent />
            </div>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;