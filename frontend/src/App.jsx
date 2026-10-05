import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Shipments from './pages/Shipments';
import Deliveries from './pages/Deliveries';
import UserManagement from './pages/UserManagement';
import Unauthorized from './pages/Unauthorized';

// Layout wrapper to render Sidebar next to content
const AppLayout = ({ children }) => {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public login */}
          <Route path="/login" element={<Login />} />
          
          {/* Unauthorized screen */}
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Protected Main Dashboards */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/inventory"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                <AppLayout>
                  <Inventory />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/shipments"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                <AppLayout>
                  <Shipments />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/deliveries"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                <AppLayout>
                  <Deliveries />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AppLayout>
                  <UserManagement />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
