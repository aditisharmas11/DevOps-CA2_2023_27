import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/parametres')({
  component: AdminSettings,
})

function AdminSettings() {
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <Link
        to="/admin"
        className="text-green-600 hover:underline"
      >
        ← Retour au Dashboard
      </Link>

      <h1 className="mt-6 text-3xl font-bold text-slate-900">
        Paramètres
      </h1>

      <p className="mt-2 text-slate-500">
        Paramètres de l'administration.
      </p>

      <div className="mt-8 rounded-xl border bg-white p-8">
        <p className="text-slate-500">
          Les paramètres apparaîtront ici.
        </p>
      </div>
    </div>
  )
}