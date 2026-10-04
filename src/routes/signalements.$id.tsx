import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MapView } from "@/components/MapView";

export const Route = createFileRoute("/signalements/$id")({
  component: ReportDetailsPage,
});

type Report = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  severity: string | null;
  status: string | null;
  province: string | null;
  city: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  reporter_id: string;
  resolution_note: string | null;
  is_withdrawn: boolean;
  withdrawn_at: string | null;
  withdrawn_by: string | null;
};

type CitizenMessage = {
  message: string;
  created_at: string;
  updated_at: string;
};

function normalizeStatus(status: string | null) {
  if (!status) return "signale";

  const value = status.toLowerCase();

  if (value === "signale" || value === "signalé") return "signale";
  if (value === "verifie" || value === "vérifié") return "verifie";
  if (value === "en_cours" || value === "en cours") return "en_cours";
  if (value === "resolu" || value === "résolu") return "resolu";
  if (value === "rejete" || value === "rejeté") return "rejete";

  return value;
}

function getSeverityLabel(
  severity: string | null,
  language: string,
) {
  const labels = {
    fr: {
      rouge: "Critique",
      orange: "Élevée",
      jaune: "Modérée",
      default: "Modérée",
    },
    en: {
      rouge: "Critical",
      orange: "High",
      jaune: "Moderate",
      default: "Moderate",
    },
    ar: {
      rouge: "حرجة",
      orange: "مرتفعة",
      jaune: "متوسطة",
      default: "متوسطة",
    },
  };

  const lang = language.startsWith("ar")
    ? "ar"
    : language.startsWith("en")
      ? "en"
      : "fr";

  return (
    labels[lang][severity as keyof typeof labels[typeof lang]] ||
    labels[lang].default
  );
}

