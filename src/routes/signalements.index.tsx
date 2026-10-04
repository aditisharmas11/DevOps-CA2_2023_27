import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  CATEGORIES,
  STATUSES,
  CHAD_PROVINCES,
  getCategory,
  type ReportCategory,
  type ReportSeverity,
  type ReportStatus,
} from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  SeverityBadge,
  StatusBadge,
} from "@/components/SeverityBadge";
import {
  MapPin,
  Search,
} from "lucide-react";

export const Route = createFileRoute("/signalements/")({
  head: () => {
    const siteUrl =
      typeof window !== "undefined"
        ? import.meta.env?.VITE_SITE_URL ||
          window.location.origin
        : import.meta.env?.VITE_SITE_URL ||
          "https://batirtchad.org";

    const pageUrl = `${siteUrl}/signalements`;

    return {
      meta: [
        {
          title:
            "Mes signalements citoyens | BATIR TCHAD",
        },
        {
          name: "description",
          content:
            "Consultez vos signalements citoyens et suivez leur évolution sur BATIR TCHAD.",
        },
        {
          property: "og:title",
          content:
            "Mes signalements citoyens | BATIR TCHAD",
        },
        {
          property: "og:description",
          content:
            "Consultez vos signalements citoyens et suivez leur évolution sur BATIR TCHAD.",
        },
        {
          property: "og:url",
          content: pageUrl,
        },
        {
          property: "og:type",
          content: "website",
        },
      ],
      links: [
        {
          rel: "canonical",
          href: pageUrl,
        },
      ],
    };
  },

  component: ListPage,
});

