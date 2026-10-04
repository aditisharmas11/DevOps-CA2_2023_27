import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/statistiques')({
  component: AdminStatistics,
})

function AdminStatistics() {
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <Link
        to="/admin"
        className="text-green-600 hover:underline"
      >
        ← Retour au Dashboard
      </Link>

      <h1 className="mt-6 text-3xl font-bold text-slate-900">
        Statistiques
      </h1>

      <p className="mt-2 text-slate-500">
        Statistiques et analyses de la plateforme.
      </p>

      <div className="mt-8 rounded-xl border bg-white p-8">
        <p className="text-slate-500">
          Les statistiques apparaîtront ici.
        </p>
      </div>
    </div>
  )
}
