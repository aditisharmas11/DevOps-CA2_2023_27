import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const searchSchema = z.object({ mode: z.enum(["login", "signup"]).optional(), next: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/" });
  },
  head: () => ({
  meta: [
    { title: "Se connecter | BATIR TCHAD" },
    {
      name: "description",
      content: "Espace de connexion et de création de compte citoyen sur BATIR TCHAD.",
    },
    { name: "robots", content: "noindex, nofollow" },
  ],
}),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { mode, next } = Route.useSearch();
  const [tab, setTab] = useState<"login" | "signup">(mode ?? "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");

  useEffect(() => {
    if (mode) setTab(mode);
  }, [mode]);

  // Handle Supabase auth redirects (magic links / password recovery)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Parse access_token/refresh_token from URL hash (returned by Supabase on redirect)
        const raw = window.location.hash || window.location.search || '';
        const params = new URLSearchParams(raw.replace(/^#/, '').replace(/^\?/, ''));
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        const type = params.get('type') || '';
        if (access_token) {
          // establish session client-side
          await supabase.auth.setSession({ access_token, refresh_token } as any);
          if (mounted) {
            if (type === 'recovery' || raw.includes('recovery')) {
              setResetMode(true);
              return;
            }
            navigate({ to: '/' });
          }
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Veuillez remplir tous les champs.");
      return;
    }
    setLoading(true);
    try {
      const res = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (res.error) {
        let msg = res.error.message;
        if (/Invalid login credentials/i.test(msg)) {
          msg = "Adresse e-mail ou mot de passe incorrect.";
        } else if (/Email not confirmed/i.test(msg) || /User not confirmed/i.test(msg)) {
          msg = "Veuillez confirmer votre adresse e-mail avant de vous connecter.";
        }
        toast.error(msg);
        return;
      }
      toast.success(t('auth.welcomeToast'));
      navigate({ to: next ?? '/' });
    } catch (err) {
      setLoading(false);
      toast.error("Une erreur s'est produite. Veuillez réessayer.");
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName?.trim()) { toast.error("Le nom complet est requis."); return; }
    if (!email?.trim()) { toast.error("L'adresse e-mail est requise."); return; }
    if (password.length < 6) { toast.error(t("auth.pwdTooShort")); return; }
    if (password !== confirm) { toast.error(t('auth.passwordMismatch') ?? 'Les mots de passe ne correspondent pas.'); return; }
    setLoading(true);
    try {
      const { data: resData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: { full_name: fullName },
        },
      });
      setLoading(false);
      if (error) {
        const msg = error.message.includes("already registered") || error.message.includes("already")
          ? "Un compte existe déjà avec cette adresse e-mail."
          : error.message;
        toast.error(msg);
        return;
      }

      if (resData.user) {
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: resData.user.id,
      full_name: fullName,
    });

  if (profileError) {
    console.warn("Erreur lors de la création du profil :", profileError);
  }
}

      if (resData.session) {
        toast.success(t("auth.accountCreated") ?? "Compte créé avec succès !");
        navigate({ to: next ?? '/' });
      } else {
        toast.info("Compte créé avec succès ! Si la confirmation d'e-mail est activée, vérifiez votre boîte de réception.");
        setTab("login");
      }
    } catch (err) {
      setLoading(false);
      toast.error("Une erreur s'est produite lors de l'inscription.");
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotEmail) { toast.error(t('auth.email') + ' ' + (t('common.required') ?? '')); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, { redirectTo: `${window.location.origin}/auth` });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('auth.resetSent') ?? '');
    setForgotMode(false);
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (resetPassword.length < 6) { toast.error(t('auth.pwdTooShort')); return; }
    if (resetPassword !== resetConfirm) { toast.error(t('auth.passwordMismatch')); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: resetPassword });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('auth.resetDone') ?? '');
    setResetMode(false);
    navigate({ to: '/auth' });
  }

  return (
    <div className="container mx-auto px-4 py-16 flex justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-display font-bold mb-2">BT</div>
          <CardTitle className="font-display text-2xl">{t("auth.welcome")}</CardTitle>
          <CardDescription>{t("auth.welcomeSub")}</CardDescription>
        </CardHeader>
        <CardContent>
          {resetMode ? (
            <div className="py-6">
              <h3 className="font-semibold mb-2">{t('auth.resetPassword') ?? 'Réinitialiser le mot de passe'}</h3>
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-password">{t('auth.password')}</Label>
                  <Input id="reset-password" type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reset-confirm">{t('auth.confirmPassword')}</Label>
                  <Input id="reset-confirm" type="password" value={resetConfirm} onChange={(e) => setResetConfirm(e.target.value)} required />
                </div>
                <div className="flex gap-2">
                  <Button type="submit">{t('auth.resetDone') ?? 'Confirmer'}</Button>
                </div>
              </form>
            </div>
          ) : (
            <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="login">{t("auth.tabLogin")}</TabsTrigger>
                <TabsTrigger value="signup">{t("auth.tabSignup")}</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                {!forgotMode ? (
                  <form onSubmit={handleLogin} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">{t("auth.email")}</Label>
                      <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2 relative">
                      <Label htmlFor="password">{t("auth.password")}</Label>
                      <Input id="password" type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} />
                      <button type="button" aria-label="Toggle password visibility" onClick={() => setShowPassword((s) => !s)} className="absolute end-3 top-9">
                        {showPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                        {t("auth.signInBtn")}
                      </Button>
                    </div>
                    <div className="text-sm text-center">
                      <button type="button" className="underline" onClick={() => setForgotMode(true)}>{t('auth.forgot') ?? 'Mot de passe oublié ?'}</button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleForgot} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">{t('auth.email')}</Label>
                      <Input id="forgot-email" type="email" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1" disabled={loading}>{t('auth.resetPasswordBtn') ?? 'Envoyer'}</Button>
                      <Button type="button" variant="outline" onClick={() => setForgotMode(false)}>{t('common.cancel')}</Button>
                    </div>
                  </form>
                )}
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t("auth.fullName")}</Label>
                    <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-s">{t("auth.email")}</Label>
                    <Input id="email-s" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2 relative">
                    <Label htmlFor="password-s">{t("auth.password")}</Label>
                    <Input id="password-s" type={showPassword ? 'text' : 'password'} minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
                    <button type="button" aria-label="Toggle password visibility" onClick={() => setShowPassword((s) => !s)} className="absolute end-3 top-9">
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                    <p className="text-xs text-muted-foreground">{t("auth.passwordHint")}</p>
                  </div>
                  <div className="space-y-2 relative">
                    <Label htmlFor="confirm-s">{t('auth.confirmPassword') ?? 'Confirmer le mot de passe'}</Label>
                    <Input id="confirm-s" type={showConfirm ? 'text' : 'password'} minLength={6} required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                    <button type="button" aria-label="Toggle confirm password visibility" onClick={() => setShowConfirm((s) => !s)} className="absolute end-3 top-9">
                      {showConfirm ? '🙈' : '👁️'}
                    </button>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                    {t("auth.signUpBtn")}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