function getSeverityClasses(severity: string | null) {
  switch (severity) {
    case "rouge":
      return "bg-red-100 text-red-700 border-red-200";
    case "orange":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "jaune":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

function getCategoryLabel(
  category: string | null,
  language: string,
) {
  if (!category) {
    return language.startsWith("ar")
      ? "غير محددة"
      : language.startsWith("en")
        ? "Not specified"
        : "Non renseignée";
  }

  const categories: Record<string, Record<string, string>> = {
    route: {
      fr: "Route",
      en: "Road",
      ar: "طريق",
    },
    pont: {
      fr: "Pont",
      en: "Bridge",
      ar: "جسر",
    },
    ecole: {
      fr: "École",
      en: "School",
      ar: "مدرسة",
    },
    sante: {
      fr: "Santé",
      en: "Health",
      ar: "الصحة",
    },
    eau: {
      fr: "Eau",
      en: "Water",
      ar: "المياه",
    },
    electricite: {
      fr: "Électricité",
      en: "Electricity",
      ar: "الكهرباء",
    },
    autre: {
      fr: "Autre",
      en: "Other",
      ar: "أخرى",
    },
  };

  const lang = language.startsWith("ar")
    ? "ar"
    : language.startsWith("en")
      ? "en"
      : "fr";

  const key = category.toLowerCase().trim();

  return categories[key]?.[lang] || category;
}

function formatDate(date: string, language: string) {
  const locale = language.startsWith("ar")
    ? "ar-TD"
    : language.startsWith("en")
      ? "en-GB"
      : "fr-FR";

  return new Date(date).toLocaleDateString(locale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(date: string, language: string) {
  const locale = language.startsWith("ar")
    ? "ar-TD"
    : language.startsWith("en")
      ? "en-GB"
      : "fr-FR";

  return new Date(date).toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ReportDetailsPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const { user, isAdmin, isAuthority } = useAuth();
  const { i18n } = useTranslation();

  const language = i18n.language || "fr";

  const [report, setReport] = useState<Report | null>(null);
  const [citizenMessage, setCitizenMessage] =
    useState<CitizenMessage | null>(null);

  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState("");

  const canAccessAllReports = isAdmin || isAuthority;

  const translations = {
    fr: {
      reportDate: "Signalement du",
      priority: "Priorité",
      currentStatus: "Statut actuel",
      tracking: "Suivi du signalement",
      trackingDescription:
        "Consultez l'avancement de votre signalement.",
      signale: "Signalé",
      signaleDescription:
        "Votre signalement a été enregistré",
      verifie: "Vérifié",
      verifieDescription:
        "Le signalement a été vérifié",
      enCours: "En cours",
      enCoursDescription:
        "Une intervention est en cours",
      resolu: "Résolu",
      resoluDescription:
        "Le problème a été résolu",
      rejete: "Rejeté",
      rejeteDescription:
        "Le signalement a été rejeté par l'administration",
      currentStep: "Étape actuelle",
      adminMessage: "Message de l'administration",
      updatedAt: "Mis à jour le",
      noAdminMessage:
        "Aucun message de l'administration pour le moment.",
      information: "Informations",
      category: "Catégorie",
      province: "Province",
      city: "Ville",
      address: "Adresse",
      notSpecified: "Non renseignée",
      description: "Description",
      noDescription:
        "Aucune description disponible.",
      location: "Localisation",
      reportPosition: "Position du signalement",
      latitude: "Latitude",
      longitude: "Longitude",
      unavailable: "Signalement indisponible",
      notFound: "Ce signalement n'existe pas.",
      noAccess:
        "Vous n'avez pas accès à ce signalement.",
      loadError:
        "Impossible de charger ce signalement.",
      back: "Retour à mes signalements",
      backPlural: "Retour aux signalements",

      withdraw: "Retirer mon signalement",
      withdrawConfirmTitle:
        "Retirer ce signalement ?",
      withdrawConfirmMessage:
        "Voulez-vous vraiment retirer ce signalement ? Il ne sera plus visible normalement dans votre liste ni sur la carte.",
      withdrawCancel: "Annuler",
      withdrawConfirm: "Oui, retirer",
      withdrawing: "Retrait en cours...",
      withdrawn: "Signalement retiré",
      withdrawnDescription:
        "Vous avez retiré ce signalement. Il n'est plus actif.",
      withdrawnByCitizen: "Retiré par le citoyen",
      withdrawError:
        "Impossible de retirer le signalement.",
    },

    en: {
      reportDate: "Report from",
      priority: "Priority",
      currentStatus: "Current status",
      tracking: "Report tracking",
      trackingDescription:
        "View the progress of your report.",
      signale: "Reported",
      signaleDescription:
        "Your report has been registered",
      verifie: "Verified",
      verifieDescription:
        "The report has been verified",
      enCours: "In progress",
      enCoursDescription:
        "An intervention is in progress",
      resolu: "Resolved",
      resoluDescription:
        "The problem has been resolved",
      rejete: "Rejected",
      rejeteDescription:
        "The report was rejected by the administration",
      currentStep: "Current step",
      adminMessage: "Administration message",
      updatedAt: "Updated on",
      noAdminMessage:
        "No message from the administration yet.",
      information: "Information",
      category: "Category",
      province: "Province",
      city: "City",
      address: "Address",
      notSpecified: "Not specified",
      description: "Description",
      noDescription:
        "No description available.",
      location: "Location",
      reportPosition: "Report location",
      latitude: "Latitude",
      longitude: "Longitude",
      unavailable: "Report unavailable",
      notFound: "This report does not exist.",
      noAccess:
        "You do not have access to this report.",
      loadError:
        "Unable to load this report.",
      back: "Back to my reports",
      backPlural: "Back to reports",

      withdraw: "Withdraw my report",
      withdrawConfirmTitle:
        "Withdraw this report?",
      withdrawConfirmMessage:
        "Are you sure you want to withdraw this report? It will no longer normally appear in your list or on the map.",
      withdrawCancel: "Cancel",
      withdrawConfirm: "Yes, withdraw",
      withdrawing: "Withdrawing...",
      withdrawn: "Report withdrawn",
      withdrawnDescription:
        "You have withdrawn this report. It is no longer active.",
      withdrawnByCitizen: "Withdrawn by citizen",
      withdrawError:
        "Unable to withdraw the report.",
    },

    ar: {
      reportDate: "بلاغ بتاريخ",
      priority: "الأولوية",
      currentStatus: "الحالة الحالية",
      tracking: "متابعة البلاغ",
      trackingDescription:
        "اطلع على تقدم معالجة البلاغ الخاص بك.",
      signale: "تم التبليغ",
      signaleDescription:
        "تم تسجيل البلاغ الخاص بك",
      verifie: "تم التحقق",
      verifieDescription:
        "تم التحقق من البلاغ",
      enCours: "قيد المعالجة",
      enCoursDescription:
        "التدخل جارٍ حاليًا",
      resolu: "تم الحل",
      resoluDescription:
        "تم حل المشكلة",
      rejete: "مرفوض",
      rejeteDescription:
        "تم رفض البلاغ من قبل الإدارة",
      currentStep: "المرحلة الحالية",
      adminMessage: "رسالة الإدارة",
      updatedAt: "تم التحديث في",
      noAdminMessage:
        "لا توجد رسالة من الإدارة حتى الآن.",
      information: "المعلومات",
      category: "الفئة",
      province: "المقاطعة",
      city: "المدينة",
      address: "العنوان",
      notSpecified: "غير محدد",
      description: "الوصف",
      noDescription:
        "لا يوجد وصف متاح.",
      location: "الموقع",
      reportPosition: "موقع البلاغ",
      latitude: "خط العرض",
      longitude: "خط الطول",
      unavailable: "البلاغ غير متاح",
      notFound: "هذا البلاغ غير موجود.",
      noAccess:
        "ليس لديك صلاحية للوصول إلى هذا البلاغ.",
      loadError:
        "تعذر تحميل هذا البلاغ.",
      back: "العودة إلى بلاغاتي",
      backPlural: "العودة إلى البلاغات",

      withdraw: "سحب البلاغ",
      withdrawConfirmTitle:
        "هل تريد سحب هذا البلاغ؟",
      withdrawConfirmMessage:
        "هل أنت متأكد من أنك تريد سحب هذا البلاغ؟ لن يظهر بعد ذلك بشكل عادي في قائمتك أو على الخريطة.",
      withdrawCancel: "إلغاء",
      withdrawConfirm: "نعم، سحب البلاغ",
      withdrawing: "جارٍ سحب البلاغ...",
      withdrawn: "تم سحب البلاغ",
      withdrawnDescription:
        "لقد قمت بسحب هذا البلاغ. لم يعد نشطًا.",
      withdrawnByCitizen: "تم سحبه من قبل المواطن",
      withdrawError:
        "تعذر سحب البلاغ.",
    },
  };

  const langKey = language.startsWith("ar")
    ? "ar"
    : language.startsWith("en")
      ? "en"
      : "fr";

  const t = translations[langKey];

  const statusSteps = [
    {
      id: "signale",
      label: t.signale,
      description: t.signaleDescription,
    },
    {
      id: "verifie",
      label: t.verifie,
      description: t.verifieDescription,
    },
    {
      id: "en_cours",
      label: t.enCours,
      description: t.enCoursDescription,
    },
    {
      id: "resolu",
      label: t.resolu,
      description: t.resoluDescription,
    },
    {
      id: "rejete",
      label: t.rejete,
      description: t.rejeteDescription,
    },
  ];

  useEffect(() => {
    async function loadReport() {
      if (!user || !id) return;

      setLoading(true);
      setError("");

      const { data: reportData, error: reportError } =
        await supabase
          .from("reports")
          .select(
            `
              id,
              title,
              description,
              category,
              severity,
              status,
              province,
              city,
              address,
              latitude,
              longitude,
              created_at,
              reporter_id,
              resolution_note,
              is_withdrawn,
              withdrawn_at,
              withdrawn_by
            `,
          )
          .eq("id", id)
          .maybeSingle();

      if (reportError) {
        console.error(reportError);
        setError(t.loadError);
        setLoading(false);
        return;
      }

      if (!reportData) {
        setError(t.notFound);
        setLoading(false);
        return;
      }

      if (
        !canAccessAllReports &&
        reportData.reporter_id !== user.id
      ) {
        setError(t.noAccess);
        setLoading(false);
        return;
      }

      setReport(reportData as Report);

      const { data: messageData } = await supabase
        .from("report_citizen_messages")
        .select("message, created_at, updated_at")
        .eq("report_id", id)
        .maybeSingle();

      setCitizenMessage(messageData);
      setLoading(false);
    }

    loadReport();
  }, [id, user, canAccessAllReports, language, t.loadError, t.notFound, t.noAccess]);

  async function handleWithdraw() {
    if (!user || !report) return;

    const confirmed = window.confirm(
      `${t.withdrawConfirmTitle}\n\n${t.withdrawConfirmMessage}`,
    );

    if (!confirmed) return;

    setWithdrawing(true);

    const { error: withdrawError } = await supabase
      .from("reports")
      .update({
        is_withdrawn: true,
        withdrawn_at: new Date().toISOString(),
        withdrawn_by: user.id,
      })
      .eq("id", report.id)
      .eq("reporter_id", user.id)
      .eq("status", "signale")
      .eq("is_withdrawn", false);

    if (withdrawError) {
      console.error(withdrawError);
      setWithdrawing(false);
      window.alert(t.withdrawError);
      return;
    }

    setWithdrawing(false);

    window.alert(t.withdrawn);

    await navigate({
      to: "/signalements",
    });
  }

  if (loading) {
    return (
      <div
        dir={langKey === "ar" ? "rtl" : "ltr"}
        className="min-h-screen bg-gray-50 px-6 py-10"
      >
        <div className="mx-auto max-w-5xl">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-1/3 rounded bg-gray-200" />
            <div className="h-32 rounded bg-gray-200" />
            <div className="h-64 rounded bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div
        dir={langKey === "ar" ? "rtl" : "ltr"}
        className="min-h-screen bg-gray-50 px-6 py-10"
      >
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl">
            ⚠️
          </div>

          <h1 className="text-xl font-bold text-gray-900">
            {t.unavailable}
          </h1>

          <p className="mt-2 text-gray-600">
            {error || t.notFound}
          </p>

          <Link
            to="/signalements"
            className="mt-6 inline-flex rounded-lg bg-[#0B2A6F] px-5 py-3 font-medium text-white"
          >
            ← {t.backPlural}
          </Link>
        </div>
      </div>
    );
  }

  const currentStatus = normalizeStatus(report.status);

  const currentStepIndex = Math.max(
    0,
    statusSteps.findIndex(
      (step) => step.id === currentStatus,
    ),
  );

  const canWithdraw =
    !canAccessAllReports &&
    report.reporter_id === user?.id &&
    report.status === "signale" &&
    !report.is_withdrawn;

  return (
    <div
      dir={langKey === "ar" ? "rtl" : "ltr"}
      className="min-h-screen bg-[#F7F9FC] px-4 py-8 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-5xl">

        <Link
          to="/signalements"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#0B2A6F] hover:underline"
        >
          ← {t.back}
        </Link>

        {/* WITHDRAWN BANNER */}
        {report.is_withdrawn && (
          <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xl">
                ↩️
              </div>

              <div>
                <h2 className="font-bold text-orange-800">
                  {t.withdrawn}
                </h2>

                <p className="mt-1 text-sm text-orange-700">
                  {t.withdrawnDescription}
                </p>

                {report.withdrawn_at && (
                  <p className="mt-2 text-xs text-orange-600">
                    {formatDateTime(
                      report.withdrawn_at,
                      language,
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* HEADER */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

            <div>
              <p className="mb-2 text-sm font-medium text-gray-500">
                {t.reportDate}{" "}
                {formatDate(report.created_at, language)}
              </p>

              <h1 className="text-2xl font-bold text-[#0B2A6F] md:text-3xl">
                {report.title}
              </h1>

              <div className="mt-3 flex flex-wrap gap-2">

                {report.category && (
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                    {getCategoryLabel(
                      report.category,
                      language,
                    )}
                  </span>
                )}

                <span
                  className={`rounded-full border px-3 py-1 text-sm font-semibold ${getSeverityClasses(
                    report.severity,
                  )}`}
                >
                  {t.priority} :{" "}
                  {getSeverityLabel(
                    report.severity,
                    language,
                  )}
                </span>

                {report.is_withdrawn && (
                  <span className="rounded-full border border-orange-200 bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-700">
                    {t.withdrawnByCitizen}
                  </span>
                )}

              </div>
            </div>

            <div
              className={`rounded-xl px-4 py-3 text-center ${
                report.is_withdrawn
                  ? "bg-orange-50"
                  : "bg-blue-50"
              }`}
            >
              <p
                className={`text-xs font-medium uppercase tracking-wide ${
                  report.is_withdrawn
                    ? "text-orange-600"
                    : "text-blue-600"
                }`}
              >
                {t.currentStatus}
              </p>

              <p
                className={`mt-1 font-bold ${
                  report.is_withdrawn
                    ? "text-orange-700"
                    : "text-[#0B2A6F]"
                }`}
              >
                {report.is_withdrawn
                  ? t.withdrawnByCitizen
                  : statusSteps[currentStepIndex]?.label ||
                    t.signale}
              </p>
            </div>

          </div>
        </div>

        {/* WITHDRAW BUTTON */}
        {canWithdraw && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-red-800">
                  {t.withdraw}
                </h2>

                <p className="mt-1 text-sm text-red-700">
                  {t.withdrawConfirmMessage}
                </p>
              </div>

              <button
                type="button"
                onClick={handleWithdraw}
                disabled={withdrawing}
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-red-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {withdrawing
                  ? t.withdrawing
                  : `🗑️ ${t.withdraw}`}
              </button>
            </div>
          </div>
        )}

        {/* TRACKING */}
        {!report.is_withdrawn && (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <h2 className="text-xl font-bold text-gray-900">
              {t.tracking}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {t.trackingDescription}
            </p>

            <div className="mt-8">

              {statusSteps.map((step, index) => {
                const completed =
                  index <= currentStepIndex;

                const active =
                  index === currentStepIndex;

                return (
                  <div
                    key={step.id}
                    className="relative flex gap-4"
                  >

                    {index <
                      statusSteps.length - 1 && (
                      <div
                        className={`absolute left-[15px] top-8 h-16 w-0.5 ${
                          index < currentStepIndex
                            ? "bg-[#0B2A6F]"
                            : "bg-gray-200"
                        }`}
                      />
                    )}

                    <div
                      className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                        completed
                          ? "border-[#0B2A6F] bg-[#0B2A6F] text-white"
                          : "border-gray-300 bg-white text-gray-400"
                      }`}
                    >
                      {completed ? "✓" : "○"}
                    </div>

                    <div className="pb-8">

                      <p
                        className={`font-semibold ${
                          active
                            ? "text-[#0B2A6F]"
                            : "text-gray-800"
                        }`}
                      >
                        {step.label}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {step.description}
                      </p>

                      {active && (
                        <span className="mt-2 inline-block rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-800">
                          {t.currentStep}
                        </span>
                      )}

                    </div>
                  </div>
                );
              })}

            </div>
          </div>
        )}

        {/* ADMIN MESSAGE */}
        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-6">

          <div className="flex items-start gap-4">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0B2A6F] text-xl text-white">
              💬
            </div>

            <div className="flex-1">

              <h2 className="text-lg font-bold text-[#0B2A6F]">
                {t.adminMessage}
              </h2>

              {citizenMessage ? (
                <>
                  <div className="mt-3 rounded-xl border border-blue-100 bg-white p-4">
                    <p className="whitespace-pre-wrap text-gray-700">
                      {citizenMessage.message}
                    </p>
                  </div>

                  <p className="mt-2 text-xs text-gray-500">
                    {t.updatedAt}{" "}
                    {formatDateTime(
                      citizenMessage.updated_at ||
                        citizenMessage.created_at,
                      language,
                    )}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-gray-600">
                  {t.noAdminMessage}
                </p>
              )}

            </div>
          </div>
        </div>

        {/* INFORMATION + DESCRIPTION */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <h2 className="text-lg font-bold text-gray-900">
              {t.information}
            </h2>

            <div className="mt-5 space-y-4">

              <div>
                <p className="text-xs font-medium uppercase text-gray-400">
                  {t.category}
                </p>

                <p className="mt-1 font-medium text-gray-800">
                  {getCategoryLabel(
                    report.category,
                    language,
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-gray-400">
                  {t.province}
                </p>

                <p className="mt-1 font-medium text-gray-800">
                  {report.province || t.notSpecified}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-gray-400">
                  {t.city}
                </p>

                <p className="mt-1 font-medium text-gray-800">
                  {report.city || t.notSpecified}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-gray-400">
                  {t.address}
                </p>

                <p className="mt-1 font-medium text-gray-800">
                  {report.address || t.notSpecified}
                </p>
              </div>

            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <h2 className="text-lg font-bold text-gray-900">
              {t.description}
            </h2>

            <p className="mt-4 whitespace-pre-wrap leading-7 text-gray-700">
              {report.description || t.noDescription}
            </p>

          </div>
        </div>

        {/* MAP */}
        {!report.is_withdrawn &&
          report.latitude !== null &&
          report.longitude !== null && (
            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

              <h2 className="text-lg font-bold text-gray-900">
                {t.location}
              </h2>

              <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">

                <MapView
                  points={[
                    {
                      id: report.id,
                      latitude: report.latitude,
                      longitude: report.longitude,
                      title: report.title,
                      severity: (report.severity || "jaune") as
                        | "rouge"
                        | "orange"
                        | "jaune",
                      category:
                        report.category || "autre",
                      status:
                        report.status || "signale",
                      city: report.city,
                      province: report.province,
                    },
                  ]}
                  center={[
                    report.latitude,
                    report.longitude,
                  ]}
                  zoom={15}
                  height="420px"
                  interactive={true}
                />

              </div>

              <div className="mt-4 rounded-xl bg-gray-50 p-4">

                <p className="text-sm font-medium text-gray-700">
                  📍{" "}
                  {report.address ||
                    t.reportPosition}
                </p>

                <p className="mt-2 text-xs text-gray-500">
                  {t.latitude} : {report.latitude} —{" "}
                  {t.longitude} : {report.longitude}
                </p>

              </div>
            </div>
          )}

        {/* BACK */}
        <div className="mt-8 pb-10">

          <Link
            to="/signalements"
            className="inline-flex rounded-xl border border-gray-300 bg-white px-5 py-3 font-medium text-gray-700 shadow-sm"
          >
            ← {t.back}
          </Link>

        </div>

      </div>
    </div>
  );
}