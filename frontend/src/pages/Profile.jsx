import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resizeImageToBase64 } from '../utils/imageUtils';
import {
  Mail,
  Calendar,
  LogOut,
  Map,
  Users,
  AlertCircle,
  CheckCircle,
  Loader2,
  Camera,
  Edit2,
  Check,
  X,
  Key,
  Lock,
} from 'lucide-react';

export default function Profile() {
  const { user, signOut, updateProfile, updatePassword } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Profile fields state
  const initialName = user?.profile?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'حكواتي';
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(initialName);
  const [nameSaving, setNameSaving] = useState(false);

  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.profile?.avatar_url || user?.user_metadata?.avatar_url || null);

  const [feedback, setFeedback] = useState({ type: null, text: null }); // 'success' | 'error'

  // Synchronize state when user/profile loads or updates
  useEffect(() => {
    if (user) {
      const dbName = user?.profile?.display_name || user?.user_metadata?.full_name;
      const dbAvatar = user?.profile?.avatar_url || user?.user_metadata?.avatar_url;
      if (dbName && !isEditingName) {
        setNameInput(dbName);
      }
      if (dbAvatar) {
        setAvatarUrl(dbAvatar);
      }
    }
  }, [user, isEditingName]);

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState(null);

  const email = user?.email || 'غير متوفر';
  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'غير متوفر';

  // ── Name Update Handler ──────────────────────────────────────────
  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    setNameSaving(true);
    setFeedback({ type: null, text: null });
    try {
      await updateProfile({ fullName: nameInput.trim() });
      setIsEditingName(false);
      setFeedback({ type: 'success', text: 'تم تحديث الاسم في قاعدة البيانات بنجاح' });
    } catch (err) {
      console.error('Error updating name:', err);
      setFeedback({ type: 'error', text: 'فشل تحديث الاسم في قاعدة البيانات. يرجى المحاولة لاحقاً.' });
    } finally {
      setNameSaving(false);
    }
  };

  const handleCancelName = () => {
    const currentName = user?.profile?.display_name || user?.user_metadata?.full_name || initialName;
    setNameInput(currentName);
    setIsEditingName(false);
  };

  // ── Avatar Update Handler ────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarSaving(true);
    setFeedback({ type: null, text: null });
    try {
      const base64Data = await resizeImageToBase64(file, 256, 256, 0.85);
      setAvatarUrl(base64Data);
      await updateProfile({ avatarUrl: base64Data });
      setFeedback({ type: 'success', text: 'تم تحديث الصورة وحفظها في قاعدة البيانات بنجاح' });
    } catch (err) {
      console.error('Error updating avatar:', err);
      setFeedback({ type: 'error', text: err.message || 'تعذر تغيير الصورة الشخصية' });
    } finally {
      setAvatarSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Password Update Handler ──────────────────────────────────────
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!newPassword.trim() || !confirmPassword.trim()) {
      setPasswordError('يرجى ملء جميع حقول كلمة المرور');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('يجب أن تكون كلمة المرور 6 أحرف على الأقل');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('كلمتا المرور غير متطابقتين');
      return;
    }

    setPasswordSaving(true);
    setPasswordError(null);

    try {
      await updatePassword(newPassword);
      setShowPasswordForm(false);
      setNewPassword('');
      setConfirmPassword('');
      setFeedback({ type: 'success', text: 'تم تغيير كلمة المرور بنجاح!' });
    } catch (err) {
      console.error('Password update error:', err);
      setPasswordError(err.message || 'تعذر تغيير كلمة المرور. يرجى المحاولة لاحقاً.');
    } finally {
      setPasswordSaving(false);
    }
  };

  // ── Sign Out Handler ─────────────────────────────────────────────
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const currentFullName = user?.user_metadata?.full_name || initialName;

  return (
    <div
      className="min-h-screen pt-28 pb-16 px-4 sm:px-6 lg:px-8 font-cairo"
      style={{
        background: 'radial-gradient(ellipse at center top, #1a140d 0%, #0e0b08 70%)',
        direction: 'rtl',
      }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Feedback Alert */}
        {feedback.text && (
          <div
            className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm animate-fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border border-red-500/30 text-red-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle size={18} className="text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Profile Card */}
        <div
          className="rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden mb-8"
          style={{
            background: 'rgba(26, 20, 14, 0.85)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(200, 152, 48, 0.25)',
          }}
        >
          {/* User Banner / Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-8 border-b border-white/10">
            {/* Avatar with Camera Trigger */}
            <div className="relative group flex-shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-[#c89830] to-[#805010] p-1 shadow-xl relative overflow-hidden">
                <div className="w-full h-full rounded-full bg-[#1a140d] flex items-center justify-center text-3xl text-[#f0e0c8] font-bold overflow-hidden">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={currentFullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    currentFullName.charAt(0).toUpperCase()
                  )}
                </div>

                {/* Overlay loading state */}
                {avatarSaving && (
                  <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                    <Loader2 className="w-7 h-7 text-[#c89830] animate-spin" />
                  </div>
                )}
              </div>

              {/* Camera Button Badge */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarSaving}
                title="تغيير الصورة الشخصية"
                className="absolute bottom-0 left-0 p-2 rounded-full bg-[#c89830] hover:bg-[#e8bc58] text-[#0e0b08] shadow-lg transition-transform active:scale-95 disabled:opacity-50"
              >
                <Camera size={16} />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Name and Info */}
            <div className="flex-1 text-center sm:text-right">
              {/* Editable Name Field */}
              {isEditingName ? (
                <div className="flex items-center gap-2 mb-2 max-w-sm">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="الاسم الكامل"
                    className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-[#c89830] text-[#f0e0c8] text-base focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={nameSaving}
                    title="حفظ"
                    className="p-2 rounded-xl bg-[#c89830] text-[#0e0b08] hover:brightness-110 transition-all disabled:opacity-50"
                  >
                    {nameSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  </button>
                  <button
                    onClick={handleCancelName}
                    disabled={nameSaving}
                    title="إلغاء"
                    className="p-2 rounded-xl bg-white/10 text-[#f0e0c8] hover:bg-white/20 transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center sm:justify-start gap-3 mb-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-[#f0e0c8]">
                    {currentFullName}
                  </h1>
                  <button
                    onClick={() => {
                      setNameInput(currentFullName);
                      setIsEditingName(true);
                    }}
                    title="تعديل الاسم"
                    className="p-1.5 rounded-lg text-[#f0e0c8]/60 hover:text-[#c89830] hover:bg-white/5 transition-all"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              )}

              <p className="text-sm text-[#c89830] font-semibold mb-3">
                عضو موثق في منصة حكاوي
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                حساب نشط
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-bold transition-all"
            >
              <LogOut size={16} />
              تسجيل الخروج
            </button>
          </div>

          {/* User Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-8 border-b border-white/10">
            <div className="p-4 rounded-2xl bg-black/30 border border-white/5 flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-[#c89830]/10 text-[#c89830]">
                <Mail size={20} />
              </div>
              <div>
                <p className="text-xs text-[#f0e0c8]/50 mb-0.5">البريد الإلكتروني</p>
                <p className="text-sm font-semibold text-[#f0e0c8] break-all">{email}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-black/30 border border-white/5 flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-[#c89830]/10 text-[#c89830]">
                <Calendar size={20} />
              </div>
              <div>
                <p className="text-xs text-[#f0e0c8]/50 mb-0.5">تاريخ الانضمام</p>
                <p className="text-sm font-semibold text-[#f0e0c8]">{createdAt}</p>
              </div>
            </div>
          </div>

          {/* Change Password Section */}
          <div className="pt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#f0e0c8] flex items-center gap-2">
                <Key size={18} className="text-[#c89830]" />
                أمان الحساب
              </h3>
              {!showPasswordForm && (
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(true);
                    setPasswordError(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-[#c89830]/30 bg-[#c89830]/10 hover:bg-[#c89830]/20 text-[#c89830] text-xs font-bold transition-all flex items-center gap-2"
                >
                  <Lock size={14} />
                  تغيير كلمة المرور
                </button>
              )}
            </div>

            {showPasswordForm ? (
              <form
                onSubmit={handleUpdatePassword}
                className="p-5 rounded-2xl bg-black/30 border border-white/10 space-y-4 animate-fade-in"
              >
                {passwordError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle size={16} className="flex-shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#f0e0c8]/70 mb-1.5">
                      كلمة المرور الجديدة
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="•••••••• (6 أحرف على الأقل)"
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-[#f0e0c8] placeholder-[#f0e0c8]/30 text-sm focus:outline-none focus:border-[#c89830]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#f0e0c8]/70 mb-1.5">
                      تأكيد كلمة المرور الجديدة
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-[#f0e0c8] placeholder-[#f0e0c8]/30 text-sm focus:outline-none focus:border-[#c89830]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#e8bc58] via-[#c89830] to-[#b08020] text-[#0e0b08] font-bold text-xs hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 shadow-md shadow-[#c89830]/10"
                  >
                    {passwordSaving ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>جاري الحفظ...</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>حفظ كلمة المرور</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setNewPassword('');
                      setConfirmPassword('');
                      setPasswordError(null);
                    }}
                    disabled={passwordSaving}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#f0e0c8]/70 text-xs font-semibold transition-all"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-xs text-[#f0e0c8]/50">
                يمكنك تحديث كلمة المرور الخاصة بحسابك في أي وقت لتعزيز أمان بياناتك.
              </p>
            )}
          </div>
        </div>

        {/* Quick Nav Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/family"
            className="p-6 rounded-3xl bg-[#1a140d]/80 border border-white/10 hover:border-[#c89830]/40 transition-all group shadow-lg flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#c89830]/10 text-[#c89830] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users size={24} />
            </div>
            <div>
              <h4 className="text-base font-bold text-[#f0e0c8] group-hover:text-[#c89830] transition-colors">
                شجرة العائلة
              </h4>
              <p className="text-xs text-[#f0e0c8]/50">
                استعرض وأضف أفراد عائلتك وسجلاتهم الصوتية
              </p>
            </div>
          </Link>

          <Link
            to="/map"
            className="p-6 rounded-3xl bg-[#1a140d]/80 border border-white/10 hover:border-[#c89830]/40 transition-all group shadow-lg flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#c89830]/10 text-[#c89830] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Map size={24} />
            </div>
            <div>
              <h4 className="text-base font-bold text-[#f0e0c8] group-hover:text-[#c89830] transition-colors">
                خريطة التراث المصري
              </h4>
              <p className="text-xs text-[#f0e0c8]/50">
                تفاعل مع شخصيات المعالم التاريخية بمختلف المحافظات
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
