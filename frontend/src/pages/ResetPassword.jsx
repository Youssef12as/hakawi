import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabaseClient';
import { Lock, AlertCircle, CheckCircle, ArrowRight, Loader2, KeyRound } from 'lucide-react';

export default function ResetPassword() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Listen for auth state change or check if session exists
    const checkRecoverySession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted) {
          if (session) {
            setHasValidSession(true);
          } else {
            // Also check hash in case of direct token
            const hash = window.location.hash;
            if (hash && (hash.includes('type=recovery') || hash.includes('access_token'))) {
              setHasValidSession(true);
            }
          }
          setVerifying(false);
        }
      } catch (err) {
        console.error('Session verification error:', err);
        if (isMounted) {
          setVerifying(false);
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) {
        setHasValidSession(true);
        setVerifying(false);
      }
    });

    checkRecoverySession();

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError('يرجى ملء جميع الحقول');
      return;
    }

    if (password.length < 6) {
      setError('يجب ألا تقل كلمة المرور عن 6 أحرف');
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (token) {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ password }),
        });

        if (!res.ok) {
          const resData = await res.json().catch(() => ({}));
          const errMsg = resData?.detail || 'فشل تحديث كلمة المرور عبر الخادم';
          throw new Error(errMsg);
        }
      } else {
        // Fallback to client update if no bearer token is directly available
        await updatePassword(password);
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    } catch (err) {
      console.error('Update password error:', err);
      let message = 'فشل تحديث كلمة المرور. يرجى المحاولة مرة أخرى.';
      if (err.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
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
        {/* Card */}
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
            <Link to="/" className="inline-flex items-center gap-3 mb-4 group hover-lift">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c89830]/30 to-[#c89830]/10 border border-[#c89830]/40 flex items-center justify-center shadow-[0_0_20px_rgba(200,152,48,0.2)]">
                <KeyRound className="w-5 h-5 text-[#e8bc58]" />
              </div>
              <span className="text-2xl font-black text-[#fff8ee] tracking-tight font-heading">
                حكاوي<span className="text-[#c89830]">.</span>
              </span>
            </Link>
            <h1 className="text-2xl font-bold text-[#f0e0c8] mb-2">تعيين كلمة المرور الجديدة</h1>
            <p className="text-sm text-[#f0e0c8]/60">
              أدخل كلمة المرور الجديدة لتتمكن من تسجيل الدخول إلى حسابك
            </p>
          </div>

          {verifying ? (
            <div className="py-12 flex flex-col items-center justify-center gap-4 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#c89830]" />
              <p className="text-sm text-[#f0e0c8]/70">جاري التحقق من رابط الاستعادة...</p>
            </div>
          ) : !hasValidSession && !success ? (
            <div className="space-y-6 text-center animate-fade-in">
              <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/30 flex flex-col items-center gap-3">
                <AlertCircle className="w-10 h-10 text-red-400" />
                <div className="text-sm font-semibold text-red-200">
                  الرابط غير صالح أو انتهت صلاحيته
                </div>
                <p className="text-xs text-[#f0e0c8]/70 leading-relaxed">
                  يبدو أن رابط استعادة كلمة المرور قد انتهت صلاحيته أو تم استخدامه مسبقاً. يرجى طلب رابط استعادة جديد.
                </p>
              </div>

              <Link
                to="/forgot-password"
                className="w-full py-3 px-4 rounded-xl font-bold text-sm text-[#0e0b08] bg-gradient-to-r from-[#e8bc58] via-[#c89830] to-[#b08020] hover:brightness-110 active:scale-[0.99] transition-all shadow-lg shadow-[#c89830]/20 flex items-center justify-center gap-2"
              >
                <span>طلب رابط استعادة جديد</span>
              </Link>
            </div>
          ) : success ? (
            <div className="space-y-6 text-center animate-fade-in">
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <div className="text-sm font-semibold text-[#f0e0c8]">
                  تم تغيير كلمة المرور بنجاح!
                </div>
                <p className="text-xs text-[#f0e0c8]/70 leading-relaxed">
                  تم تحديث كلمة المرور الخاصة بك. سيتم تحويلك إلى صفحة تسجيل الدخول تلقائياً خلال لحظات...
                </p>
              </div>

              <Link
                to="/login"
                className="w-full py-3 px-4 rounded-xl font-bold text-sm text-[#0e0b08] bg-gradient-to-r from-[#e8bc58] via-[#c89830] to-[#b08020] hover:brightness-110 active:scale-[0.99] transition-all shadow-lg shadow-[#c89830]/20 flex items-center justify-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                <span>الانتقال إلى تسجيل الدخول الآن</span>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-200 text-sm animate-fade-in">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#f0e0c8]/80 mb-2">
                  كلمة المرور الجديدة
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full px-4 py-3 pr-11 rounded-xl bg-black/40 border border-white/10 text-[#f0e0c8] placeholder-[#f0e0c8]/30 focus:outline-none focus:border-[#c89830] transition-colors text-sm"
                  />
                  <Lock className="w-5 h-5 text-[#f0e0c8]/40 absolute right-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#f0e0c8]/80 mb-2">
                  تأكيد كلمة المرور الجديدة
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full px-4 py-3 pr-11 rounded-xl bg-black/40 border border-white/10 text-[#f0e0c8] placeholder-[#f0e0c8]/30 focus:outline-none focus:border-[#c89830] transition-colors text-sm"
                  />
                  <Lock className="w-5 h-5 text-[#f0e0c8]/40 absolute right-3.5 top-3.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm text-[#0e0b08] bg-gradient-to-r from-[#e8bc58] via-[#c89830] to-[#b08020] hover:brightness-110 active:scale-[0.99] transition-all shadow-lg shadow-[#c89830]/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <span>حفظ كلمة المرور الجديدة</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
