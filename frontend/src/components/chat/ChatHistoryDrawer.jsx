import { useState, useEffect, useCallback } from 'react';
import { Trash2, X, MessageSquare, Clock, Landmark, Loader2 } from 'lucide-react';
import { useChatApi } from '../../hooks/useChatApi';

function formatRelativeDate(ts) {
  if (!ts) return '';
  const now = new Date();
  const d = new Date(ts);
  const diffDays = Math.floor((now.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000);
  if (diffDays === 0) return 'اليوم';
  if (diffDays === 1) return 'أمس';
  if (diffDays < 7) return `منذ ${diffDays} أيام`;
  return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
}

export default function ChatHistoryDrawer({
  isOpen,
  onClose,
  currentMonumentKey,
  currentMonumentName,
  activeSessionId,
  onSelectSession,
}) {
  const { fetchSessions, deleteSession } = useChatApi();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSessions();
      setSessions(data?.sessions || []);
    } catch (e) {
      console.error('Failed to load chat history:', e);
    } finally {
      setLoading(false);
    }
  }, [fetchSessions]);

  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen, loadSessions]);

  const handleDelete = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm('هل أنت متأكد من حذف هذه المحادثة؟')) return;
    setDeletingId(sessionId);
    try {
      const ok = await deleteSession(sessionId);
      if (ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      }
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  // Strictly filter to this monument only
  const monumentSessions = sessions.filter((s) => {
    if (currentMonumentKey) {
      return s.monument_key === currentMonumentKey;
    }
    return true;
  });

  return (
    <div className="absolute inset-0 z-40 flex bg-black/60 backdrop-blur-sm animate-fade-in" dir="rtl">
      <div className="relative w-full max-w-sm h-full bg-[#14120e] border-l border-[#c4a06a]/20 shadow-2xl flex flex-col z-50">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#c4a06a]/15 bg-[#1a1712]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#c4a06a]/10 text-[#c4a06a]">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[#f0e0c8] font-bold text-sm">
                محادثات {currentMonumentName ? `«${currentMonumentName}»` : 'المعلم'}
              </h3>
              <span className="text-[11px] text-[#c4a06a]/60">
                {monumentSessions.length} محادثة سابقة
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-sand/60 hover:text-[#f0e0c8] hover:bg-white/5 transition-colors"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Session List for this monument */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-[#c4a06a]/60 gap-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs">جاري تحميل سجل المحادثات...</span>
            </div>
          ) : monumentSessions.length === 0 ? (
            <div className="text-center py-14 px-4">
              <div className="w-12 h-12 rounded-full bg-[#c4a06a]/10 border border-[#c4a06a]/20 flex items-center justify-center mx-auto mb-3 text-[#c4a06a]">
                <Clock className="w-5 h-5 opacity-60" />
              </div>
              <p className="text-sand/70 text-sm font-medium">لا توجد محادثات سابقة لهذا المعلم</p>
              <p className="text-sand/40 text-xs mt-1.5 leading-relaxed">
                أي محادثة تجريها مع {currentMonumentName || 'هذا المعلم'} ستُحفظ هنا تلقائيًا.
              </p>
            </div>
          ) : (
            monumentSessions.map((session) => {
              const isActive = activeSessionId === session.id;
              return (
                <div
                  key={session.id}
                  onClick={() => {
                    onSelectSession(session.id);
                    onClose();
                  }}
                  className={`group relative flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all ${
                    isActive
                      ? 'bg-[#c4a06a]/20 border-[#c4a06a]/50 text-[#f0e0c8] shadow-sm'
                      : 'bg-[#1a1712]/70 hover:bg-[#1a1712] border-white/5 hover:border-[#c4a06a]/30 text-sand/80 hover:text-[#f0e0c8]'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className="mt-0.5 p-1.5 rounded-lg bg-[#c4a06a]/10 text-[#c4a06a] flex-shrink-0">
                      <Landmark className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">
                        {session.title || 'محادثة سابقة'}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-sand/50">
                        <span>{formatRelativeDate(session.updated_at || session.created_at)}</span>
                        <span>•</span>
                        <span>{session.turn_count || 0} رسائل</span>
                      </div>
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleDelete(e, session.id)}
                    disabled={deletingId === session.id}
                    title="حذف المحادثة"
                    className="p-1.5 rounded-lg text-sand/30 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 mr-1"
                  >
                    {deletingId === session.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#c4a06a]/10 text-center text-[11px] text-sand/40">
          سجل محادثات خاص بـ {currentMonumentName || 'المعلم الحالي'}
        </div>

      </div>

      {/* Backdrop click to close */}
      <div className="flex-1" onClick={onClose} />
    </div>
  );
}
