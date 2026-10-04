import {
  createFileRoute,
  redirect,
  Link,
  useNavigate,
} from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/integrations/supabase/client'
import {
  BarChart3,
  Bell,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'

export const Route = createFileRoute('/admin/')({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser()

    // Pas connecté → page de connexion
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

    // Seulement les administrateurs peuvent accéder à /admin
    if (error || roleData?.role !== 'admin') {
      throw redirect({
        to: '/',
      })
    }

    return {
      user: data.user,
    }
  },

  component: AdminDashboard,
})

function AdminDashboard() {
  const { i18n } = useTranslation()
  const navigate = useNavigate()

  /*
   * Détection de la langue actuelle
   */
  const lang = i18n.language?.startsWith('ar')
    ? 'ar'
    : i18n.language?.startsWith('en')
      ? 'en'
      : 'fr'

  const isArabic = lang === 'ar'

  /*
   * Traductions du Dashboard Admin
   */
  const translations = {
    fr: {
      administration: 'Administration',
      dashboard: 'Dashboard',
      overview: 'Vue générale de BATIR TCHAD Connect',

      welcome: 'Bienvenue, Administrateur 👋',
      activityOverview:
        "Voici un aperçu de l'activité de la plateforme.",

      users: 'Utilisateurs',
      registeredUsers: 'Utilisateurs inscrits',

      reports: 'Signalements',
      reportsReceived: 'Signalements reçus',

      messages: 'Messages',
      pendingMessages: 'Messages en attente',

      activity: 'Activité',
      systemOperational: 'Système opérationnel',

      statistics: 'Statistiques',
      settings: 'Paramètres',

      recentReports: 'Signalements récents',
      latestActivities:
        'Dernières activités de la plateforme',

      viewAll: 'Voir tout',

      noRecentReports:
        'Aucun signalement récent',

      newReportsAppear:
        'Les nouveaux signalements apparaîtront ici.',

      systemStatus: 'État du système',
      operational: 'Opérationnel',

      authentication: 'Authentification',
      database: 'Base de données',
      storage: 'Stockage',

      quickActions: 'Actions rapides',

      manageReports: 'Gérer les signalements',
      manageReportsDesc:
        'Consulter et traiter les signalements',

      manageUsers: 'Gérer les utilisateurs',
      manageUsersDesc:
        'Consulter les comptes utilisateurs',

      replyUsers: 'Répondre aux utilisateurs',
      replyUsersDesc:
        'Consulter les demandes et messages',

      logout: 'Déconnexion',
    },

    en: {
      administration: 'Administration',
      dashboard: 'Dashboard',
      overview: 'Overview of BATIR TCHAD Connect',

      welcome: 'Welcome, Administrator 👋',
      activityOverview:
        'Here is an overview of platform activity.',

      users: 'Users',
      registeredUsers: 'Registered users',

      reports: 'Reports',
      reportsReceived: 'Reports received',

      messages: 'Messages',
      pendingMessages: 'Pending messages',

      activity: 'Activity',
      systemOperational: 'System operational',

      statistics: 'Statistics',
      settings: 'Settings',

      recentReports: 'Recent reports',
      latestActivities:
        'Latest platform activities',

      viewAll: 'View all',

      noRecentReports:
        'No recent reports',

      newReportsAppear:
        'New reports will appear here.',

      systemStatus: 'System status',
      operational: 'Operational',

      authentication: 'Authentication',
      database: 'Database',
      storage: 'Storage',

      quickActions: 'Quick actions',

      manageReports: 'Manage reports',
      manageReportsDesc:
        'View and process reports',

      manageUsers: 'Manage users',
      manageUsersDesc:
        'View user accounts',

      replyUsers: 'Reply to users',
      replyUsersDesc:
        'View requests and messages',

      logout: 'Logout',
    },

    ar: {
      administration: 'الإدارة',
      dashboard: 'لوحة التحكم',
      overview:
        'نظرة عامة على منصة BATIR TCHAD Connect',

      welcome: 'مرحباً، أيها المسؤول 👋',
      activityOverview:
        'إليك نظرة عامة على نشاط المنصة.',

      users: 'المستخدمون',
      registeredUsers:
        'المستخدمون المسجلون',

      reports: 'البلاغات',
      reportsReceived:
        'البلاغات المستلمة',

      messages: 'الرسائل',
      pendingMessages:
        'الرسائل قيد الانتظار',

      activity: 'النشاط',
      systemOperational:
        'النظام يعمل بشكل طبيعي',

      statistics: 'الإحصائيات',
      settings: 'الإعدادات',

      recentReports:
        'البلاغات الأخيرة',

      latestActivities:
        'أحدث أنشطة المنصة',

      viewAll: 'عرض الكل',

      noRecentReports:
        'لا توجد بلاغات حديثة',

      newReportsAppear:
        'ستظهر البلاغات الجديدة هنا.',

      systemStatus: 'حالة النظام',

      operational:
        'يعمل بشكل طبيعي',

      authentication: 'المصادقة',
      database: 'قاعدة البيانات',
      storage: 'التخزين',

      quickActions:
        'الإجراءات السريعة',

      manageReports:
        'إدارة البلاغات',

      manageReportsDesc:
        'عرض ومعالجة البلاغات',

      manageUsers:
        'إدارة المستخدمين',

      manageUsersDesc:
        'عرض حسابات المستخدمين',

      replyUsers:
        'الرد على المستخدمين',

      replyUsersDesc:
        'عرض الطلبات والرسائل',

      logout:
        'تسجيل الخروج',
    },
  } as const

  const t = translations[lang]

  /*
   * Déconnexion
   */
  const handleLogout = async () => {
    await supabase.auth.signOut()

    await navigate({
      to: '/auth',
    })
  }

  return (
    <div
      dir={isArabic ? 'rtl' : 'ltr'}
      className="min-h-screen bg-slate-50"
    >
      {/* =====================================================
          SIDEBAR
      ====================================================== */}

      <aside
        className={`fixed top-0 z-40 h-screen w-64 border-r bg-white ${
          isArabic
            ? 'right-0 border-l border-r-0'
            : 'left-0'
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-600 text-white">
            <ShieldCheck size={21} />
          </div>

          <div>
            <h1 className="font-bold text-slate-900">
              BATIR TCHAD
            </h1>

            <p className="text-xs text-slate-500">
              {t.administration}
            </p>
          </div>
        </div>

        {/* Menu */}
        <nav className="space-y-1 p-4">

          {/* Dashboard */}
          <Link
            to="/admin"
            className="flex w-full items-center gap-3 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700"
          >
            <LayoutDashboard size={19} />

            <span>
              {t.dashboard}
            </span>
          </Link>

          {/* Signalements */}
          <Link
            to="/admin/signalements"
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-600 transition hover:bg-slate-50"
          >
            <FileText size={19} />

            <span>
              {t.reports}
            </span>
          </Link>

          {/* Utilisateurs */}
          <Link
            to="/admin/utilisateurs"
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-600 transition hover:bg-slate-50"
          >
            <Users size={19} />

            <span>
              {t.users}
            </span>
          </Link>

          {/* Messages */}
          <Link
            to="/admin/messages"
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-600 transition hover:bg-slate-50"
          >
            <MessageSquare size={19} />

            <span>
              {t.messages}
            </span>
          </Link>

          {/* Statistiques */}
          <Link
            to="/admin/statistiques"
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-600 transition hover:bg-slate-50"
          >
            <BarChart3 size={19} />

            <span>
              {t.statistics}
            </span>
          </Link>

          {/* Paramètres */}
          <Link
            to="/admin/parametres"
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-600 transition hover:bg-slate-50"
          >
            <Settings size={19} />

            <span>
              {t.settings}
            </span>
          </Link>
        </nav>

        {/* Déconnexion */}
        <div className="absolute bottom-4 left-4 right-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-red-600 transition hover:bg-red-50"
          >
            <LogOut size={19} />

            <span>
              {t.logout}
            </span>
          </button>
        </div>
      </aside>

      {/* =====================================================
          MAIN
      ====================================================== */}

      <main
        className={
          isArabic
            ? 'mr-64'
            : 'ml-64'
        }
      >

        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b bg-white px-8">

          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {t.dashboard}
            </h2>

            <p className="text-sm text-slate-500">
              {t.overview}
            </p>
          </div>

          {/* Notifications */}
          <button
            className="relative rounded-lg p-2 transition hover:bg-slate-100"
            aria-label="Notifications"
          >
            <Bell
              size={21}
              className="text-slate-600"
            />

            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
          </button>
        </header>

        {/* Content */}
        <div className="space-y-8 p-8">

          {/* =================================================
              WELCOME
          ================================================== */}

          <section>
            <h3 className="text-2xl font-bold text-slate-900">
              {t.welcome}
            </h3>

            <p className="mt-1 text-slate-500">
              {t.activityOverview}
            </p>
          </section>

          {/* =================================================
              STATISTICS
          ================================================== */}

          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">

            <StatCard
              title={t.users}
              value="5"
              description={t.registeredUsers}
              icon={<Users size={22} />}
            />

            <StatCard
              title={t.reports}
              value="0"
              description={t.reportsReceived}
              icon={<FileText size={22} />}
            />

            <StatCard
              title={t.messages}
              value="0"
              description={t.pendingMessages}
              icon={<MessageSquare size={22} />}
            />

            <StatCard
              title={t.activity}
              value="100%"
              description={t.systemOperational}
              icon={<BarChart3 size={22} />}
            />

          </section>

          {/* =================================================
              RECENT REPORTS + SYSTEM STATUS
          ================================================== */}

          <section className="grid gap-6 lg:grid-cols-3">

            {/* Recent reports */}
            <div className="rounded-xl border bg-white p-6 lg:col-span-2">

              <div className="mb-6 flex items-center justify-between">

                <div>
                  <h3 className="font-semibold text-slate-900">
                    {t.recentReports}
                  </h3>

                  <p className="text-sm text-slate-500">
                    {t.latestActivities}
                  </p>
                </div>

                <Link
                  to="/admin/signalements"
                  className="text-sm font-medium text-green-600 transition hover:text-green-700"
                >
                  {t.viewAll}
                </Link>

              </div>

              <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed">

                <div className="text-center">

                  <FileText
                    size={40}
                    className="mx-auto mb-3 text-slate-300"
                  />

                  <p className="font-medium text-slate-600">
                    {t.noRecentReports}
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    {t.newReportsAppear}
                  </p>

                </div>

              </div>
            </div>

            {/* System status */}
            <div className="rounded-xl border bg-white p-6">

              <h3 className="font-semibold text-slate-900">
                {t.systemStatus}
              </h3>

              <div className="mt-6 space-y-5">

                <StatusItem
                  name="Supabase"
                  status={t.operational}
                />

                <StatusItem
                  name={t.authentication}
                  status={t.operational}
                />

                <StatusItem
                  name={t.database}
                  status={t.operational}
                />

                <StatusItem
                  name={t.storage}
                  status={t.operational}
                />

              </div>
            </div>

          </section>

          {/* =================================================
              QUICK ACTIONS
          ================================================== */}

          <section className="rounded-xl border bg-white p-6">

            <h3 className="font-semibold text-slate-900">
              {t.quickActions}
            </h3>

            <div className="mt-5 grid gap-4 md:grid-cols-3">

              {/* Gérer signalements */}
              <Link
                to="/admin/signalements"
                className="rounded-xl border p-5 text-left transition hover:border-green-300 hover:bg-green-50"
              >
                <div className="mb-3 w-fit rounded-lg bg-green-50 p-3 text-green-600">
                  <FileText size={20} />
                </div>

                <h4 className="font-medium text-slate-900">
                  {t.manageReports}
                </h4>

                <p className="mt-1 text-sm text-slate-500">
                  {t.manageReportsDesc}
                </p>
              </Link>

              {/* Gérer utilisateurs */}
              <Link
                to="/admin/utilisateurs"
                className="rounded-xl border p-5 text-left transition hover:border-green-300 hover:bg-green-50"
              >
                <div className="mb-3 w-fit rounded-lg bg-green-50 p-3 text-green-600">
                  <Users size={20} />
                </div>

                <h4 className="font-medium text-slate-900">
                  {t.manageUsers}
                </h4>

                <p className="mt-1 text-sm text-slate-500">
                  {t.manageUsersDesc}
                </p>
              </Link>

              {/* Répondre utilisateurs */}
              <Link
                to="/admin/messages"
                className="rounded-xl border p-5 text-left transition hover:border-green-300 hover:bg-green-50"
              >
                <div className="mb-3 w-fit rounded-lg bg-green-50 p-3 text-green-600">
                  <MessageSquare size={20} />
                </div>

                <h4 className="font-medium text-slate-900">
                  {t.replyUsers}
                </h4>

                <p className="mt-1 text-sm text-slate-500">
                  {t.replyUsersDesc}
                </p>
              </Link>

            </div>
          </section>

        </div>
      </main>
    </div>
  )
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string
  value: string
  description: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">

      <div className="flex items-center justify-between">

        <div className="rounded-lg bg-green-50 p-3 text-green-600">
          {icon}
        </div>

      </div>

      <p className="mt-5 text-sm text-slate-500">
        {title}
      </p>

      <p className="mt-1 text-3xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {description}
      </p>

    </div>
  )
}

/* =========================================================
   STATUS ITEM
========================================================= */

function StatusItem({
  name,
  status,
}: {
  name: string
  status: string
}) {
  return (
    <div className="flex items-center justify-between">

      <span className="text-sm text-slate-600">
        {name}
      </span>

      <span className="flex items-center gap-2 text-xs font-medium text-green-600">

        <span className="h-2 w-2 rounded-full bg-green-500" />

        {status}

      </span>

    </div>
  )
}