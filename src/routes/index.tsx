import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Camera, BarChart3, ShieldCheck, ArrowRight } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => {
    const siteUrl = typeof window !== "undefined"
      ? (import.meta.env?.VITE_SITE_URL || window.location.origin)
      : (import.meta.env?.VITE_SITE_URL || "https://batirtchad.org");

    return {
      meta: [
        { title: "BATIR TCHAD – Plateforme citoyenne pour améliorer les infrastructures au Tchad" },
        { name: "description", content: "BATIR TCHAD est une plateforme citoyenne permettant de signaler les infrastructures dégradées au Tchad, de les localiser et de suivre leur traitement." },
        { name: "keywords", content: "BATIR TCHAD, infrastructures Tchad, signalement infrastructure Tchad, signaler une route dégradée au Tchad, routes dégradées Tchad, infrastructures publiques Tchad, plateforme citoyenne Tchad, signalements citoyens Tchad" },
        { property: "og:title", content: "BATIR TCHAD – Plateforme citoyenne pour améliorer les infrastructures au Tchad" },
        { property: "og:description", content: "BATIR TCHAD est une plateforme citoyenne permettant de signaler les infrastructures dégradées au Tchad, de les localiser et de suivre leur traitement." },
        { property: "og:url", content: siteUrl },
        { property: "og:type", content: "website" },
      ],
      links: [
        { rel: "canonical", href: siteUrl },
      ],
    };
  },
  component: Index,
});

function Index() {
  const { t } = useTranslation();

  const siteUrl = typeof window !== "undefined"
    ? (import.meta.env?.VITE_SITE_URL || window.location.origin)
    : (import.meta.env?.VITE_SITE_URL || "https://batirtchad.org");

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        "name": "BATIR TCHAD",
        "url": siteUrl,
        "description": "Plateforme citoyenne permettant de signaler les infrastructures dégradées au Tchad.",
        "areaServed": {
          "@type": "Country",
          "name": "Tchad"
        }
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        "url": siteUrl,
        "name": "BATIR TCHAD",
        "description": "Signalez les infrastructures publiques dégradées au Tchad.",
        "publisher": {
          "@id": `${siteUrl}/#organization`
        },
        "inLanguage": ["fr", "ar"]
      }
    ]
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)",
          backgroundSize: "60px 60px, 90px 90px",
        }} />
        <div className="container mx-auto px-4 py-20 md:py-28 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary/20 border border-secondary/30 px-3 py-1 text-xs font-medium text-secondary mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-pulse" />
              {t("home.badge")}
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight">
              {t("home.title1")} <span className="text-secondary">{t("home.titleAccent")}</span> {t("home.title2")}
            </h1>
            <p className="mt-6 text-lg md:text-xl text-primary-foreground/85 max-w-2xl">
              {t("home.subtitle")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary" className="font-semibold">
                <Link to="/signaler">
                  <Camera className="h-5 w-5 me-2" />
                  {t("home.ctaReport")}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/carte">
                  {t("home.ctaMap")}
                  <ArrowRight className="h-4 w-4 ms-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
        {/* Bandeau drapeau */}
        <div className="h-2 flex">
          <div className="flex-1 bg-primary" />
          <div className="flex-1 bg-secondary" />
          <div className="flex-1 bg-destructive" />
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold">{t("home.howTitle")}</h2>
          <p className="mt-3 text-muted-foreground">{t("home.howSub")}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Camera, title: t("home.step1Title"), desc: t("home.step1Desc"), key: 'camera' },
            { icon: MapPin, title: t("home.step2Title"), desc: t("home.step2Desc"), key: 'loc' },
            { icon: ShieldCheck, title: t("home.step3Title"), desc: t("home.step3Desc"), key: 'follow' },
          ].map((s, i) => (
            <InteractiveStep key={s.key} icon={s.icon} index={i} title={s.title} desc={s.desc} />
          ))}
        </div>
      </section>

      {/* Catégories */}
      <section className="bg-muted/40 py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold">{t("home.catTitle")}</h2>
            <p className="mt-3 text-muted-foreground">{t("home.catSub")}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {CATEGORIES.map((c) => (
              <div key={c.value} className="bg-card border rounded-xl p-4 text-center hover:border-primary/40 hover:-translate-y-1 transition-all">
                <div className="text-3xl mb-2">{c.icon}</div>
                <div className="text-sm font-medium">{t(`categories.${c.value}`)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats / CTA */}
      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="rounded-2xl bg-primary text-primary-foreground p-8 md:p-12 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary text-secondary-foreground px-3 py-1 text-xs font-semibold mb-4">
              <BarChart3 className="h-3 w-3" /> {t("home.transparencyBadge")}
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold leading-tight">
              {t("home.transparencyTitle1")} <span className="text-secondary">{t("home.transparencyAccent")}</span> {t("home.transparencyTitle2")}
            </h2>
            <p className="mt-4 text-primary-foreground/80">
              {t("home.transparencyDesc")}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 md:justify-end">
            <Button asChild size="lg" variant="secondary">
              <Link to="/carte"><MapPin className="h-5 w-5 me-2" />{t("home.exploreMap")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10">
              <Link to="/auth">{t("home.join")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function InteractiveStep({ icon: Icon, index, title, desc }: { icon: any; index: number; title: string; desc: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (index === 0) {
      // Open report page and open camera/file picker
      navigate({ to: '/signaler' + '?openCamera=1' });
      return;
    }
    if (index === 1) {
      if (!navigator.geolocation) {
        toast.error(t('signaler.errGeoUnavailable'));
        return;
      }
      setLoading(true);
      toast.info(t('signaler.locating'));
      navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLoading(false);
        toast.success(t('signaler.positionDetected'));
        navigate({ to: `/signaler?lat=${lat}&lng=${lng}` });
      }, (err) => {
        setLoading(false);
        toast.error(t('signaler.errPosition'));
      }, { enableHighAccuracy: true, timeout: 10000 });
      return;
    }
    // follow/tracking
    navigate({ to: '/signalements' });
  }

  return (
    <Card className="border-2 hover:border-primary/30 transition-colors">
      <CardContent className="pt-6">
        <button type="button" onClick={handleClick} className="w-full text-start">
          <div className="h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center mb-4">
            <Icon className="h-6 w-6" />
          </div>
          <div className="text-xs text-muted-foreground font-medium mb-1">{t('home.step')} {index + 1}</div>
          <h3 className="font-display font-bold text-lg mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground">{desc}</p>
          {loading && <div className="text-xs text-muted-foreground mt-2">{t('signaler.locating')}</div>}
        </button>
      </CardContent>
    </Card>
  );
}
