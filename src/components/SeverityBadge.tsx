import { useTranslation } from "react-i18next";
import { getSeverity, getStatus, type ReportSeverity, type ReportStatus } from "@/lib/constants";

export function SeverityBadge({ value }: { value: ReportSeverity }) {
  const { t } = useTranslation();
  const s = getSeverity(value);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
      style={{ backgroundColor: s.hex }}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
      {t(`severities.${value}`)}
    </span>
  );
}

export function StatusBadge({ value }: { value: ReportStatus }) {
  const { t } = useTranslation();
  const s = getStatus(value);
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.color}`}>{t(`statuses.${value}`)}</span>;
}
