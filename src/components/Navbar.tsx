import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { MapPin, Plus, LogOut, User as UserIcon, Menu } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Navbar() {
  const { t } = useTranslation();
  const { user, signOut, isAdmin, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [fullName, setFullName] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    if (!user) { setFullName(null); return; }
    const metaName = user.user_metadata?.full_name;
    if (metaName) setFullName(metaName);
    void (async () => {
      try {
        const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
        if (mounted && data?.full_name) setFullName(data.full_name);
      } catch {
        // Keep the account metadata name when the profile is unavailable.
      }
    })();
    return () => { mounted = false; };
  }, [user]);

  const navLinks = (
    <>
      <Link to="/carte" className="text-sm font-medium hover:text-secondary transition-colors" onClick={() => setOpen(false)}>
        {t("nav.map")}
      </Link>
      <Link to="/signalements" className="text-sm font-medium hover:text-secondary transition-colors" onClick={() => setOpen(false)}>
        {t("nav.reports")}
      </Link>
      {isAdmin && (
        <Link to="/tableau-de-bord" className="text-sm font-medium hover:text-secondary transition-colors" onClick={() => setOpen(false)}>
          {t("nav.dashboard")}
        </Link>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-50 w-full bg-primary text-primary-foreground border-b border-primary/40 backdrop-blur">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground font-display font-bold">
            BT
          </div>
          <div className="hidden sm:block">
            <div className="font-display font-bold text-base leading-tight">BATIR TCHAD</div>
            <div className="text-[10px] uppercase tracking-wider opacity-70 leading-tight">{t("nav.tagline")}</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6">{navLinks}</nav>

        <div className="flex items-center gap-2 md:hidden">
          <LanguageSwitcher />
          <button className="p-2" onClick={() => setOpen(!open)} aria-label={t("nav.menu")}>
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <LanguageSwitcher />
          {loading ? null : user ? (
            <>
              <Button asChild size="sm" variant="secondary">
                <Link to="/signaler"><Plus className="h-4 w-4 me-1" />{t("nav.report")}</Link>
              </Button>
              <div className="relative">
                <button className="inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-md hover:bg-primary/60" onClick={() => setUserMenuOpen((s) => !s)} aria-haspopup="true" aria-expanded={userMenuOpen}>
                  <UserIcon className="h-4 w-4" /> <span>Bonjour, {fullName || user.email}</span>
                </button>
                {userMenuOpen && (
                  <div className="absolute end-0 mt-2 w-48 bg-card text-card-foreground border rounded-md shadow-lg py-1 z-50">
                    <Link to="/profil" className="block px-3 py-2 text-sm hover:bg-muted/60" onClick={() => setUserMenuOpen(false)}>{t('nav.profile')}</Link>
                    <Link to="/signalements" className="block px-3 py-2 text-sm hover:bg-muted/60" onClick={() => setUserMenuOpen(false)}>{t('nav.reports')}</Link>
                    <button className="w-full text-start px-3 py-2 text-sm hover:bg-muted/60 text-destructive font-medium" onClick={() => { setUserMenuOpen(false); signOut(); }}>{t('nav.signOut')}</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost" className="text-primary-foreground hover:bg-primary/60">
                <Link to="/auth">{t("nav.signIn")}</Link>
              </Button>
              <Button asChild size="sm" variant="secondary">
                <Link to="/auth" search={{ mode: "signup" } as never}>{t("nav.signUp")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-primary/40 px-4 py-4 flex flex-col gap-4 bg-primary">
          {navLinks}
          {user ? (
            <>
              <Link to="/signaler" className="text-sm font-medium" onClick={() => setOpen(false)}>{t("nav.newReport")}</Link>
              <Link to="/profil" className="text-sm font-medium" onClick={() => setOpen(false)}>{t("nav.profile")}</Link>
              <button className="text-sm font-medium text-start" onClick={() => { setOpen(false); signOut(); }}>{t("nav.signOut")}</button>
            </>
          ) : (
            <Link to="/auth" className="text-sm font-medium" onClick={() => setOpen(false)}>{t("nav.signInOrUp")}</Link>
          )}
        </div>
      )}
    </header>
  );
}

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="mt-16 border-t bg-muted/40">
      <div className="container mx-auto px-4 py-8 text-sm text-muted-foreground flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          <span>{t("home.footerTagline")}</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/carte" className="hover:text-foreground">{t("nav.map")}</Link>
          <Link to="/signalements" className="hover:text-foreground">{t("nav.reports")}</Link>
          <span aria-hidden>·</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
}
