import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, AlertCircle, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';

export default function ForgotPassword() {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('يرجى إدخال البريد الإلكتروني');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await resetPassword(email.trim());
      setIsSubmitted(true);
    } catch (err) {
      console.error('Password reset error:', err);
      let message = 'حدث خطأ أثناء محاولة إرسال رابط الاستعادة. يرجى المحاولة لاحقاً.';
      if (err.message?.includes('rate limit') || err.message?.includes('over_email_send_rate_limit')) {
        message = 'لقد تجاوزت الحد المسموح به لإرسال الرسائل. يرجى الانتظار بضع دقائق والمحاولة مجدداً.';
      } else if (err.message) {
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
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e8bc58" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21h18" />
                  <path d="M4 21V10l8-6 8 6v11" />
                  <path d="M9 21v-7a3 3 0 0 1 6 0v7" />
                </svg>
              </div>
              <span className="text-2xl font-black text-[#fff8ee] tracking-tight font-heading">
                حكاوي<span className="text-[#c89830]">.</span>
              </span>
            </Link>
            <h1 className="text-2xl font-bold text-[#f0e0c8] mb-2">استعادة كلمة المرور</h1>
            <p className="text-sm text-[#f0e0c8]/60">
              أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور الخاصة بك
            </p>
          </div>

          {/* Success State */}
          {isSubmitted ? (
            <div className="space-y-6 text-center animate-fade-in">
              <div className="p-5 rounded-2xl bg-[#c89830]/10 border border-[#c89830]/30 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#c89830]/20 flex items-center justify-center text-[#e8bc58]">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <div className="text-sm font-semibold text-[#f0e0c8]">
                  تم إرسال رابط الاستعادة بنجاح!
                </div>
                <p className="text-xs text-[#f0e0c8]/70 leading-relaxed">
                  أرسلنا رابط إعادة تعيين كلمة المرور إلى{' '}
                  <span className="text-[#e8bc58] font-mono dir-ltr inline-block">{email}</span>.
                  يرجى تفقد بريدك الإلكتروني بما في ذلك مجلد الرسائل غير المرغوب فيها (Spam).
                </p>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setIsSubmitted(false)}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-[#c89830] hover:text-[#e8bc58] border border-[#c89830]/30 hover:border-[#c89830]/60 transition-colors"
                >
                  إعادة المحاولة ببريد إلكتروني آخر
                </button>

                <Link
                  to="/login"
                  className="w-full py-3 px-4 rounded-xl font-bold text-sm text-[#0e0b08] bg-gradient-to-r from-[#e8bc58] via-[#c89830] to-[#b08020] hover:brightness-110 active:scale-[0.99] transition-all shadow-lg shadow-[#c89830]/20 flex items-center justify-center gap-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>العودة لتسجيل الدخول</span>
                </Link>
              </div>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error Alert */}
              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-200 text-sm animate-fade-in">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm text-[#0e0b08] bg-gradient-to-r from-[#e8bc58] via-[#c89830] to-[#b08020] hover:brightness-110 active:scale-[0.99] transition-all shadow-lg shadow-[#c89830]/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>جاري إرسال الرابط...</span>
                  </>
                ) : (
                  <span>إرسال رابط الاستعادة</span>
                )}
              </button>

              <div className="pt-4 border-t border-white/10 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-xs text-[#c89830] hover:text-[#e8bc58] transition-colors font-semibold"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>العودة إلى تسجيل الدخول</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