function ListPage() {
  const { t } = useTranslation();

  const {
    user,
    isAdmin,
    isAuthority,
  } = useAuth();

  // Admin et Autorité peuvent voir tous les signalements.
  // Un citoyen ne voit que ses propres signalements actifs.
  const canSeeAll =
    isAdmin || isAuthority;

  const [search, setSearch] = useState("");
  const [category, setCategory] =
    useState<ReportCategory | "all">("all");
  const [status, setStatus] =
    useState<ReportStatus | "all">("all");
  const [severity, setSeverity] =
    useState<ReportSeverity | "all">("all");
  const [province, setProvince] =
    useState<string | "all">("all");

  /* =========================
     LOAD REPORTS
  ========================== */
  const {
    data: reports = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      "reports",
      "list",
      user?.id,
      canSeeAll,
    ],

    enabled: !!user?.id,

    queryFn: async () => {
      if (!user?.id) {
        return [];
      }

      let query = supabase
        .from("reports")
        .select(
          [
            "id",
            "title",
            "description",
            "category",
            "severity",
            "status",
            "province",
            "city",
            "created_at",
            "reporter_id",
            "is_withdrawn",
            "withdrawn_at",
            "withdrawn_by",
          ].join(","),
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(500);

      // =========================
      // CITIZEN
      // =========================
      if (!canSeeAll) {
        query = query
          .eq("reporter_id", user.id)
          .eq("is_withdrawn", false);
      }

      // =========================
      // ADMIN / AUTHORITY
      // =========================
      // Aucun filtre is_withdrawn ici.
      // Ils peuvent voir les signalements actifs
      // ET ceux retirés par les citoyens.

      const {
        data,
        error,
      } = await query;

      if (error) {
        throw error;
      }

      return data ?? [];
    },
  });

  /* =========================
     FILTERS
  ========================== */
  const filtered = useMemo(() => {
    const q = search
      .toLowerCase()
      .trim();

    return reports.filter((r) =>
      (category === "all" ||
        r.category === category) &&
      (status === "all" ||
        r.status === status) &&
      (severity === "all" ||
        r.severity === severity) &&
      (province === "all" ||
        r.province === province) &&
      (
        !q ||
        (r.title ?? "")
          .toLowerCase()
          .includes(q) ||
        (r.description ?? "")
          .toLowerCase()
          .includes(q)
      )
    );
  }, [
    reports,
    search,
    category,
    status,
    severity,
    province,
  ]);

  /* =========================
     NO USER
  ========================== */
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold mb-3">
            {t("list.title")}
          </h1>

          <p className="text-muted-foreground mb-6">
            Connectez-vous pour consulter vos signalements.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">

      {/* =========================
          TITLE
      ========================== */}
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">
          {canSeeAll
            ? "Tous les signalements"
            : "Mes signalements"}
        </h1>

        <p className="text-muted-foreground">
          {canSeeAll
            ? "Consultez les signalements enregistrés sur BATIR TCHAD."
            : "Consultez uniquement les signalements que vous avez créés."}
        </p>
      </div>

      {/* =========================
          FILTERS
      ========================== */}
      <Card className="mb-6">
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-5 gap-3">

          {/* SEARCH */}
          <div className="md:col-span-2 relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

            <Input
              className="ps-9"
              placeholder={t("common.search")}
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />
          </div>

          {/* CATEGORY */}
          <Select
            value={category}
            onValueChange={(v) =>
              setCategory(
                v as ReportCategory | "all",
              )
            }
          >
            <SelectTrigger>
              <SelectValue
                placeholder={t("map.category")}
              />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">
                {t("map.allCategories")}
              </SelectItem>

              {CATEGORIES.map((c) => (
                <SelectItem
                  key={c.value}
                  value={c.value}
                >
                  {c.icon}{" "}
                  {t(
                    `categories.${c.value}`,
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* STATUS */}
          <Select
            value={status}
            onValueChange={(v) =>
              setStatus(
                v as ReportStatus | "all",
              )
            }
          >
            <SelectTrigger>
              <SelectValue
                placeholder={t("map.status")}
              />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">
                {t("map.allStatuses")}
              </SelectItem>

              {STATUSES.map((s) => (
                <SelectItem
                  key={s.value}
                  value={s.value}
                >
                  {t(
                    `statuses.${s.value}`,
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* PROVINCE */}
          <Select
            value={province}
            onValueChange={setProvince}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={t("map.province")}
              />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">
                {t("map.allProvinces")}
              </SelectItem>

              {CHAD_PROVINCES.map((p) => (
                <SelectItem
                  key={p}
                  value={p}
                >
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

        </CardContent>
      </Card>

      {/* =========================
          LOADING
      ========================== */}
      {isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          {t("common.loading")}
        </div>
      )}

      {/* =========================
          ERROR
      ========================== */}
      {!isLoading && error && (
        <div className="text-center py-12">
          <p className="text-red-600 font-medium">
            Impossible de charger les signalements.
          </p>

          <p className="text-xs text-muted-foreground mt-2">
            {error instanceof Error
              ? error.message
              : "Erreur Supabase"}
          </p>
        </div>
      )}

      {/* =========================
          EMPTY
      ========================== */}
      {!isLoading &&
        !error &&
        filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {canSeeAll
              ? "Aucun signalement trouvé."
              : "Vous n'avez encore aucun signalement."}
          </div>
        )}

      {/* =========================
          REPORTS
      ========================== */}
      {!isLoading &&
        !error &&
        filtered.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">

            {filtered.map((r) => {
              const cat = getCategory(
                r.category as ReportCategory,
              );

              return (
                <Link
                  key={r.id}
                  to="/signalements/$id"
                  params={{
                    id: r.id,
                  }}
                >
                  <Card
                    className={`h-full transition-all ${
                      r.is_withdrawn
                        ? "border-orange-200 bg-orange-50/30"
                        : "hover:border-primary/40 hover:-translate-y-0.5"
                    }`}
                  >
                    <CardContent className="pt-6">

                      {/* CATEGORY + PRIORITY */}
                      <div className="flex items-start justify-between gap-2 mb-3">

                        <div className="flex items-center gap-2">
                          <span className="text-2xl">
                            {cat.icon}
                          </span>

                          <span className="text-xs font-medium text-muted-foreground uppercase">
                            {t(
                              `categories.${cat.value}`,
                            )}
                          </span>
                        </div>

                        <SeverityBadge
                          value={
                            r.severity as ReportSeverity
                          }
                        />
                      </div>

                      {/* WITHDRAWN BADGE */}
                      {r.is_withdrawn && (
                        <div className="mb-3">
                          <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                            ↩️ Retiré par le citoyen
                          </span>
                        </div>
                      )}

                      {/* TITLE */}
                      <h3 className="font-semibold mb-1 line-clamp-2">
                        {r.title}
                      </h3>

                      {/* DESCRIPTION */}
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {r.description}
                      </p>

                      {/* LOCATION + STATUS */}
                      <div className="flex items-center justify-between">

                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />

                          {r.city ||
                            r.province ||
                            t("common.chad")}
                        </div>

                        {r.is_withdrawn ? (
                          <span className="rounded-full border border-orange-200 bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                            Retiré
                          </span>
                        ) : (
                          <StatusBadge
                            value={
                              r.status as ReportStatus
                            }
                          />
                        )}
                      </div>

                      {/* DATE */}
                      <div className="mt-3 text-[10px] text-muted-foreground">
                        {new Date(
                          r.created_at,
                        ).toLocaleDateString(
                          "fr-FR",
                        )}
                      </div>

                    </CardContent>
                  </Card>
                </Link>
              );
            })}

          </div>
        )}
    </div>
  );
}