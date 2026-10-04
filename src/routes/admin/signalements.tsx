import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  RefreshCw,
  Search,
  FileText,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/admin/signalements')({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser()

    // Pas connecté
    if (!data.user) {
      throw redirect({
        to: '/auth',
      })
    }

    // Vérification du rôle
    const { data: roleData, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', data.user.id)
      .maybeSingle()

    // Seuls les admins peuvent accéder à cette page
    if (error || roleData?.role !== 'admin') {
      throw redirect({
        to: '/',
      })
    }
  },

  component: AdminReports,
})

function AdminReports() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [search, setSearch] = useState('')

  // Charger les signalements
  const loadReports = async () => {
    setLoading(true)
    setErrorMessage('')

    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erreur Supabase:', error)
        setErrorMessage(error.message)
        setReports([])
        return
      }

      setReports(data ?? [])
    } catch (error) {
      console.error(error)
      setErrorMessage(
        'Impossible de charger les signalements.'
      )
      setReports([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
  }, [])

  // Recherche
  const filteredReports = reports.filter((report) => {
    const text = search.toLowerCase()

    return (
      String(report.title ?? '')
        .toLowerCase()
        .includes(text) ||
      String(report.description ?? '')
        .toLowerCase()
        .includes(text) ||
      String(report.category ?? '')
        .toLowerCase()
        .includes(text) ||
      String(report.location ?? '')
        .toLowerCase()
        .includes(text) ||
      String(report.city ?? '')
        .toLowerCase()
        .includes(text)
    )
  })

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div>
            <Link
              to="/admin"
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-green-600 hover:text-green-700"
            >
              <ArrowLeft size={18} />
              Retour au Dashboard
            </Link>

            <h1 className="text-3xl font-bold text-slate-900">
              Signalements
            </h1>

            <p className="mt-1 text-slate-500">
              Gestion des signalements des citoyens.
            </p>
          </div>

          <button
            onClick={loadReports}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={18}
              className={loading ? 'animate-spin' : ''}
            />
            Actualiser
          </button>

        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">

        {/* Statistics */}
        <div className="grid gap-5 md:grid-cols-4">

          <StatCard
            title="Total"
            value={reports.length}
            icon={<FileText size={22} />}
          />

          <StatCard
            title="En attente"
            value={
              reports.filter(
                (r) =>
                  normalizeStatus(r.status) === 'pending' ||
                  normalizeStatus(r.status) === 'submitted'
              ).length
            }
            icon={<Clock size={22} />}
          />

          <StatCard
            title="En cours"
            value={
              reports.filter(
                (r) =>
                  normalizeStatus(r.status) === 'in_progress' ||
                  normalizeStatus(r.status) === 'processing'
              ).length
            }
            icon={<AlertTriangle size={22} />}
          />

          <StatCard
            title="Résolus"
            value={
              reports.filter(
                (r) =>
                  normalizeStatus(r.status) === 'resolved' ||
                  normalizeStatus(r.status) === 'closed'
              ).length
            }
            icon={<CheckCircle size={22} />}
          />

        </div>

        {/* Search */}
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="relative">
            <Search
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              placeholder="Rechercher un signalement..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-3 pl-12 pr-4 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </div>
        </div>

        {/* Error */}
        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
            <div className="flex items-start gap-3">
              <XCircle size={22} />

              <div>
                <p className="font-semibold">
                  Erreur lors du chargement
                </p>

                <p className="mt-1 text-sm">
                  {errorMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex min-h-60 items-center justify-center rounded-xl border bg-white">
            <div className="flex items-center gap-3 text-slate-500">
              <Loader2
                size={24}
                className="animate-spin"
              />
              Chargement des signalements...
            </div>
          </div>
        )}

        {/* Empty */}
        {!loading &&
          !errorMessage &&
          filteredReports.length === 0 && (
            <div className="rounded-xl border bg-white p-12 text-center">

              <FileText
                size={48}
                className="mx-auto mb-4 text-slate-300"
              />

              <h2 className="text-lg font-semibold text-slate-700">
                Aucun signalement
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                {search
                  ? 'Aucun signalement ne correspond à votre recherche.'
                  : 'Les signalements des citoyens apparaîtront ici.'}
              </p>

            </div>
          )}

        {/* Reports table */}
        {!loading &&
          !errorMessage &&
          filteredReports.length > 0 && (
            <div className="overflow-hidden rounded-xl border bg-white shadow-sm">

              <div className="border-b px-6 py-5">
                <h2 className="font-semibold text-slate-900">
                  Liste des signalements
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {filteredReports.length} signalement(s) affiché(s)
                </p>
              </div>

              <div className="overflow-x-auto">

                <table className="w-full">

                  <thead className="border-b bg-slate-50">
                    <tr>

                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                        Signalement
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                        Catégorie
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                        Localisation
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                        Gravité
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                        Statut
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                        Date
                      </th>

                    </tr>
                  </thead>

                  <tbody className="divide-y">

                    {filteredReports.map((report) => (
                      <tr
                        key={report.id}
                        className="transition hover:bg-slate-50"
                      >

                        {/* Title */}
                        <td className="px-6 py-5">

                          <div className="flex items-start gap-3">

                            <div className="rounded-lg bg-green-50 p-2 text-green-600">
                              <FileText size={19} />
                            </div>

                            <div>
                              <p className="font-semibold text-slate-900">
                                {report.title ||
                                  report.subject ||
                                  'Signalement sans titre'}
                              </p>

                              {report.description && (
                                <p className="mt-1 max-w-md truncate text-sm text-slate-500">
                                  {report.description}
                                </p>
                              )}

                              <p className="mt-1 text-xs text-slate-400">
                                ID : {String(report.id).slice(0, 8)}...
                              </p>
                            </div>

                          </div>

                        </td>

                        {/* Category */}
                        <td className="px-6 py-5">
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                            {report.category || 'Non définie'}
                          </span>
                        </td>

                        {/* Location */}
                        <td className="px-6 py-5">

                          <div className="flex items-center gap-2 text-sm text-slate-600">

                            <MapPin
                              size={16}
                              className="text-slate-400"
                            />

                            <span>
                              {report.location ||
                                report.address ||
                                report.city ||
                                'Non définie'}
                            </span>

                          </div>

                        </td>

                        {/* Severity */}
                        <td className="px-6 py-5">
                          <SeverityBadge
                            severity={report.severity}
                          />
                        </td>

                        {/* Status */}
                        <td className="px-6 py-5">
                          <StatusBadge
                            status={report.status}
                          />
                        </td>

                        {/* Date */}
                        <td className="px-6 py-5">

                          <div className="flex items-center gap-2 text-sm text-slate-500">

                            <Calendar size={16} />

                            {formatDate(report.created_at)}

                          </div>

                        </td>

                      </tr>
                    ))}

                  </tbody>

                </table>

              </div>

            </div>
          )}

      </main>
    </div>
  )
}

