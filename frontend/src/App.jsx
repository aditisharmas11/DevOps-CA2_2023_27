import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext.jsx";
import Landing from "./components/Landing.jsx";
import Register from "./components/Register.jsx";
import Login from "./components/Login.jsx";
import Dashboard from "./components/Dashboard.jsx";
import Profile from "./components/Profile.jsx";
import Matches from "./components/Matches.jsx";
import CompletePageProfile from "./components/CompletePageProfile.jsx";
import Messages from "./components/Messages.jsx";
import Search from "./components/Search.jsx";
// import CompleteProfilePage from "./components/CompleteProfile.jsx"; // optional step-by-step completion

// ✅ PrivateRoute component ensures JWT authentication
function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <AuthProvider>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <BrowserRouter>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register/step2" element={<Register />} />
          <Route path="/register/step3" element={<Register />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile/edit"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile/complete"
            element={
              <PrivateRoute>
                <CompletePageProfile />
              </PrivateRoute>
            }
          />
          <Route
            path="/matches"
            element={
              <PrivateRoute>
                <Matches />
              </PrivateRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <PrivateRoute>
                <Messages />
              </PrivateRoute>
            }
          />
          <Route
            path="/search"
            element={
              <PrivateRoute>
                <Search />
              </PrivateRoute>
            }
          />
          {/* <Route
            path="/profile/complete"
            element={
              <PrivateRoute>
                <CompleteProfilePage />
              </PrivateRoute>
            }
          /> */}

          {/* Redirect unknown routes */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
          </div>
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}
