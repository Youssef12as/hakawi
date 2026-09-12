import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Navbar from './components/layout/Navbar';
import Landing from './pages/Landing';
import MapInteract from './pages/MapInteract';
import FamilyTree from './pages/FamilyTree';
import AncientMode from './pages/AncientMode';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#0e0b08] text-[#f0e0c8] font-cairo selection:bg-[#c89830]/30 selection:text-[#fff8ee]">
        <Navbar />
        <main>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected Routes (Login required) */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/map"
              element={
                <ProtectedRoute>
                  <MapInteract />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ancient/:regionId"
              element={
                <ProtectedRoute>
                  <AncientMode />
                </ProtectedRoute>
              }
            />
            <Route
              path="/family"
              element={
                <ProtectedRoute>
                  <FamilyTree />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}
