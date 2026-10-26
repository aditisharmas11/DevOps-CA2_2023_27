import { useLocation, Link } from "wouter";
import { Home, Brain, MessageSquare, BookOpen, ShieldAlert, User } from "lucide-react";

export default function MobileNavigation() {
  const [location] = useLocation();

  const links = [
    { href: "/home", label: "Home", icon: Home },
    { href: "/assessment/intro", label: "Assessment", icon: Brain },
    { href: "/chat", label: "Chat", icon: MessageSquare },
    { href: "/resources", label: "Resources", icon: BookOpen },
    { href: "/crisis", label: "Crisis", icon: ShieldAlert },
    { href: "/profile", label: "Profile", icon: User },
  ];

  return (
    <div className="fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur-md border-t border-border md:hidden z-40 transition-colors">
      <div className="flex justify-around items-center px-2 py-2">
        {links.map((link) => {
          const isActive = location === link.href || (link.href !== "/home" && location.startsWith(link.href.replace("/intro", "")));
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href}>
              <div
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg cursor-pointer transition-colors ${
                  isActive
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                <span className="text-[10px] mt-1 tracking-tight">{link.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