/* ----------------------------- */
/* Stat Card                     */
/* ----------------------------- */

function StatCard({
  title,
  value,
  icon,
}: {
  title: string
  value: number
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">

      <div className="flex items-center gap-3">

        <div className="rounded-lg bg-green-50 p-3 text-green-600">
          {icon}
        </div>

        <div>
          <p className="text-sm text-slate-500">
            {title}
          </p>

          <p className="text-2xl font-bold text-slate-900">
            {value}
          </p>
        </div>

      </div>

    </div>
  )
}

/* ----------------------------- */
/* Status Badge                  */
/* ----------------------------- */

function StatusBadge({
  status,
}: {
  status: string | null | undefined
}) {
  const normalized = normalizeStatus(status)

  if (
    normalized === 'resolved' ||
    normalized === 'closed'
  ) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
        <CheckCircle size={14} />
        Résolu
      </span>
    )
  }

  if (
    normalized === 'in_progress' ||
    normalized === 'processing'
  ) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-700">
        <Clock size={14} />
        En cours
      </span>
    )
  }

  if (
    normalized === 'rejected' ||
    normalized === 'rejeté'
  ) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
        <XCircle size={14} />
        Rejeté
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
      <Clock size={14} />
      {status || 'Soumis'}
    </span>
  )
}

/* ----------------------------- */
/* Severity Badge                */
/* ----------------------------- */

function SeverityBadge({
  severity,
}: {
  severity: string | null | undefined
}) {
  const value = String(severity ?? '').toLowerCase()

  if (
    value.includes('critical') ||
    value.includes('critique') ||
    value.includes('high') ||
    value.includes('élev')
  ) {
    return (
      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
        Élevée
      </span>
    )
  }

  if (
    value.includes('medium') ||
    value.includes('moyen')
  ) {
    return (
      <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-700">
        Moyenne
      </span>
    )
  }

  return (
    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
      {severity || 'Normale'}
    </span>
  )
}

/* ----------------------------- */
/* Helpers                       */
/* ----------------------------- */

function normalizeStatus(
  status: string | null | undefined
) {
  return String(status ?? '')
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_')
}

function formatDate(
  date: string | null | undefined
) {
  if (!date) {
    return '—'
  }

  const parsed = new Date(date)

  if (Number.isNaN(parsed.getTime())) {
    return '—'
  }

  return parsed.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}