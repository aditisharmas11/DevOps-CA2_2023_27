import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation();
  const language = i18n.language || "fr";
  const isAr = language.startsWith("ar");
  const isEn = language.startsWith("en");

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border border-primary-foreground/40 overflow-hidden",
        className,
      )}
    >
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => i18n.changeLanguage("fr")}
        className={cn(
          "rounded-none px-2.5 py-1 text-xs gap-1 hover:bg-primary/50",
          !isAr && !isEn
            ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
            : "text-primary-foreground",
        )}
        aria-pressed={!isAr && !isEn}
      >
        <span aria-hidden>🇫🇷</span>
        <span className="font-semibold">FR</span>
      </Button>

      <div className="w-px bg-primary-foreground/40 h-4" />

      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => i18n.changeLanguage("en")}
        className={cn(
          "rounded-none px-2.5 py-1 text-xs gap-1 hover:bg-primary/50",
          isEn
            ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
            : "text-primary-foreground",
        )}
        aria-pressed={isEn}
      >
        <span aria-hidden>🇬🇧</span>
        <span className="font-semibold">EN</span>
      </Button>

      <div className="w-px bg-primary-foreground/40 h-4" />

      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => i18n.changeLanguage("ar")}
        className={cn(
          "rounded-none px-2.5 py-1 text-xs gap-1 hover:bg-primary/50",
          isAr
            ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
            : "text-primary-foreground",
        )}
        aria-pressed={isAr}
      >
        <span aria-hidden>🇸🇦</span>
        <span className="font-semibold">AR</span>
      </Button>
    </div>
  );
}