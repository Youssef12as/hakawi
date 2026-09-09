import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e0b08] flex flex-col items-center justify-center font-cairo">
        <div className="w-14 h-14 border-4 border-[#c89830]/20 border-t-[#c89830] rounded-full animate-spin mb-4" />
        <p className="text-[#f0e0c8]/80 text-sm tracking-wide">جاري التحقق من الهوية...</p>
      </div>
    );
  }

  if (!user) {
    // Redirect to login, preserving the intended destination in location state
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
