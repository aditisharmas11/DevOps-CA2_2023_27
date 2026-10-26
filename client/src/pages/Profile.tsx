import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTheme } from "next-themes";
import {
  User, Lock, Eye, EyeOff, RotateCcw, Brain,
  Sparkles, Calendar, ShieldCheck, Sun, Moon,
  Monitor, LogOut, CheckCircle2, TrendingUp, ArrowRight, Loader2
} from "lucide-react";
import { AssessmentTrendChart } from "@/components/AssessmentVisualizations";
import { Link } from "wouter";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(6, "Current password must be at least 6 characters"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  });

export default function Profile() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<string>("overview");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Fetch past assessments
  const { data: history = [], isLoading: isHistoryLoading } = useQuery<any[]>({
    queryKey: ['/api/assessment/history'],
    queryFn: async () => {
      const res = await fetch('/api/assessment/history');
      if (!res.ok) return [];
      return res.json();
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: z.infer<typeof passwordSchema>) => {
      const res = await apiRequest("POST", "/api/update-password", data);
      return await res.json();
    },
    onSuccess: () => {
      passwordForm.reset();
      toast({
        title: "Password updated successfully",
        description: "Your security credentials have been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Password update failed",
        description: error.message || "Please verify your current password.",
        variant: "destructive",
      });
    },
  });

  const onPasswordSubmit = (values: z.infer<typeof passwordSchema>) => {
    updatePasswordMutation.mutate(values);
  };

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "Logged out",
          description: "You have been safely signed out.",
        });
      },
    });
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Loading your profile...</p>
      </div>
    );
  }

  const trendData = history
    .filter((h) => h.results && h.results.overallScore !== undefined)
    .map((h) => ({
      id: h.id,
      createdAt: h.createdAt || new Date().toISOString(),
      overallScore: h.results.overallScore,
    }));

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 py-8 space-y-8">
      {/* Header Profile Card */}
      <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-6 relative overflow-hidden">
        <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-secondary text-white font-extrabold text-3xl flex items-center justify-center shrink-0 shadow-md uppercase">
          {user.username.charAt(0)}
        </div>

        <div className="flex-1 text-center sm:text-left space-y-1.5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{user.username}</h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full self-center sm:self-auto">
              <ShieldCheck className="h-3 w-3" /> Private Account
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            ZenGen Member • Personal wellness records and assessments
          </p>
          <div className="flex flex-wrap gap-4 pt-2 justify-center sm:justify-start text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Brain className="h-3.5 w-3.5 text-primary" /> {history.length} Assessment{history.length === 1 ? "" : "s"} Completed
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          className="text-xs font-semibold gap-1.5 shrink-0 hover:text-destructive hover:border-destructive/40"
        >
          {logoutMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
          Sign Out
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="grid grid-cols-3 max-w-md bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg text-xs font-semibold">
            Overview
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg text-xs font-semibold">
            History ({history.length})
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg text-xs font-semibold">
            Security
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview & Preferences */}
        <TabsContent value="overview" className="space-y-6">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-lg">Account Information</CardTitle>
              <CardDescription className="text-xs">
                Your registered credentials and account configuration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Username / Email</Label>
                  <Input value={user.username} disabled className="bg-muted/40 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">User ID</Label>
                  <Input value={`USER-${user.id}`} disabled className="bg-muted/40 text-sm" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Theme Preferences */}
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-lg">Interface Theme</CardTitle>
              <CardDescription className="text-xs">
                Customize whether ZenGen displays in light, dark, or system mode.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 max-w-sm">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("light")}
                  className="font-semibold text-xs gap-1.5"
                >
                  <Sun className="h-3.5 w-3.5" /> Light
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("dark")}
                  className="font-semibold text-xs gap-1.5"
                >
                  <Moon className="h-3.5 w-3.5" /> Dark
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("system")}
                  className="font-semibold text-xs gap-1.5"
                >
                  <Monitor className="h-3.5 w-3.5" /> System
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Assessment History */}
        <TabsContent value="history" className="space-y-6">
          {trendData.length > 1 && (
            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" /> Longitudinal Wellness Trajectory
                </CardTitle>
                <CardDescription className="text-xs">
                  Scores calculated from your historical check-ins over time.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AssessmentTrendChart history={trendData} />
              </CardContent>
            </Card>
          )}

          <Card className="border border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Saved Assessments</CardTitle>
                <CardDescription className="text-xs">
                  Review your past self-reflection check-ins and dimension scores.
                </CardDescription>
              </div>
              <Link href="/assessment/intro">
                <Button size="sm" className="text-xs font-semibold gap-1">
                  New Check-In <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isHistoryLoading ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                  Loading assessment history...
                </div>
              ) : history.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <Brain className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                  <h3 className="font-semibold text-foreground text-sm">No assessments yet</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Take your first 20-question mental wellness check-in to start tracking your progress.
                  </p>
                  <Link href="/assessment/intro">
                    <Button size="sm" className="text-xs font-semibold mt-2">
                      Take First Assessment
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((item, idx) => {
                    const results = item.results || {};
                    const score = results.overallScore ?? 0;
                    const dateStr = item.createdAt
                      ? new Date(item.createdAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Recent";

                    return (
                      <div
                        key={item.id || idx}
                        className="p-4 rounded-2xl border border-border bg-card space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground">
                              Assessment #{history.length - idx}
                            </span>
                            <span className="text-xs text-muted-foreground">• {dateStr}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Score:</span>
                            <span className="text-base font-extrabold text-primary">
                              {score}/100
                            </span>
                          </div>
                        </div>

                        {/* Dimensions */}
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="p-2 rounded-xl bg-accent/40">
                            <div className="text-[10px] text-muted-foreground">Mood</div>
                            <div className="font-bold text-foreground">{results.moodScore ?? "—"}%</div>
                          </div>
                          <div className="p-2 rounded-xl bg-accent/40">
                            <div className="text-[10px] text-muted-foreground">Anxiety</div>
                            <div className="font-bold text-foreground">{results.anxietyScore ?? "—"}%</div>
                          </div>
                          <div className="p-2 rounded-xl bg-accent/40">
                            <div className="text-[10px] text-muted-foreground">Social</div>
                            <div className="font-bold text-foreground">{results.socialScore ?? "—"}%</div>
                          </div>
                        </div>

                        {results.summary && (
                          <p className="text-xs text-muted-foreground leading-relaxed italic bg-muted/30 p-2.5 rounded-xl">
                            "{results.summary}"
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Security & Password */}
        <TabsContent value="security" className="space-y-6">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-lg">Update Password</CardTitle>
              <CardDescription className="text-xs">
                Ensure your account stays secure by using a strong password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4 max-w-md">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">Current Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showCurrentPassword ? "text" : "password"}
                              placeholder="Enter your current password"
                              className="pr-9 text-sm"
                              disabled={updatePasswordMutation.isPending}
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              tabIndex={-1}
                            >
                              {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showNewPassword ? "text" : "password"}
                              placeholder="Enter new password (min. 6 characters)"
                              className="pr-9 text-sm"
                              disabled={updatePasswordMutation.isPending}
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              tabIndex={-1}
                            >
                              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">Confirm New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Re-type new password"
                              className="pr-9 text-sm"
                              disabled={updatePasswordMutation.isPending}
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              tabIndex={-1}
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="font-semibold text-xs gap-2"
                    disabled={updatePasswordMutation.isPending}
                  >
                    {updatePasswordMutation.isPending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating Password...
                      </>
                    ) : (
                      "Update Password"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}