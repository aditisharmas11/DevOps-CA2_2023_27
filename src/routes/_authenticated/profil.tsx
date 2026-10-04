import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SeverityBadge, StatusBadge } from "@/components/SeverityBadge";
import {
  CHAD_PROVINCES,
  getCategory,
  type ReportSeverity,
  type ReportStatus,
} from "@/lib/constants";
import {
  MapPin,
  MessageCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profil")({
  head: () => ({
    meta: [
      { title: "Mon profil | BATIR TCHAD" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ProfilPage,
});

function ProfilPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  // =========================
  // PROFILE STATES
  // =========================
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);

  // =========================
  // LOAD USER PROFILE
  // =========================
  useEffect(() => {
    if (!user?.id) return;

    const loadProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Erreur chargement profil :", error);
        return;
      }

      if (data) {
        setFullName(data.full_name ?? "");
        setPhone(data.phone ?? "");
        setProvince(data.province ?? "");
        setCity(data.city ?? "");
      }
    };

    loadProfile();
  }, [user]);

  // =========================
  // LOAD ONLY CURRENT USER REPORTS
  // =========================
  const {
    data: myReports = [],
    isLoading: reportsLoading,
    error: reportsError,
  } = useQuery({
    queryKey: ["my-reports", user?.id],
    enabled: !!user?.id,

    queryFn: async () => {
      if (!user?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from("reports")
        .select(
          [
            "id",
            "title",
            "category",
            "severity",
            "status",
            "province",
            "city",
            "created_at",
            "description",
            "reporter_id",
          ].join(",")
        )
        .eq("reporter_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      return data ?? [];
    },
  });

  // =========================
  // REPORT IDS
  // =========================
  const reportIds = myReports.map((report) => report.id);

  // =========================
  // LOAD ADMIN MESSAGES
  // ONLY FOR USER REPORTS
  // =========================
  const {
    data: citizenMessages = [],
    isLoading: messagesLoading,
    error: messagesError,
  } = useQuery({
    queryKey: [
      "my-citizen-messages",
      user?.id,
      reportIds,
    ],

    enabled:
      !!user?.id &&
      reportIds.length > 0,

    queryFn: async () => {
      if (reportIds.length === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from("report_citizen_messages")
        .select(
          "report_id,message,updated_at"
        )
        .in("report_id", reportIds)
        .order("updated_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      return data ?? [];
    },
  });

  // =========================
  // CREATE MESSAGE LOOKUP
  // report_id -> message
  // =========================
  const messageByReportId = new Map(
    citizenMessages.map((item) => [
      item.report_id,
      item,
    ])
  );

  // =========================
  // SAVE PROFILE
  // =========================
  async function save(e: React.FormEvent) {
    e.preventDefault();

    if (!user?.id) {
      toast.error("Utilisateur non connecté.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        full_name: fullName,
        phone,
        province: province || null,
        city: city || null,
      });

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(t("profile.saved"));
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* =========================
          PAGE TITLE
      ========================== */}
      <h1 className="font-display text-3xl font-bold mb-6">
        {t("profile.title")}
      </h1>

      <div className="grid md:grid-cols-2 gap-6 mb-8">

        {/* =========================
            PROFILE INFORMATION
        ========================== */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("profile.info")}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form
              onSubmit={save}
              className="space-y-4"
            >
              {/* EMAIL */}
              <div className="space-y-2">
                <Label>Email</Label>

                <Input
                  value={user?.email ?? ""}
                  disabled
                />
              </div>

              {/* FULL NAME */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  {t("auth.fullName")}
                </Label>

                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) =>
                    setFullName(e.target.value)
                  }
                />
              </div>

              {/* PHONE */}
              <div className="space-y-2">
                <Label htmlFor="phone">
                  {t("profile.phone")}
                </Label>

                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value)
                  }
                />
              </div>

              {/* PROVINCE */}
              <div className="space-y-2">
                <Label>
                  {t("map.province")}
                </Label>

                <Select
                  value={province}
                  onValueChange={setProvince}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t(
                        "profile.selectProvince"
                      )}
                    />
                  </SelectTrigger>

                  <SelectContent>
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
              </div>

              {/* CITY */}
              <div className="space-y-2">
                <Label htmlFor="city">
                  {t("profile.city")}
                </Label>

                <Input
                  id="city"
                  value={city}
                  onChange={(e) =>
                    setCity(e.target.value)
                  }
                />
              </div>

              {/* SAVE */}
              <Button
                type="submit"
                disabled={saving}
              >
                {saving
                  ? t("common.loading")
                  : t("common.save")}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* =========================
            MY REPORTS
        ========================== */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("profile.myReports")} (
              {myReports.length}
              )
            </CardTitle>
          </CardHeader>

          <CardContent>

            {/* LOADING REPORTS */}
            {reportsLoading && (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                {t("common.loading")}
              </div>
            )}

            {/* REPORT ERROR */}
            {!reportsLoading &&
              reportsError && (
                <div className="text-center py-8">
                  <p className="text-sm text-red-600">
                    Impossible de charger vos signalements.
                  </p>

                  <p className="text-xs text-muted-foreground mt-2">
                    {reportsError instanceof Error
                      ? reportsError.message
                      : "Erreur Supabase"}
                  </p>
                </div>
              )}

            {/* NO REPORT */}
            {!reportsLoading &&
              !reportsError &&
              myReports.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {t("profile.emptyReports")}

                  <div className="mt-3">
                    <Button
                      asChild
                      size="sm"
                    >
                      <Link to="/signaler">
                        {t("profile.createFirst")}
                      </Link>
                    </Button>
                  </div>
                </div>
              )}

            {/* REPORT LIST */}
            {!reportsLoading &&
              !reportsError &&
              myReports.length > 0 && (
                <div className="space-y-4 max-h-[550px] overflow-y-auto pe-1">

                  {myReports.map((report) => {
                    const cat = getCategory(
                      report.category
                    );

                    const citizenMessage =
                      messageByReportId.get(
                        report.id
                      );

                    return (
                      <div
                        key={report.id}
                        className="space-y-2"
                      >

                        {/* =========================
                            REPORT CARD
                        ========================== */}
                        <Link
                          to="/signalements/$id"
                          params={{
                            id: report.id,
                          }}
                          className="block p-3 rounded-lg border hover:border-primary/40 hover:bg-muted/40 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">

                            <div className="font-medium text-sm line-clamp-1">
                              {cat.icon}{" "}
                              {report.title}
                            </div>

                            <StatusBadge
                              value={
                                report.status as ReportStatus
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between text-xs text-muted-foreground">

                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />

                              {report.city ||
                                report.province ||
                                t("common.chad")}
                            </span>

                            <SeverityBadge
                              value={
                                report.severity as ReportSeverity
                              }
                            />
                          </div>

                          <div className="text-[10px] text-muted-foreground mt-2">
                            Créé le{" "}
                            {new Date(
                              report.created_at
                            ).toLocaleString(
                              "fr-FR"
                            )}
                          </div>
                        </Link>

                        {/* =========================
                            ADMIN MESSAGE
                        ========================== */}
                        {citizenMessage?.message && (
                          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">

                            <div className="flex items-center gap-2 mb-2">
                              <MessageCircle className="h-4 w-4 text-[#002664]" />

                              <span className="text-xs font-bold text-[#002664]">
                                Message de l'administration
                              </span>
                            </div>

                            <p className="text-sm text-slate-700 leading-relaxed">
                              {citizenMessage.message}
                            </p>

                            <p className="text-[10px] text-slate-400 mt-2">
                              Mis à jour le{" "}
                              {new Date(
                                citizenMessage.updated_at
                              ).toLocaleString(
                                "fr-FR"
                              )}
                            </p>

                          </div>
                        )}

                        {/* =========================
                            NO MESSAGE YET
                        ========================== */}
                        {!messagesLoading &&
                          !citizenMessage?.message && (
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">

                              <div className="flex items-center gap-2">
                                <MessageCircle className="h-4 w-4 text-slate-400" />

                                <span className="text-xs text-slate-500">
                                  Aucun message de
                                  l'administration pour
                                  le moment.
                                </span>
                              </div>

                            </div>
                          )}

                        {/* =========================
                            MESSAGE LOAD ERROR
                        ========================== */}
                        {messagesError && (
                          <div className="text-[10px] text-red-500">
                            Impossible de charger le
                            message de l'administration.
                          </div>
                        )}

                      </div>
                    );
                  })}

                </div>
              )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}