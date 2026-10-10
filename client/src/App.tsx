import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Assessment from "@/pages/Assessment";
import AssessmentIntro from "@/pages/AssessmentIntro";
import AssessmentQuestion from "@/pages/AssessmentQuestion";
import AssessmentResults from "@/pages/AssessmentResults";
import Chat from "@/pages/Chat";
import Resources from "@/pages/Resources";
import Profile from "@/pages/Profile";

import Navigation from "@/components/Navigation";
import MobileNavigation from "@/components/MobileNavigation";

function AppRoutes() {
  return (
    <>
      <Navigation />

      <main className="pt-16 pb-16 md:pb-0">
        <Switch>

          {/* Redirect root → home */}
          <Route path="/">
            <Redirect to="/home" />
          </Route>

          {/* Normal routes (no auth) */}
          <Route path="/home" component={Home} />
          <Route path="/assessment" component={Assessment} />
          <Route path="/assessment/intro" component={AssessmentIntro} />
          <Route path="/assessment/question/:id" component={AssessmentQuestion} />
          <Route path="/assessment/results" component={AssessmentResults} />
          <Route path="/chat" component={Chat} />
          <Route path="/resources" component={Resources} />
          <Route path="/profile" component={Profile} />

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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-gray-50">
          <AppRoutes />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;