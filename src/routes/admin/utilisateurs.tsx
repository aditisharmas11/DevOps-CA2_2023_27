import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Search,
  Users,
  ShieldCheck,
  User,
  RefreshCw,
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/admin/utilisateurs')({
  component: AdminUsers,
})

type UserProfile = {
  id: string
  full_name: string | null
  created_at: string | null
  role: string
  email: string
  account_status: 'active' | 'blocked'
  blocked_at: string | null
  blocked_by: string | null
  blocked_reason: string | null
}

function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  async function loadUsers() {
    setLoading(true)
    setError('')

    try {
      // Récupérer les profils
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(
          'id, full_name, created_at, account_status, blocked_at, blocked_by, blocked_reason',
        )
        .order('created_at', { ascending: false })

      if (profilesError) {
        throw profilesError
      }

      // Récupérer les rôles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')

      if (rolesError) {
        throw rolesError
      }

      const roleMap = new Map(
        (roles ?? []).map((item) => [item.user_id, item.role]),
      )

      /*
       * L'email se trouve dans auth.users et ne peut pas être lu
       * directement depuis le navigateur avec le client Supabase.
       *
       * On affiche donc les informations disponibles dans profiles
       * et user_roles.
       */
      const formattedUsers: UserProfile[] = (profiles ?? []).map(
        (profile) => ({
          id: profile.id,
          full_name: profile.full_name,
          created_at: profile.created_at,
          role: roleMap.get(profile.id) ?? 'citizen',
          email: '—',
          account_status: profile.account_status ?? 'active',
          blocked_at: profile.blocked_at ?? null,
          blocked_by: profile.blocked_by ?? null,
          blocked_reason: profile.blocked_reason ?? null,
        }),
      )

      setUsers(formattedUsers)
    } catch (err) {
      console.error('Erreur chargement utilisateurs:', err)
      setError(
        'Impossible de charger les utilisateurs. Vérifiez les permissions Supabase.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const filteredUsers = users.filter((user) => {
    const query = search.toLowerCase()

    return (
      user.full_name?.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query) ||
      user.id.toLowerCase().includes(query)
    )
  })

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-8">
        {/* Retour */}
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-green-600 hover:text-green-700"
        >
          <ArrowLeft size={18} />
          Retour au Dashboard
        </Link>

        {/* Header */}
        <div className="mt-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Utilisateurs
            </h1>

            <p className="mt-2 text-slate-500">
              Gestion des utilisateurs de BATIR TCHAD Connect.
            </p>
          </div>

          <button
            onClick={loadUsers}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={loading ? 'animate-spin' : ''}
            />
            Actualiser
          </button>
        </div>

        {/* Stat */}
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-50 p-3 text-green-600">
                <Users size={22} />
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Total utilisateurs
                </p>

                <p className="text-3xl font-bold text-slate-900">
                  {users.length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
                <User size={22} />
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Citoyens
                </p>

                <p className="text-3xl font-bold text-slate-900">
                  {users.filter((u) => u.role === 'citizen').length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-50 p-3 text-purple-600">
                <ShieldCheck size={22} />
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Administrateurs
                </p>

                <p className="text-3xl font-bold text-slate-900">
                  {users.filter((u) => u.role === 'admin').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recherche */}
        <div className="mt-8 rounded-xl border bg-white p-4 shadow-sm">
          <div className="relative">
            <Search
              size={19}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              placeholder="Rechercher un utilisateur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border px-10 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Tableau */}
        <div className="mt-6 overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <h2 className="font-semibold text-slate-900">
              Liste des utilisateurs
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {filteredUsers.length} utilisateur(s) affiché(s)
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-52 items-center justify-center">
              <div className="text-center">
                <RefreshCw
                  size={30}
                  className="mx-auto animate-spin text-green-600"
                />

                <p className="mt-3 text-sm text-slate-500">
                  Chargement des utilisateurs...
                </p>
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex min-h-52 items-center justify-center">
              <div className="text-center">
                <Users
                  size={40}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-3 font-medium text-slate-600">
                  Aucun utilisateur trouvé
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  Aucun utilisateur ne correspond à votre recherche.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                      Utilisateur
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                      ID
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                      Rôle
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                      Inscription
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-600">
                            <User size={19} />
                          </div>

                          <div>
                            <p className="font-medium text-slate-900">
                              {user.full_name || 'Utilisateur'}
                            </p>

                            <p className="text-xs text-slate-400">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-mono text-xs text-slate-500">
                          {user.id.slice(0, 8)}...
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            user.role === 'admin'
                              ? 'bg-purple-50 text-purple-700'
                              : user.role === 'authority'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-green-50 text-green-700'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-500">
                        {user.created_at
                          ? new Date(
                              user.created_at,
                            ).toLocaleDateString('fr-FR')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}