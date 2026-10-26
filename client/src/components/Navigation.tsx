import { useLocation, Link } from "wouter";
import { User, LogOut, ShieldAlert, Sparkles, Brain, MessageSquare, BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import zengenLogo from "../assets/zengen_logo.png";

export default function Navigation() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const navLinks = [
    { href: "/home", label: "Home" },
    { href: "/assessment/intro", label: "Assessment", icon: Brain },
    { href: "/chat", label: "AI Chat", icon: MessageSquare },
    { href: "/resources", label: "Resources", icon: BookOpen },
    { href: "/crisis", label: "Crisis Support", icon: ShieldAlert },
  ];

  return (
    <nav className="bg-background/85 backdrop-blur-md border-b border-border fixed top-0 inset-x-0 z-50 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <Link href="/home">
            <div className="flex items-center gap-2.5 cursor-pointer group">
              <img
                src={zengenLogo}
                className="h-9 w-9 object-contain transition-transform group-hover:scale-105"
                alt="ZenGen Logo"
              />
              <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                ZenGen
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navLinks.map((link) => {
              const isActive = location === link.href || (link.href !== "/home" && location.startsWith(link.href.replace("/intro", "")));
              return (
                <Link key={link.href} href={link.href}>
                  <div
                    className={`px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                      isActive
                        ? "bg-accent/60 text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                    }`}
                  >
                    {link.label}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Right Action Icons: Theme Toggle, Profile, Get Help */}
          <div className="flex items-center space-x-2">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Profile Link (if logged in) */}
            {user && (
              <Link href="/profile">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-9 px-3 gap-1.5 rounded-full ${
                    location === "/profile" ? "bg-accent text-primary font-semibold" : "text-muted-foreground"
                  }`}
                  title="Your Profile"
                >
                  <div className="h-6 w-6 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center uppercase">
                    {user.username.charAt(0)}
                  </div>
                  <span className="hidden lg:inline text-xs font-medium max-w-[100px] truncate">
                    {user.username}
                  </span>
                </Button>
              </Link>
            )}

            {/* Get Help Now Action */}
            <Link href="/crisis">
              <Button
                variant="destructive"
                size="sm"
                className="rounded-full px-3.5 text-xs font-semibold gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Get Help Now</span>
                <span className="sm:hidden">Help</span>
              </Button>
            </Link>

            {/* Logout icon button */}
            {user && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="h-9 w-9 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Log out"
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
