import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { DiseaseJobProvider } from './context/DiseaseJobContext'

import ProtectedLayout from './components/ProtectedLayout'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DoctorStatusPage from './pages/DoctorStatusPage'
import Dashboard from './pages/Dashboard'
import HealthPage from './pages/HealthPage'
import DiseasePage from './pages/DiseasePage'
import TreatmentPage from './pages/TreatmentPage'
import TimelinePage from './pages/TimelinePage'
import ProfilePage from './pages/ProfilePage'
import ReportsPage from './pages/ReportsPage'
import AlertsPage from './pages/AlertsPage'
import DoctorDashboard from './pages/DoctorDashboard'
import AdminDashboard from './pages/AdminDashboard'
import FindDoctorPage from './pages/FindDoctorPage'

function HomeRoute() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />

  if (user.role === 'admin') {
    return <Navigate to="/admin" replace />
  }
  if (user.role === 'doctor') {
    if (user.verificationStatus !== 'verified') {
      return <Navigate to="/doctor-status" replace />
    }
    return <Navigate to="/doctor" replace />
  }
  return <Dashboard />
}

function DoctorRoute() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />

  if (user.role === 'patient') {
    return <Navigate to="/dashboard" replace />
  }
  if (user.role === 'admin') {
    return <Navigate to="/admin" replace />
  }
  if (user.role === 'doctor' && user.verificationStatus !== 'verified') {
    return <Navigate to="/doctor-status" replace />
  }
  return <DoctorDashboard />
}

function AdminRoute() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }
  return <AdminDashboard />
}

export default function App() {
  return (
    <ThemeProvider>
      <DiseaseJobProvider>
        <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public authentication routes */}
            <Route path="/login"         element={<LoginPage />} />
            <Route path="/signup"        element={<SignupPage />} />
            <Route path="/verify-email"  element={<Navigate to="/login" replace />} />
            <Route path="/doctor-status" element={<DoctorStatusPage />} />

            {/* Protected authenticated layout */}
            <Route element={<ProtectedLayout />}>
              <Route path="/"           element={<HomeRoute />} />
              <Route path="/dashboard"  element={<HomeRoute />} />
              <Route path="/doctor"     element={<DoctorRoute />} />
              <Route path="/admin"      element={<AdminRoute />} />
              <Route path="/health"     element={<HealthPage />} />
              <Route path="/disease"    element={<DiseasePage />} />
              <Route path="/treatment"  element={<TreatmentPage />} />
              <Route path="/timeline"   element={<TimelinePage />} />
              <Route path="/profile"    element={<ProfilePage />} />
              <Route path="/reports"    element={<ReportsPage />} />
              <Route path="/alerts"     element={<AlertsPage />} />
              <Route path="/find-doctor" element={<FindDoctorPage />} />
              <Route path="/settings"   element={<Navigate to="/profile" replace />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        </AuthProvider>
      </DiseaseJobProvider>
    </ThemeProvider>
  )
}
