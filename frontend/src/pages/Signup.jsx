import { useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resizeImageToBase64 } from '../utils/imageUtils';
import {
  User,
  Mail,
  Lock,
  AlertCircle,
  CheckCircle,
  Loader2,
  Camera,
  X,
} from 'lucide-react';

export default function Signup() {
  const { signUpWithEmail, signInWithGoogle, signInWithFacebook } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const destination = location.state?.from?.pathname || '/';

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarLoading(true);
    setError(null);
    try {
      const base64Data = await resizeImageToBase64(file, 256, 256, 0.85);
      setAvatarPreview(base64Data);
    } catch (err) {
      console.error('Avatar error:', err);
      setError('تعذر معالجة الصورة المحددة. يرجى اختيار صورة أخرى.');
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (password.length < 6) {
      setError('كلمة المرور يجب ألا تقل عن 6 أحرف');
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await signUpWithEmail(
        email.trim(),
        password,
        fullName.trim(),
        avatarPreview
      );
      // If user is immediately signed in (auto-confirm enabled):
      if (data.session) {
        navigate(destination, { replace: true });
      } else {
        // Confirmation email sent
        setSuccessMessage('تم إنشاء الحساب بنجاح! تم إرسال رابط تأكيد إلى بريدك الإلكتروني.');
      }
    } catch (err) {
      console.error('Signup error:', err);
      let message = err.message || 'فشل إنشاء الحساب. يرجى المحاولة لاحقاً.';
      if (err.message?.includes('User already registered')) {
        message = 'هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider) => {
    setOauthLoading(provider);
    setError(null);
    try {
      if (provider === 'google') {
        await signInWithGoogle();
      } else if (provider === 'facebook') {
        await signInWithFacebook();
      }
    } catch (err) {
      console.error(`${provider} OAuth error:`, err);
      setError(`تعذر التسجيل عبر ${provider === 'google' ? 'Google' : 'Facebook'}. يرجى المحاولة مرة أخرى.`);
      setOauthLoading(null);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-20 font-cairo"
      style={{
        background: 'radial-gradient(ellipse at center top, #1a140d 0%, #0e0b08 70%)',
        direction: 'rtl',
      }}
    >
      <div className="w-full max-w-md">
        <div
          className="rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden"
          style={{
            background: 'rgba(26, 20, 14, 0.85)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(200, 152, 48, 0.2)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
              <span className="text-2xl">🏛️</span>
              <span className="text-2xl font-black text-[#f0e0c8] tracking-tight">
                حكاوي<span className="text-[#c89830]">.</span>
              </span>
            </Link>
            <h1 className="text-2xl font-bold text-[#f0e0c8] mb-2">إنشاء حساب جديد</h1>
            <p className="text-sm text-[#f0e0c8]/60">
              انضم إلى حكاوي واحفظ ذكريات عائلتك وتراث أجدادك
            </p>
          </div>

          {/* Success Alert */}
          {successMessage && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-emerald-200 text-sm animate-fade-in">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-200 text-sm animate-fade-in">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Social OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              disabled={loading || oauthLoading !== null}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 border border-white/10 hover:border-white/25 bg-white/5 hover:bg-white/10 text-[#f0e0c8] disabled:opacity-50"
            >
              {oauthLoading === 'google' ? (
                <Loader2 className="w-5 h-5 animate-spin text-[#c89830]" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.02 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              )}
              <span>التسجيل عبر Google</span>
            </button>

            <button
              type="button"
              onClick={() => handleOAuth('facebook')}
              disabled={loading || oauthLoading !== null}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 border border-blue-500/20 hover:border-blue-500/40 bg-blue-600/10 hover:bg-blue-600/20 text-[#f0e0c8] disabled:opacity-50"
            >
              {oauthLoading === 'facebook' ? (
                <Loader2 className="w-5 h-5 animate-spin text-[#c89830]" />
              ) : (
                <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              )}
              <span>التسجيل عبر Facebook</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center mb-6">
            <div className="border-t border-white/10 w-full" />
            <span className="bg-[#1a140d] px-3 text-xs text-[#f0e0c8]/40 uppercase tracking-wider">
              أو بالبريد الإلكتروني
            </span>
            <div className="border-t border-white/10 w-full" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Optional Avatar Upload */}
            <div className="flex flex-col items-center justify-center mb-2">
              <div className="relative">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-[#c89830]/40 to-black/60 p-1 border border-[#c89830]/30 flex items-center justify-center cursor-pointer hover:border-[#c89830] transition-all overflow-hidden group shadow-md"
                  title="اختر صورة شخصية"
                >
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar Preview"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-[#f0e0c8]/50 group-hover:text-[#c89830] transition-colors">
                      {avatarLoading ? (
                        <Loader2 className="w-6 h-6 animate-spin text-[#c89830]" />
                      ) : (
                        <Camera className="w-7 h-7" />
                      )}
                    </div>
                  )}
                </div>

                {avatarPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="absolute -top-1 -right-1 p-1 rounded-full bg-red-500/80 hover:bg-red-500 text-white shadow transition-transform active:scale-95"
                    title="إزالة الصورة"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-[#c89830] hover:underline mt-2 font-medium"
              >
                {avatarPreview ? 'تغيير الصورة' : 'إضافة صورة شخصية (اختياري)'}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#f0e0c8]/80 mb-2">
                الاسم الكامل
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="محمد أحمد"
                  required
                  className="w-full px-4 py-3 pr-11 rounded-xl bg-black/40 border border-white/10 text-[#f0e0c8] placeholder-[#f0e0c8]/30 focus:outline-none focus:border-[#c89830] transition-colors text-sm"
                />
                <User className="w-5 h-5 text-[#f0e0c8]/40 absolute right-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#f0e0c8]/80 mb-2">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full px-4 py-3 pr-11 rounded-xl bg-black/40 border border-white/10 text-[#f0e0c8] placeholder-[#f0e0c8]/30 focus:outline-none focus:border-[#c89830] transition-colors text-sm"
                />
                <Mail className="w-5 h-5 text-[#f0e0c8]/40 absolute right-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#f0e0c8]/80 mb-2">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••• (6 أحرف على الأقل)"
                  required
                  className="w-full px-4 py-3 pr-11 rounded-xl bg-black/40 border border-white/10 text-[#f0e0c8] placeholder-[#f0e0c8]/30 focus:outline-none focus:border-[#c89830] transition-colors text-sm"
                />
                <Lock className="w-5 h-5 text-[#f0e0c8]/40 absolute right-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#f0e0c8]/80 mb-2">
                تأكيد كلمة المرور
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 pr-11 rounded-xl bg-black/40 border border-white/10 text-[#f0e0c8] placeholder-[#f0e0c8]/30 focus:outline-none focus:border-[#c89830] transition-colors text-sm"
                />
                <Lock className="w-5 h-5 text-[#f0e0c8]/40 absolute right-3.5 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || oauthLoading !== null}
              className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm text-[#0e0b08] bg-gradient-to-r from-[#e8bc58] via-[#c89830] to-[#b08020] hover:brightness-110 active:scale-[0.99] transition-all shadow-lg shadow-[#c89830]/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري إنشاء الحساب...</span>
                </>
              ) : (
                <span>إنشاء الحساب</span>
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="mt-8 pt-6 border-t border-white/10 text-center text-xs text-[#f0e0c8]/60">
            لديك حساب بالفعل؟{' '}
            <Link
              to="/login"
              state={{ from: location.state?.from }}
              className="text-[#c89830] hover:underline font-bold"
            >
              تسجيل الدخول
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
