import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Modal from '../common/Modal';

export default function ProtectedRoute({ children, memberOnly = false }) {
  const { user, isGuest, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e0b08] flex flex-col items-center justify-center font-cairo">
        <div className="w-14 h-14 border-4 border-[#c89830]/20 border-t-[#c89830] rounded-full animate-spin mb-4" />
        <p className="text-[#f0e0c8]/80 text-sm tracking-wide">جاري التحقق من الهوية...</p>
      </div>
    );
  }

  if (!user && !isGuest) {
    // Redirect to login, preserving the intended destination in location state
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isGuest && memberOnly) {
    return (
      <div className="min-h-screen" dir="rtl">
        <Modal isOpen onClose={() => navigate('/')} title="تسجيل الدخول مطلوب">
          <p className="text-espresso mb-6">
            {location.pathname === '/family' ? 'يجب تسجيل الدخول لاستخدام شجرة العائلة.' : 'يجب تسجيل الدخول للوصول إلى الملف الشخصي.'}
          </p>
          <div className="flex gap-4 text-wine font-bold">
            <Link to="/login" state={{ from: location }}>تسجيل الدخول</Link>
            <Link to={location.pathname === '/family' ? '/login' : '/signup'} state={{ from: location }}>إنشاء حساب</Link>
            <Link to="/">الرئيسية</Link>
          </div>
        </Modal>
      </div>
    );
  }

  return children;
}
