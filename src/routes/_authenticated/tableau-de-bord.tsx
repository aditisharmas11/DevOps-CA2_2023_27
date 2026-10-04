import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SeverityBadge, StatusBadge } from "@/components/SeverityBadge";
import { MapView, type MapPoint } from "@/components/MapView";
import {
  CATEGORIES,
  STATUSES,
  SEVERITIES,
  CHAD_PROVINCES,
  getCategory,
  getSeverity,
  type ReportCategory,
  type ReportSeverity,
  type ReportStatus,
} from "@/lib/constants";
import {
  BarChart3,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Search,
  Lock,
  Users,
  MapPin,
  Settings,
  Bell,
  RefreshCw,
  Download,
  Eye,
  UserCheck,
  ShieldAlert,
  Calendar,
  Globe,
  Sliders,
  Activity,
  Check,
  Edit,
  Info,
  Clock,
  LayoutDashboard,
  Shield,
  Layers,
  Plus,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/tableau-de-bord")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Tableau de bord Administrateur | BATIR TCHAD" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DashboardPage,
});

function exportToCSV(reports: any[]) {
  const headers = ["ID", "Titre", "Categorie", "Priorite", "Statut", "Province", "Ville", "Date"];
  const rows = reports.map((r) => [
    r.id,
    `"${(r.title || "").replace(/"/g, '""')}"`,
    r.category,
    r.severity,
    r.status,
    `"${r.province || ""}"`,
    `"${r.city || ""}"`,
    new Date(r.created_at).toISOString(),
  ]);
  const csvContent =
    "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `batir_tchad_signalements_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { user, isAdmin, isAuthority, loading: authLoading } = useAuth();

  const isAuthorized = isAdmin || isAuthority;

  // Active Tab state
  const [activeTab, setActiveTab] = useState("overview");

  // Filters for reports table
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ReportCategory | "all">("all");
  const [status, setStatus] = useState<ReportStatus | "all">("all");
  const [severity, setSeverity] = useState<ReportSeverity | "all">("all");
  const [province, setProvince] = useState<string | "all">("all");

  // Report Detail / Edit Modal State
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState<ReportStatus>("signale");
  const [resolutionNote, setResolutionNote] = useState("");
  const [citizenMessage, setCitizenMessage] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [reportPhotos, setReportPhotos] = useState<string[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  // User Role Edit Modal State
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

const [newUserRole, setNewUserRole] = useState<
  "citizen" | "authority" | "admin"
>("citizen");

const [isUpdatingRole, setIsUpdatingRole] = useState(false);

const [blockDialogOpen, setBlockDialogOpen] = useState(false);

const [blockReason, setBlockReason] = useState("");

const [isBlocking, setIsBlocking] = useState(false);
  // Direct Supabase Data Queries
  const { data: reports = [], isLoading: reportsLoading, refetch: refetchReports } = useQuery({
    queryKey: ["dashboard-reports"],
    enabled: isAuthorized,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id,title,category,severity,status,province,city,created_at,reporter_id,description,latitude,longitude,address,resolution_note,reviewed_at,reviewed_by,is_withdrawn,withdrawn_at,withdrawn_by")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: usersList = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ["dashboard-users"],
    enabled: isAuthorized,
    queryFn: async () => {
      const { data: profiles, error: profErr } = await supabase
  .from("profiles")
  .select(
    "id,full_name,phone,province,city,created_at,account_status,blocked_at,blocked_by,blocked_reason",
  )
  .order("created_at", { ascending: false });
      if (profErr) throw profErr;

      const { data: roles } = await supabase.from("user_roles").select("user_id,role");
      const { data: reportsData } = await supabase.from("reports").select("reporter_id");

      const roleMap: Record<string, string> = {};
      for (const r of roles ?? []) {
        roleMap[r.user_id] = r.role;
      }

      const reportCountMap: Record<string, number> = {};
      for (const rep of reportsData ?? []) {
        if (rep.reporter_id) {
          reportCountMap[rep.reporter_id] = (reportCountMap[rep.reporter_id] ?? 0) + 1;
        }
      }

      return (profiles ?? []).map((p) => ({
        ...p,
        role: roleMap[p.id] ?? "citizen",
        reportCount: reportCountMap[p.id] ?? 0,
      }));
    },
  });

  // Calculate statistics
  const stats = useMemo(() => {
    const total = reports.length;
    const activeReports = reports.filter((r) => !r.is_withdrawn);
    const pending = activeReports.filter((r) => r.status === "signale").length;
    const inProgress = activeReports.filter((r) => r.status === "en_cours").length;
    const resolved = activeReports.filter((r) => r.status === "resolu").length;
    const critical = activeReports.filter((r) => r.severity === "rouge").length;
    const verified = activeReports.filter((r) => r.status === "verifie").length;

    const byProvince: Record<string, number> = {};
    for (const r of reports) if (r.province) byProvince[r.province] = (byProvince[r.province] ?? 0) + 1;

    const byCategory: Record<string, number> = {};
    for (const r of reports) byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;

    const bySeverity: Record<string, number> = {};
    for (const r of reports) bySeverity[r.severity] = (bySeverity[r.severity] ?? 0) + 1;

    const byStatus: Record<string, number> = {};
    for (const r of reports) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;

    return {
      total,
      pending,
      inProgress,
      resolved,
      critical,
      verified,
      totalUsers: usersList.length,
      byProvince,
      byCategory,
      bySeverity,
      byStatus,
    };
  }, [reports, usersList]);

  // Critical reports ONLY for section 4 (Alerts & Notifications)
  const criticalReports = useMemo(() => {
    return reports.filter((r) => r.severity === "rouge" && !r.is_withdrawn);
  }, [reports]);

  // Filtered reports table
  const filteredReports = useMemo(() => {
    const q = search.toLowerCase().trim();
    return reports.filter(
      (r) =>
        (category === "all" || r.category === category) &&
        (status === "all" || r.status === status) &&
        (severity === "all" || r.severity === severity) &&
        (province === "all" || r.province === province) &&
        (!q || r.title.toLowerCase().includes(q) || (r.city && r.city.toLowerCase().includes(q)))
    );
  }, [reports, search, category, status, severity, province]);

  // Map points format
  const mapPoints: MapPoint[] = useMemo(() => {
    return reports
      .filter((r) => !r.is_withdrawn && r.latitude && r.longitude)
      .map((r) => ({
        id: r.id,
        title: r.title,
        latitude: r.latitude,
        longitude: r.longitude,
        severity: r.severity as ReportSeverity,
        category: r.category,
        status: r.status,
      }));
  }, [reports]);

  // Open report modal & fetch photos + citizen message
  const handleOpenReportModal = async (report: any) => {
    setSelectedReport(report);
    setEditStatus(report.status as ReportStatus);
    setResolutionNote(report.resolution_note || "");
    setCitizenMessage("");
    setReportPhotos([]);
    setLoadingPhotos(true);

    try {
      // Load the message visible to the citizen who created this report.
      const { data: citizenMsg, error: citizenMsgError } = await supabase
        .from("report_citizen_messages")
        .select("message")
        .eq("report_id", report.id)
        .maybeSingle();

      if (citizenMsgError) {
        console.error("Error loading citizen message:", citizenMsgError);
      }

      setCitizenMessage(citizenMsg?.message || "");

      // Load report photos.
      const { data: imgs } = await supabase
        .from("report_images")
        .select("id,storage_path")
        .eq("report_id", report.id);

      if (imgs && imgs.length > 0) {
        const urls: string[] = [];
        for (const img of imgs) {
          if (img.storage_path) {
            const { data: signed } = await supabase.storage
              .from("report-photos")
              .createSignedUrl(img.storage_path, 60 * 60 * 24);
            if (signed?.signedUrl) {
              urls.push(signed.signedUrl);
            }
          }
        }
        setReportPhotos(urls);
      }
    } catch (e) {
      console.error("Error loading report details:", e);
    } finally {
      setLoadingPhotos(false);
    }
  };

  // Submit status + citizen message update
  const handleSaveStatus = async () => {
    if (!selectedReport) return;
    setIsUpdatingStatus(true);

    try {
      // 1. Update the report status and private internal note.
      const { error: updateErr } = await supabase
        .from("reports")
        .update({
          status: editStatus,
          resolution_note: resolutionNote || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id || null,
        })
        .eq("id", selectedReport.id);

      if (updateErr) throw updateErr;

      // 2. Save the separate message visible to the citizen.
      const cleanCitizenMessage = citizenMessage.trim();

      if (cleanCitizenMessage) {
        const { error: citizenMessageError } = await supabase
          .from("report_citizen_messages")
          .upsert(
            {
              report_id: selectedReport.id,
              message: cleanCitizenMessage,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "report_id",
            }
          );

        if (citizenMessageError) throw citizenMessageError;
      } else {
        // If the field is empty, remove the old citizen message.
        const { error: deleteMessageError } = await supabase
          .from("report_citizen_messages")
          .delete()
          .eq("report_id", selectedReport.id);

        if (deleteMessageError) throw deleteMessageError;
      }

      // 3. Save status history.
      try {
        await supabase.from("report_status_history").insert({
          report_id: selectedReport.id,
          old_status: selectedReport.status,
          new_status: editStatus,
          note: resolutionNote || null,
          changed_by: user?.id || null,
        });
      } catch (e) {
        // Ignored if table triggers manage history.
      }

      // 4. Refresh reports and close the modal.
      await refetchReports();
      setSelectedReport(null);
    } catch (err: any) {
      alert(t("common.error") + ": " + (err.message || String(err)));
    } finally {
      setIsUpdatingStatus(false);
    }
  };
// Submit user role update with persistent Supabase mutation
const handleSaveUserRole = async () => {
  if (!selectedUser) return;

  setIsUpdatingRole(true);

  try {
    const { data: existingRoles, error: checkErr } = await supabase
      .from("user_roles")
      .select("id, role")
      .eq("user_id", selectedUser.id);

    if (checkErr) throw checkErr;

    if (existingRoles && existingRoles.length > 0) {
      const { error: updateErr } = await supabase
        .from("user_roles")
        .update({ role: newUserRole })
        .eq("id", existingRoles[0].id);

      if (updateErr) throw updateErr;
    } else {
      const { error: insertErr } = await supabase
        .from("user_roles")
        .insert({
          user_id: selectedUser.id,
          role: newUserRole,
        });

      if (insertErr) throw insertErr;
    }

    await refetchUsers();
    setSelectedUser(null);
  } catch (err: any) {
    alert("Erreur Supabase : " + (err.message || String(err)));
  } finally {
    setIsUpdatingRole(false);
  }
};

// Block user with reason and audit history
const handleBlockUser = async () => {
  if (!selectedUser) return;

  const reason = blockReason.trim();

  if (!reason) {
    alert(t("dashboard.users.blockReasonRequired"));
    return;
  }

  if (selectedUser.account_status === "blocked") {
    return;
  }

  if (!user?.id) {
    alert(t("common.error"));
    return;
  }

  setIsBlocking(true);

  try {
    // 1. Block the account
    const { error: blockError } = await supabase
      .from("profiles")
      .update({
        account_status: "blocked",
        blocked_at: new Date().toISOString(),
        blocked_by: user.id,
        blocked_reason: reason,
      })
      .eq("id", selectedUser.id);

    if (blockError) throw blockError;

    // 2. Save the action in the audit history
    const { error: historyError } = await supabase
      .from("user_account_actions")
      .insert({
        user_id: selectedUser.id,
        action: "blocked",
        reason,
        performed_by: user.id,
      });

    if (historyError) throw historyError;

    // 3. Refresh users table
    await refetchUsers();

    // 4. Close dialog and reset
    setBlockDialogOpen(false);
    setBlockReason("");
    setSelectedUser(null);
  } catch (err: any) {
    alert(t("common.error") + ": " + (err.message || String(err)));
  } finally {
    setIsBlocking(false);
  }
};

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-slate-50 font-manrope">
        <RefreshCw className="h-10 w-10 text-[#002664] animate-spin mb-4" />
        <p className="text-slate-600 font-medium">{t("common.loading")}</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md text-center font-manrope">
        <div className="h-16 w-16 bg-red-100 text-[#C60C30] rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="h-8 w-8" />
        </div>
        <h1 className="font-sora text-2xl font-bold text-slate-900 mb-2">{t("dashboard.restricted")}</h1>
        <p className="text-slate-600 text-sm mb-6">{t("dashboard.restrictedDesc")}</p>
        <Button asChild className="bg-[#FECB00] hover:bg-amber-400 text-slate-900 font-bold">
          <Link to="/">{t("dashboard.backHome")}</Link>
        </Button>
      </div>
    );
  }

  const topProvinces = Object.entries(stats.byProvince).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const topCategories = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]);

  return (
    <div className="min-h-screen bg-slate-50 font-manrope text-slate-900 pb-16">
      {/* Header Banner - BATIR TCHAD Blue (#002664) Main Navbar Accent */}
      <div className="bg-[#002664] text-white shadow-md sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-[#FECB00] text-slate-900 flex items-center justify-center shadow-sm font-bold">
              <LayoutDashboard className="h-6 w-6 text-[#002664]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-sora text-xl md:text-2xl font-bold text-white">{t("dashboard.title")}</h1>
                <Badge variant="outline" className="border-[#FECB00] text-[#FECB00] bg-blue-950/60 text-xs font-semibold">
                  <Shield className="h-3 w-3 me-1 text-[#FECB00]" />
                  {isAdmin ? t("dashboard.users.admin") : t("dashboard.users.authority")}
                </Badge>
              </div>
              <p className="text-xs md:text-sm text-blue-100/90">{t("dashboard.subtitle")}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button asChild size="sm" className="bg-[#FECB00] hover:bg-amber-400 text-slate-900 font-bold text-xs shadow-sm">
              <Link to="/signaler">
                <Plus className="h-3.5 w-3.5 me-1" />
                {t("nav.newReport")}
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchReports();
                refetchUsers();
              }}
              className="border-blue-400/50 bg-blue-900/40 text-white hover:bg-blue-800 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5 me-1.5" />
              {t("dashboard.refresh")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(reports)}
              className="border-blue-400/50 bg-blue-900/40 text-white hover:bg-blue-800 text-xs"
            >
              <Download className="h-3.5 w-3.5 me-1.5" />
              {t("dashboard.exportData")}
            </Button>
          </div>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div className="container mx-auto px-4 overflow-x-auto scrollbar-none border-t border-blue-800/60 bg-blue-950/40">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-transparent h-12 p-0 space-x-1 sm:space-x-2">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-white data-[state=active]:text-[#002664] data-[state=active]:font-bold rounded-t-lg rounded-b-none h-12 px-4 text-xs md:text-sm font-medium text-blue-100 transition-all"
              >
                <Activity className="h-4 w-4 me-1.5 text-[#002664]" />
                {t("dashboard.tabs.overview")}
              </TabsTrigger>
              <TabsTrigger
                value="reports"
                className="data-[state=active]:bg-white data-[state=active]:text-[#002664] data-[state=active]:font-bold rounded-t-lg rounded-b-none h-12 px-4 text-xs md:text-sm font-medium text-blue-100 transition-all"
              >
                <FileText className="h-4 w-4 me-1.5 text-blue-600" />
                {t("dashboard.tabs.reports")}
                {stats.pending > 0 && (
                  <Badge className="ms-1.5 bg-[#FECB00] text-slate-900 font-bold text-[10px] px-1.5 py-0 h-4">
                    {stats.pending}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="data-[state=active]:bg-white data-[state=active]:text-[#002664] data-[state=active]:font-bold rounded-t-lg rounded-b-none h-12 px-4 text-xs md:text-sm font-medium text-blue-100 transition-all"
              >
                <Users className="h-4 w-4 me-1.5 text-purple-600" />
                {t("dashboard.tabs.users")}
              </TabsTrigger>
              <TabsTrigger
                value="map"
                className="data-[state=active]:bg-white data-[state=active]:text-[#002664] data-[state=active]:font-bold rounded-t-lg rounded-b-none h-12 px-4 text-xs md:text-sm font-medium text-blue-100 transition-all"
              >
                <MapPin className="h-4 w-4 me-1.5 text-emerald-600" />
                {t("dashboard.tabs.map")}
              </TabsTrigger>
              <TabsTrigger
                value="stats"
                className="data-[state=active]:bg-white data-[state=active]:text-[#002664] data-[state=active]:font-bold rounded-t-lg rounded-b-none h-12 px-4 text-xs md:text-sm font-medium text-blue-100 transition-all"
              >
                <BarChart3 className="h-4 w-4 me-1.5 text-indigo-600" />
                {t("dashboard.tabs.stats")}
              </TabsTrigger>
              <TabsTrigger
                value="alerts"
                className="data-[state=active]:bg-white data-[state=active]:text-[#C60C30] data-[state=active]:font-bold rounded-t-lg rounded-b-none h-12 px-4 text-xs md:text-sm font-medium text-blue-100 transition-all"
              >
                <Bell className="h-4 w-4 me-1.5 text-[#C60C30]" />
                {t("dashboard.tabs.alerts")}
                {criticalReports.length > 0 && (
                  <Badge className="ms-1.5 bg-[#C60C30] text-white text-[10px] px-1.5 py-0 h-4">
                    {criticalReports.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="data-[state=active]:bg-white data-[state=active]:text-[#002664] data-[state=active]:font-bold rounded-t-lg rounded-b-none h-12 px-4 text-xs md:text-sm font-medium text-blue-100 transition-all"
              >
                <Settings className="h-4 w-4 me-1.5 text-slate-600" />
                {t("dashboard.tabs.settings")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* TAB 1: OVERVIEW (VUE D'ENSEMBLE) */}
          <TabsContent value="overview" className="mt-0 space-y-6">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatCard
                title={t("dashboard.total")}
                value={stats.total}
                icon={FileText}
                iconBg="bg-blue-100 text-[#002664]"
                borderColor="border-blue-200"
              />
              <StatCard
                title={t("dashboard.critical")}
                value={stats.critical}
                icon={ShieldAlert}
                iconBg="bg-red-100 text-[#C60C30]"
                borderColor="border-red-200"
              />
              <StatCard
                title={t("dashboard.inProgress")}
                value={stats.inProgress}
                icon={Clock}
                iconBg="bg-amber-100 text-amber-700"
                borderColor="border-amber-200"
              />
              <StatCard
                title={t("dashboard.resolved")}
                value={stats.resolved}
                icon={CheckCircle2}
                iconBg="bg-emerald-100 text-emerald-600"
                borderColor="border-emerald-200"
              />
              <StatCard
                title={t("dashboard.totalUsers")}
                value={stats.totalUsers}
                icon={Users}
                iconBg="bg-purple-100 text-purple-600"
                borderColor="border-purple-200"
              />
            </div>

            {/* Overview Visual Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Regional Breakdown */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="font-sora text-base text-slate-900 flex items-center justify-between">
                    <span>{t("dashboard.topProvinces")}</span>
                    <MapPin className="h-4 w-4 text-slate-400" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {topProvinces.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">{t("dashboard.noData")}</p>
                  ) : (
                    topProvinces.map(([prov, count]) => {
                      const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                      return (
                        <div key={prov} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium text-slate-700">
                            <span>{prov}</span>
                            <span className="font-sora font-semibold">
                              {count} ({pct}%)
                            </span>
                          </div>
                          <Progress value={pct} className="h-2 bg-slate-100" />
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              {/* Category Breakdown */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="font-sora text-base text-slate-900 flex items-center justify-between">
                    <span>{t("dashboard.byCategory")}</span>
                    <Layers className="h-4 w-4 text-slate-400" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {topCategories.map(([catKey, count]) => {
                      const c = getCategory(catKey);
                      return (
                        <div
                          key={catKey}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100"
                        >
                          <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                            <span className="text-base">{c.icon}</span>
                            <span>{t(`categories.${c.value}`)}</span>
                          </div>
                          <span className="font-sora font-bold text-xs bg-white text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity Stream */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="font-sora text-base text-slate-900 flex items-center justify-between">
                    <span>{t("dashboard.recentActivity")}</span>
                    <Activity className="h-4 w-4 text-[#002664]" />
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    {t("dashboard.recentActivitySub")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {reports.slice(0, 5).map((r) => (
                    <div
                      key={r.id}
                      onClick={() => handleOpenReportModal(r)}
                      className="p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-all flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800 truncate">{r.title}</p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span>{r.city || r.province || t("common.chad")}</span>
                          <span>•</span>
                          <span>{new Date(r.created_at).toLocaleDateString("fr-FR")}</span>
                        </div>
                      </div>
                      {r.is_withdrawn ? (
                        <Badge className="bg-orange-100 text-orange-700 border border-orange-200 text-[10px] whitespace-nowrap">
                          ↩️ {t("dashboard.withdrawn.badge")}
                        </Badge>
                      ) : (
                        <StatusBadge value={r.status as ReportStatus} />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 2: REPORTS MANAGEMENT (GESTION DES SIGNALEMENTS) */}
          <TabsContent value="reports" className="mt-0 space-y-4">
            {/* Filter Bar */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="relative">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    className="ps-9 text-xs bg-slate-50 border-slate-200 focus:bg-white"
                    placeholder={t("common.search")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={category} onValueChange={(v) => setCategory(v as ReportCategory | "all")}>
                  <SelectTrigger className="text-xs bg-slate-50 border-slate-200">
                    <SelectValue placeholder={t("dashboard.allCategories")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("dashboard.allCategories")}</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.icon} {t(`categories.${c.value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={status} onValueChange={(v) => setStatus(v as ReportStatus | "all")}>
                  <SelectTrigger className="text-xs bg-slate-50 border-slate-200">
                    <SelectValue placeholder={t("dashboard.allStatuses")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("dashboard.allStatuses")}</SelectItem>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {t(`statuses.${s.value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={severity} onValueChange={(v) => setSeverity(v as ReportSeverity | "all")}>
                  <SelectTrigger className="text-xs bg-slate-50 border-slate-200">
                    <SelectValue placeholder={t("dashboard.allPriorities")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("dashboard.allPriorities")}</SelectItem>
                    {SEVERITIES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {t(`severities.${s.value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={province} onValueChange={setProvince}>
                  <SelectTrigger className="text-xs bg-slate-50 border-slate-200">
                    <SelectValue placeholder={t("dashboard.allProvinces")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("dashboard.allProvinces")}</SelectItem>
                    {CHAD_PROVINCES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Reports Table */}
            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start border-collapse">
                  <thead className="bg-[#002664] text-white font-semibold">
                    <tr>
                      <th className="p-3 text-start">{t("dashboard.reportCol")}</th>
                      <th className="p-3 text-start">{t("dashboard.catCol")}</th>
                      <th className="p-3 text-start">{t("dashboard.placeCol")}</th>
                      <th className="p-3 text-start">{t("dashboard.severityCol")}</th>
                      <th className="p-3 text-start">{t("dashboard.statusCol")}</th>
                      <th className="p-3 text-start">{t("dashboard.dateCol")}</th>
                      <th className="p-3 text-end">{t("dashboard.actionsCol")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredReports.map((r) => {
                      const cat = getCategory(r.category);
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3">
                            <div className="font-semibold text-slate-900 line-clamp-1 max-w-xs">{r.title}</div>
                            <div className="text-[11px] text-slate-400 font-mono">ID: {r.id.slice(0, 8)}...</div>
                          </td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                              <span>{cat.icon}</span>
                              <span>{t(`categories.${cat.value}`)}</span>
                            </span>
                          </td>
                          <td className="p-3 text-slate-600">
                            {r.city || "—"}, <span className="font-medium">{r.province || t("common.chad")}</span>
                          </td>
                          <td className="p-3">
                            <SeverityBadge value={r.severity as ReportSeverity} />
                          </td>
                          <td className="p-3">
                            {r.is_withdrawn ? (
                              <Badge className="bg-orange-100 text-orange-700 border border-orange-200 hover:bg-orange-100 font-semibold whitespace-nowrap">
                                ↩️ {t("dashboard.withdrawn.badge")}
                              </Badge>
                            ) : (
                              <StatusBadge value={r.status as ReportStatus} />
                            )}
                          </td>
                          <td className="p-3 text-slate-500 whitespace-nowrap">
                            {new Date(r.created_at).toLocaleDateString("fr-FR")}
                          </td>
                          <td className="p-3 text-end space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenReportModal(r)}
                              className="h-7 text-xs border-amber-300 text-amber-900 bg-[#FECB00] hover:bg-amber-400 font-bold"
                            >
                              <Edit className="h-3 w-3 me-1" />
                              {t("dashboard.manage")}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredReports.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          {t("dashboard.noReports")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* TAB 3: USER MANAGEMENT (GESTION DES UTILISATEURS) */}
          <TabsContent value="users" className="mt-0 space-y-4">
            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-slate-200 py-4">
                <CardTitle className="font-sora text-base text-slate-900 flex items-center justify-between">
                  <span>{t("dashboard.users.title")}</span>
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    {usersList.length} {t("dashboard.tabs.users")}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start border-collapse">
                  <thead className="bg-[#002664] text-white font-semibold">
                    <tr>
                      <th className="p-3 text-start">{t("dashboard.users.userCol")}</th>
<th className="p-3 text-start">{t("dashboard.users.contactCol")}</th>
<th className="p-3 text-start">{t("dashboard.users.roleCol")}</th>
<th className="p-3 text-start">{t("dashboard.users.statusCol")}</th>
<th className="p-3 text-start">{t("dashboard.users.reportsCol")}</th>
<th className="p-3 text-start">{t("dashboard.users.dateCol")}</th>
<th className="p-3 text-end">{t("dashboard.users.actionsCol")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-8 w-8 bg-blue-100 text-[#002664] border border-blue-200 font-bold">
                              <AvatarFallback>{(u.full_name || "U")[0].toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold text-slate-900">{u.full_name || "Citoyen Anonyme"}</div>
                              <div className="text-[10px] text-slate-400 font-mono">ID: {u.id.slice(0, 8)}...</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-slate-600">
                          <div>{u.phone || "—"}</div>
                          <div className="text-[11px] text-slate-400">{u.province || u.city || "—"}</div>
                        </td>
                        <td className="p-3">
                          {u.role === "admin" && (
                            <Badge className="bg-red-100 text-[#C60C30] border-red-200 hover:bg-red-100 font-bold">
                              {t("dashboard.users.admin")}
                            </Badge>
                          )}
                          {u.role === "authority" && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 font-bold">
                              {t("dashboard.users.authority")}
                            </Badge>
                          )}
                          {(!u.role || u.role === "citizen") && (
                            <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
                              {t("dashboard.users.citizen")}
                            </Badge>
                          )}
                        </td>
                        <td className="p-3">
  {u.account_status === "blocked" ? (
    <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 font-semibold">
      🔴 {t("dashboard.users.blocked")}
    </Badge>
  ) : (
    <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 font-semibold">
      🟢 {t("dashboard.users.active")}
    </Badge>
  )}
</td>
                        <td className="p-3 font-sora font-semibold text-slate-800">{u.reportCount || 0}</td>
                        <td className="p-3 text-slate-500 whitespace-nowrap">
                          {new Date(u.created_at).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="p-3 text-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(u);
                              setNewUserRole(u.role || "citizen");
                            }}
                            className="h-7 text-xs border-blue-300 text-[#002664] bg-blue-50 hover:bg-blue-100 font-medium"
                          >
                            <UserCheck className="h-3 w-3 me-1" />
                            {t("dashboard.users.changeRole")}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* TAB 4: INTERACTION MAP (CARTE D'INTERVENTION) */}
          <TabsContent value="map" className="mt-0">
            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-slate-200 py-3">
                <CardTitle className="font-sora text-sm text-slate-800 flex items-center justify-between">
                  <span>{t("dashboard.mapTitle")}</span>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                    {mapPoints.length} {t("dashboard.mapPointsMapped")}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <div className="h-[600px] w-full relative">
                <MapView points={mapPoints} height="100%" />
              </div>
            </Card>
          </TabsContent>

          {/* TAB 5: STATISTICS (STATISTIQUES) */}
          <TabsContent value="stats" className="mt-0 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title={t("dashboard.statsSection.resolutionRate")}
                value={`${stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%`}
                icon={CheckCircle2}
                iconBg="bg-emerald-100 text-emerald-600"
                borderColor="border-emerald-200"
              />
              <StatCard
                title={t("dashboard.statsSection.criticalCount")}
                value={stats.critical}
                icon={ShieldAlert}
                iconBg="bg-red-100 text-[#C60C30]"
                borderColor="border-red-200"
              />
              <StatCard
                title={t("dashboard.statsSection.inProgressCount")}
                value={stats.inProgress}
                icon={Clock}
                iconBg="bg-amber-100 text-amber-700"
                borderColor="border-amber-200"
              />
              <StatCard
                title={t("dashboard.statsSection.officesCount")}
                value={Object.keys(stats.byProvince).length}
                icon={MapPin}
                iconBg="bg-blue-100 text-[#002664]"
                borderColor="border-blue-200"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Distribution by Status */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="font-sora text-base text-slate-900">{t("dashboard.statsSection.byStatusTitle")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {STATUSES.map((s) => {
                    const count = stats.byStatus[s.value] || 0;
                    const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                    return (
                      <div key={s.value} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-slate-700">
                          <span>{t(`statuses.${s.value}`)}</span>
                          <span className="font-sora">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <Progress value={pct} className="h-2 bg-slate-100" />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Distribution by Severity */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="font-sora text-base text-slate-900">{t("dashboard.statsSection.bySeverityTitle")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {SEVERITIES.map((sev) => {
                    const count = stats.bySeverity[sev.value] || 0;
                    const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                    return (
                      <div key={sev.value} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-slate-700">
                          <span>{t(`severities.${sev.value}`)}</span>
                          <span className="font-sora">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <Progress value={pct} className="h-2 bg-slate-100" />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 6: NOTIFICATIONS & CRITICAL ALERTS (NOTIFICATIONS ET ALERTES) */}
          <TabsContent value="alerts" className="mt-0 space-y-4">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="bg-red-50/80 border-b border-red-100 py-3">
                <CardTitle className="font-sora text-base text-[#C60C30] flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-[#C60C30]" />
                  🔴 {t("dashboard.alerts.title")}
                </CardTitle>
                <CardDescription className="text-xs text-red-700">
                  {t("dashboard.alerts.desc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {/* CRITICAL REPORTS ONLY - FILTERED EXCLUSIVELY FOR SEVERITY === 'rouge' */}
                {criticalReports.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-xl bg-red-50/40 border border-red-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <SeverityBadge value={r.severity as ReportSeverity} />
                        <StatusBadge value={r.status as ReportStatus} />
                        <span className="text-xs text-slate-400 font-mono">
                          {new Date(r.created_at).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                      <h4 className="font-sora text-sm font-bold text-slate-900">{r.title}</h4>
                      <p className="text-xs text-slate-600 line-clamp-1">{r.description || t("dashboard.modal.noDesc")}</p>
                      <p className="text-xs text-slate-600 font-medium">
                        📍 {r.city || "—"}, {r.province || t("common.chad")}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleOpenReportModal(r)}
                      className="bg-[#C60C30] hover:bg-red-700 text-white font-bold text-xs whitespace-nowrap self-start md:self-auto shadow-sm"
                    >
                      {t("dashboard.alerts.action")}
                    </Button>
                  </div>
                ))}
                {criticalReports.length === 0 && (
                  <div className="text-center py-12">
                    <ShieldAlert className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-500">{t("dashboard.alerts.empty")}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 7: SETTINGS (PARAMÈTRES) */}
          <TabsContent value="settings" className="mt-0 space-y-6">
            <Card className="bg-white border-slate-200 shadow-sm max-w-2xl">
              <CardHeader>
                <CardTitle className="font-sora text-base text-slate-900">{t("dashboard.settingsSection.title")}</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  {t("dashboard.settingsSection.desc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Admin User Profile Info */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-4">
                  <Avatar className="h-12 w-12 bg-[#002664] text-white font-bold text-lg">
                    <AvatarFallback>{(user?.email || "A")[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-sora text-sm font-bold text-slate-900">{user?.email}</h3>
                    <p className="text-xs text-slate-500">{t("dashboard.settingsSection.accountInfo")}</p>
                  </div>
                </div>

                {/* Language Switcher */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Globe className="h-4 w-4 text-[#002664]" />
                    {t("dashboard.settingsSection.languageLabel")}
                  </label>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant={i18n.language === "fr" ? "default" : "outline"}
                      onClick={() => i18n.changeLanguage("fr")}
                      className={
                        i18n.language === "fr"
                          ? "bg-[#002664] text-white text-xs font-bold"
                          : "border-slate-300 text-slate-700 text-xs"
                      }
                    >
                      🇫🇷 FR
                    </Button>
                    <Button
                      type="button"
                      variant={i18n.language === "en" ? "default" : "outline"}
                      onClick={() => i18n.changeLanguage("en")}
                      className={
                        i18n.language === "en"
                          ? "bg-[#002664] text-white text-xs font-bold"
                          : "border-slate-300 text-slate-700 text-xs"
                      }
                    >
                      🇬🇧 EN
                    </Button>
                    <Button
                      type="button"
                      variant={i18n.language === "ar" ? "default" : "outline"}
                      onClick={() => i18n.changeLanguage("ar")}
                      className={
                        i18n.language === "ar"
                          ? "bg-[#002664] text-white text-xs font-bold"
                          : "border-slate-300 text-slate-700 text-xs"
                      }
                    >
                      🇹🇩 AR
                    </Button>
                  </div>
                </div>

                {/* Database & Infrastructure Status */}
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <h4 className="text-xs font-semibold text-slate-700">{t("dashboard.settingsSection.backendTitle")}</h4>
                  <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                    <Check className="h-4 w-4" />
                    {t("dashboard.settingsSection.connected")}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* REPORT EDIT / DETAIL MODAL */}
      {selectedReport && (
        <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
          <DialogContent className="max-w-2xl bg-white font-manrope">
            <DialogHeader>
              <DialogTitle className="font-sora text-lg font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                <span>{t("dashboard.modal.detailsTitle")}</span>
                {selectedReport.is_withdrawn ? (
                  <Badge className="bg-orange-100 text-orange-700 border border-orange-200 hover:bg-orange-100 font-semibold">
                    ↩️ {t("dashboard.withdrawn.badge")}
                  </Badge>
                ) : (
                  <StatusBadge value={selectedReport.status as ReportStatus} />
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {t("dashboard.modal.reportId")}: {selectedReport.id}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs max-h-[70vh] overflow-y-auto pe-1">
              {/* Title & Description */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                <h4 className="font-sora font-bold text-slate-900 text-sm">{selectedReport.title}</h4>
                <p className="text-slate-600 leading-relaxed">{selectedReport.description || t("dashboard.modal.noDesc")}</p>
              </div>

              {/* Photos Gallery */}
              {loadingPhotos ? (
                <p className="text-xs text-slate-400 flex items-center gap-2 py-2">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#002664]" /> {t("common.loading")}
                </p>
              ) : reportPhotos.length > 0 ? (
                <div className="space-y-1.5">
                  <h5 className="font-semibold text-slate-700">{t("dashboard.modal.photosTitle")} ({reportPhotos.length})</h5>
                  <div className="grid grid-cols-3 gap-2">
                    {reportPhotos.map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border border-slate-200">
                        <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-24 object-cover hover:scale-105 transition-transform" />
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 text-slate-700">
                <div>
                  <span className="text-slate-400 block">{t("dashboard.modal.location")}:</span>
                  <span className="font-semibold">{selectedReport.city || "—"}, {selectedReport.province || t("common.chad")}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">{t("dashboard.modal.priority")}:</span>
                  <SeverityBadge value={selectedReport.severity as ReportSeverity} />
                </div>
                <div>
                  <span className="text-slate-400 block">{t("dashboard.modal.category")}:</span>
                  <span className="font-semibold">{t(`categories.${selectedReport.category}`)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">{t("dashboard.modal.createdAt")}:</span>
                  <span className="font-semibold">{new Date(selectedReport.created_at).toLocaleString("fr-FR")}</span>
                </div>
                {selectedReport.is_withdrawn && (
                  <div className="col-span-2 rounded-lg bg-orange-50 border border-orange-200 p-3">
                    <span className="text-orange-700 block font-semibold">↩️ {t("dashboard.withdrawn.message")}</span>
                    {selectedReport.withdrawn_at && (
                      <span className="text-orange-600 text-[11px]">
                        {t("dashboard.withdrawn.date", {
  date: new Date(selectedReport.withdrawn_at).toLocaleString(),
})}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Status Modifier Form */}
              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200/80 space-y-3">
                <h4 className="font-sora font-bold text-[#002664] text-xs flex items-center gap-1.5">
                  <Edit className="h-3.5 w-3.5 text-[#002664]" />
                  {t("dashboard.modal.updateStatusTitle")}
                </h4>
                <div className="space-y-2">
                  <label className="font-semibold text-slate-700">{t("dashboard.modal.newStatusLabel")}:</label>
                  <Select value={editStatus} onValueChange={(v) => setEditStatus(v as ReportStatus)}>
                    <SelectTrigger className="bg-white border-slate-300 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {t(`statuses.${s.value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">{t("dashboard.modal.resolutionNoteLabel")}:</label>
                  <Textarea
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder={t("dashboard.modal.resolutionNotePh")}
                    className="bg-white border-slate-300 text-xs min-h-[80px]"
                  />
                  <p className="text-[11px] text-slate-500">
                    Commentaire interne : ce message reste réservé à l'administration.
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-blue-200/70">
                  <label className="font-semibold text-slate-700">
                    Message pour le citoyen :
                  </label>
                  <Textarea
                    value={citizenMessage}
                    onChange={(e) => setCitizenMessage(e.target.value)}
                    placeholder="Écrivez ici le message que le citoyen pourra voir..."
                    className="bg-white border-slate-300 text-xs min-h-[80px]"
                  />
                  <p className="text-[11px] text-slate-500">
                    Ce message sera visible uniquement par le citoyen qui a créé ce signalement.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setSelectedReport(null)} className="border-slate-300 text-xs">
                {t("dashboard.modal.cancel")}
              </Button>
              <Button
                onClick={handleSaveStatus}
                disabled={isUpdatingStatus}
                className="bg-[#002664] hover:bg-blue-900 text-white font-bold text-xs"
              >
                {isUpdatingStatus ? t("dashboard.modal.saving") : t("dashboard.modal.saveChanges")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* USER ROLE EDIT MODAL */}
      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
          <DialogContent className="max-w-md bg-white font-manrope">
            <DialogHeader>
              <DialogTitle className="font-sora text-base font-bold text-slate-900">
                {t("dashboard.users.modalTitle")}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {t("dashboard.users.userLabel")}: {selectedUser.full_name || selectedUser.id}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              <div className="space-y-2">
                <label className="font-semibold text-slate-700">{t("dashboard.users.newRoleLabel")}:</label>
                <Select
                  value={newUserRole}
                  onValueChange={(v) => setNewUserRole(v as "citizen" | "authority" | "admin")}
                >
                  <SelectTrigger className="bg-slate-50 border-slate-300 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="citizen">{t("dashboard.users.citizen")}</SelectItem>
                    <SelectItem value="authority">{t("dashboard.users.authority")}</SelectItem>
                    <SelectItem value="admin">{t("dashboard.users.admin")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setSelectedUser(null)} className="border-slate-300 text-xs">
                {t("dashboard.modal.cancel")}
              </Button>
              <Button
                onClick={handleSaveUserRole}
                disabled={isUpdatingRole}
                className="bg-[#002664] hover:bg-blue-900 text-white font-bold text-xs"
              >
                {isUpdatingRole ? t("dashboard.users.updating") : t("dashboard.users.confirmRole")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  iconBg,
  borderColor,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  borderColor: string;
}) {
  return (
    <Card className={`bg-white border shadow-sm ${borderColor}`}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${iconBg} shadow-sm shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="font-sora font-bold text-xl text-slate-900 leading-tight">{value}</div>
          <div className="text-[11px] text-slate-500 truncate mt-0.5">{title}</div>
        </div>
      </CardContent>
    </Card>
  );
}
