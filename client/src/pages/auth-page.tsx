import { useState } from "react";
import { useLocation, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Eye, EyeOff, Lock, User as UserIcon, ShieldCheck, HeartHandshake, Sparkles, Brain, Loader2 } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import zengenLogo from "../assets/zengen_logo.png";

const loginSchema = z.object({
  username: z.string().min(3, "Please enter your username or email (at least 3 characters)"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = loginSchema.extend({
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { user, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onLoginSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(
      {
        username: values.username.trim(),
        password: values.password,
      },
      {
        onSuccess: () => {
          toast({
            title: "Welcome back!",
            description: "Signed in successfully to your ZenGen space.",
          });
          navigate("/home");
        },
        onError: (err) => {
          const rawMsg = err.message || "Invalid credentials. Please verify your details.";
          toast({
            title: "Sign in failed",
            description: rawMsg,
            variant: "destructive",
          });
        },
      }
    );
  };

  const onRegisterSubmit = (values: z.infer<typeof registerSchema>) => {
    const trimmedUsername = values.username.trim();
    registerMutation.mutate(
      {
        username: trimmedUsername,
        password: values.password,
      },
      {
        onSuccess: () => {
          toast({
            title: "Account created!",
            description: "Welcome to ZenGen. Your wellness journey begins here.",
          });
          navigate("/home");
        },
        onError: (err) => {
          const rawMsg = err.message || "Could not register. Username may already be in use.";
          const isDuplicate =
            rawMsg.toLowerCase().includes("already exists") ||
            rawMsg.toLowerCase().includes("sign in");

          if (isDuplicate) {
            toast({
              title: "Account Already Exists",
              description: rawMsg,
              variant: "destructive",
            });
            loginForm.setValue("username", trimmedUsername);
            setActiveTab("login");
          } else {
            toast({
              title: "Registration failed",
              description: rawMsg,
              variant: "destructive",
            });
          }
        },
      }
    );
  };

  // If already logged in, redirect straight to /home
  if (user) {
    return <Redirect to="/home" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-background relative overflow-hidden transition-colors">
      {/* Absolute top right theme toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Background ambient gradient glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl grid md:grid-cols-2 rounded-3xl border border-border bg-card shadow-xl overflow-hidden relative z-10 transition-colors">
        {/* Left Side: Form */}
        <div className="p-8 sm:p-10 flex flex-col justify-center">
          <div className="mb-6 flex items-center gap-3">
            <img src={zengenLogo} alt="ZenGen Logo" className="h-10 w-10 object-contain" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">ZenGen</h1>
              <p className="text-xs text-muted-foreground">Teen Mental Wellness Companion</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 mb-6 bg-muted/60 p-1 rounded-xl">
              <TabsTrigger value="login" className="rounded-lg text-xs font-semibold">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="register" className="rounded-lg text-xs font-semibold">
                Create Account
              </TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-foreground">Welcome Back</h2>
                <p className="text-xs text-muted-foreground">Enter your credentials to access your private check-ins.</p>
              </div>

              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">Username or Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="e.g. alex@example.com or alex99"
                              className="pl-9 bg-background/50 text-sm"
                              disabled={loginMutation.isPending}
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type={showLoginPassword ? "text" : "password"}
                              placeholder="Enter your password"
                              className="pl-9 pr-9 bg-background/50 text-sm"
                              disabled={loginMutation.isPending}
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowLoginPassword(!showLoginPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                              tabIndex={-1}
                              aria-label={showLoginPassword ? "Hide password" : "Show password"}
                            >
                              {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full font-semibold mt-2 gap-2"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Signing In...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
              </Form>

              <div className="mt-4 pt-4 border-t border-border/60 text-center">
                <p className="text-xs text-muted-foreground">
                  New to ZenGen?{" "}
                  <button
                    type="button"
                    onClick={() => setActiveTab("register")}
                    className="text-primary hover:underline font-semibold"
                  >
                    Create an account
                  </button>
                </p>
              </div>
            </TabsContent>

            {/* Register Tab */}
            <TabsContent value="register">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-foreground">Join ZenGen</h2>
                <p className="text-xs text-muted-foreground">Create a private account to track your emotional well-being.</p>
              </div>

              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-3.5">
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">Username or Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Choose a username or email"
                              className="pl-9 bg-background/50 text-sm"
                              disabled={registerMutation.isPending}
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type={showRegisterPassword ? "text" : "password"}
                              placeholder="Minimum 6 characters"
                              className="pl-9 pr-9 bg-background/50 text-sm"
                              disabled={registerMutation.isPending}
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                              tabIndex={-1}
                              aria-label={showRegisterPassword ? "Hide password" : "Show password"}
                            >
                              {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Re-type your password"
                              className="pl-9 pr-9 bg-background/50 text-sm"
                              disabled={registerMutation.isPending}
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                              tabIndex={-1}
                              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
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
                    className="w-full font-semibold mt-2 gap-2"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Creating Account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </Form>

              <div className="mt-4 pt-4 border-t border-border/60 text-center">
                <p className="text-xs text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setActiveTab("login")}
                    className="text-primary hover:underline font-semibold"
                  >
                    Sign in here
                  </button>
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Side: Hero & Privacy Notice */}
        <div className="hidden md:flex flex-col justify-between p-10 bg-gradient-to-br from-primary via-primary/90 to-secondary text-white relative overflow-hidden">
          <div className="space-y-6 relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Safe & Confidential Space</span>
            </div>

            <h2 className="text-3xl font-extrabold leading-snug">
              Take Control of Your Mental Well-Being
            </h2>

            <p className="text-white/85 text-sm leading-relaxed">
              ZenGen gives you evidence-based tools, AI-guided coping techniques, and verified mental health resources customized for teens.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-white/15 backdrop-blur-sm shrink-0">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">20-Question Wellness Assessment</h3>
                  <p className="text-xs text-white/75">Scientifically framed across mood, anxiety, and social connection.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-white/15 backdrop-blur-sm shrink-0">
                  <HeartHandshake className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Empathetic AI Companion</h3>
                  <p className="text-xs text-white/75">Actionable coping strategies powered by Google Gemini 3.8 Flash.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-white/15 backdrop-blur-sm shrink-0">
                  <ShieldCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Data Privacy Guaranteed</h3>
                  <p className="text-xs text-white/75">Passwords hashed with cryptographic scrypt; your responses remain private.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 text-xs text-white/70 relative z-10 border-t border-white/15">
            Designed for teen wellness self-reflection. Not a clinical diagnostic service.
          </div>
        </div>
      </div>
    </div>
  );
}