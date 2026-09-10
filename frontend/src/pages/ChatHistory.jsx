import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Trash2, Volume2, Loader2, ChevronRight, MessageCircle, Landmark, Users, MapPin,
} from 'lucide-react';
import { useChatApi } from '../hooks/useChatApi';
import ChatInput from '../components/chat/ChatInput';

const MODE_LABELS = {
  ancient: 'شخصية تاريخية',
  family_member: 'أفراد العيلة',
  regional: 'حوار محلي',
};

const MODE_ICONS = {
  ancient: Landmark,
  family_member: Users,
  regional: MapPin,
};

function formatRelativeDate(ts) {
  if (!ts) return '';
  const now = new Date();
  const d = new Date(ts);
  const diffDays = Math.floor((now.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000);
  if (diffDays === 0) return 'اليوم';
  if (diffDays === 1) return 'أمس';
  if (diffDays < 7) return `من ${diffDays} أيام`;
  return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });
}

export default function ChatHistory() {
  const navigate = useNavigate();
  const {
    sendTextMessage, sendAncientMessage, transcribeAudio,
    fetchSessions, fetchSessionDetail, deleteSession, fetchGovernorates, fetchTTS,
  } = useChatApi();

  const [sessions, setSessions] = useState([]);
  const [monumentNames, setMonumentNames] = useState({});
  const [activeSession, setActiveSession] = useState(null); // session detail
  const [messages, setMessages] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [playingId, setPlayingId] = useState(null);

  const messagesEndRef = useRef(null);

  // ── Load session list + monument names (for ancient subtitles) ──────
  const refreshSessions = useCallback(async () => {
    setLoadingList(true);
    const data = await fetchSessions();
    setSessions(data?.sessions || []);
    setLoadingList(false);
  }, [fetchSessions]);

  useEffect(() => {
    refreshSessions();
    fetchGovernorates().then((data) => {
      const map = {};
      (data?.governorates || []).forEach((g) =>
        (g.monuments || []).forEach((m) => { map[m.key] = m.display_name; })
      );
      setMonumentNames(map);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // ── Open a session ──────────────────────────────────────────────────
  const handleOpenSession = useCallback(async (sessionId) => {
    setLoadingDetail(true);
    setActiveSession(null);
    const detail = await fetchSessionDetail(sessionId);
    if (detail) {
      setActiveSession(detail);
      setMessages(detail.messages || []);
    } else {
      setMessages([]);
    }
    setLoadingDetail(false);
  }, [fetchSessionDetail]);

  // ── Delete a session ────────────────────────────────────────────────
  const handleDeleteSession = useCallback(async (e, sessionId) => {
    e.stopPropagation();
    setDeletingId(sessionId);
    const ok = await deleteSession(sessionId);
    if (ok) {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSession?.id === sessionId) {
        setActiveSession(null);
        setMessages([]);
      }
    }
    setDeletingId(null);
  }, [deleteSession, activeSession]);

  // ── Continue the conversation in the opened session ─────────────────
  const handleSendText = useCallback(async (text) => {
    if (!activeSession || !text.trim()) return;
    const s = activeSession;

    setMessages((prev) => [...prev, {
      id: `tmp-${Date.now()}`, sender: 'user', text, timestamp: Date.now(),
    }]);
    setIsSending(true);

    try {
      let data;
      if (s.chat_mode === 'ancient') {
        data = await sendAncientMessage(
          text, s.id, s.monument_key, s.language_mode || 'modern', 'direct'
        );
      } else if (s.chat_mode === 'family_member') {
        const firstMeta = (s.messages || []).find((m) => m.metadata?.member_name)?.metadata || {};
        data = await sendTextMessage(text, s.id, {
          persona: 'family_member',
          member_id: s.family_member_id,
          member_name: firstMeta.member_name,
          relation: firstMeta.relation,
        });
      } else {
        data = await sendTextMessage(text, s.id, { region: s.governorate_key || 'aswan' });
      }

      setMessages((prev) => [...prev, {
        id: `${Date.now()}-ai`, sender: 'ai', text: data.response, timestamp: Date.now(),
        metadata: { tts_text: data.tts_text, character_name: data.character_name },
      }]);

      // Bump session in the sidebar (title/date may have changed)
      setSessions((prev) => {
        const others = prev.filter((x) => x.id !== s.id);
        return [{ ...s, title: s.title, updated_at: Date.now() }, ...others];
      });
    } catch {
      setMessages((prev) => [...prev, {
        id: `err-${Date.now()}`, sender: 'ai',
        text: 'عذرًا، حصلت مشكلة في الإرسال. حاول تاني.',
        isError: true, timestamp: Date.now(),
      }]);
    } finally {
      setIsSending(false);
    }
  }, [activeSession, sendAncientMessage, sendTextMessage]);

  // ── Replay TTS for an old AI message ────────────────────────────────
  const handlePlayMessage = useCallback(async (msg) => {
    if (playingId) return;
    setPlayingId(msg.id);
    try {
      const ttsText = msg.metadata?.tts_text || msg.text;
      const character = msg.metadata?.character_name || 'am-othman';
      const blob = await fetchTTS(ttsText, character);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
      }
    } finally {
      setPlayingId(null);
    }
  }, [fetchTTS, playingId]);

  // ── Derived labels ──────────────────────────────────────────────────
  const activeTitle = activeSession
    ? (activeSession.chat_mode === 'ancient' && activeSession.monument_key
        ? monumentNames[activeSession.monument_key] || activeSession.title
        : activeSession.title)
    : '';

  const elderName = activeSession
    ? (activeSession.chat_mode === 'ancient'
        ? monumentNames[activeSession.monument_key] || 'الشخصية التاريخية'
        : activeSession.chat_mode === 'family_member'
          ? (messages.find((m) => m.metadata?.member_name)?.metadata?.member_name || 'فرد العيلة')
          : 'الحكواتي')
    : '';

  return (
    <div className="min-h-screen bg-[#0e0b08] text-[#f0e0c8]" style={{ paddingTop: 70, direction: 'rtl' }}>
      <div className="flex h-[calc(100vh-70px)]">
        {/* ── Sidebar: session list ── */}
        <aside
          className={`${activeSession ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-col border-l border-[#c4a06a]/10 bg-[#0b0a08]/80`}
        >
          {/* New chat */}
          <div className="p-4 border-b border-[#c4a06a]/10">
            <button
              onClick={() => navigate('/map')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-br from-[#c4a06a] to-[#a8865a] text-[#0b0a08] font-bold text-sm hover:opacity-90 transition-opacity"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <Plus size={18} />
              محادثة جديدة
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingList ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 text-[#c4a06a] animate-spin" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-14 px-4">
                <MessageCircle className="w-10 h-10 mx-auto text-[#c4a06a]/30 mb-3" />
                <p className="text-[#9d9167] text-sm" style={{ fontFamily: 'var(--font-body)' }}>
                  مفيش محادثات لسه.
                  <br />
                  ابدأ حكايتك من الخريطة!
                </p>
              </div>
            ) : (
              sessions.map((s) => {
                const Icon = MODE_ICONS[s.chat_mode] || MapPin;
                const isActive = activeSession?.id === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleOpenSession(s.id)}
                    className={`w-full text-right flex items-start gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
                      isActive
                        ? 'bg-[#c4a06a]/15 border border-[#c4a06a]/40'
                        : 'hover:bg-[#1a1815] border border-transparent'
                    }`}
                  >
                    <span className={`mt-0.5 shrink-0 ${isActive ? 'text-[#c4a06a]' : 'text-[#9d9167]'}`}>
                      <Icon size={17} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold text-[#f0e0c8] truncate" style={{ fontFamily: 'var(--font-body)' }}>
                        {s.chat_mode === 'ancient' && s.monument_key && monumentNames[s.monument_key]
                          ? monumentNames[s.monument_key]
                          : s.title}
                      </span>
                      <span className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#c4a06a]/10 text-[#c4a06a]/80 border border-[#c4a06a]/20">
                          {MODE_LABELS[s.chat_mode] || s.chat_mode}
                        </span>
                        <span className="text-[11px] text-[#9d9167]/70">
                          {formatRelativeDate(s.updated_at)} · {s.turn_count} حكاية
                        </span>
                      </span>
                    </span>
                    <span
                      onClick={(e) => handleDeleteSession(e, s.id)}
                      className="shrink-0 p-1.5 rounded-lg text-[#9d9167]/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="حذف المحادثة"
                    >
                      {deletingId === s.id
                        ? <Loader2 size={15} className="animate-spin" />
                        : <Trash2 size={15} className="opacity-0 group-hover:opacity-100" />}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ── Main pane: transcript ── */}
        <main className={`${activeSession ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>
          {loadingDetail ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#c4a06a] animate-spin" />
            </div>
          ) : !activeSession ? (
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
              <MessageCircle className="w-14 h-14 text-[#c4a06a]/20 mb-4" />
              <p className="text-[#9d9167] text-base" style={{ fontFamily: 'var(--font-body)' }}>
                اختار محادثة من القائمة عشان تقراها وتكملها
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-[#c4a06a]/10 bg-[#0b0a08]/60">
                <button
                  onClick={() => { setActiveSession(null); setMessages([]); }}
                  className="md:hidden p-1.5 rounded-lg text-[#9d9167] hover:text-[#c4a06a] transition-colors"
                  aria-label="رجوع"
                >
                  <ChevronRight size={20} />
                </button>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-[#f0e0c8] truncate" style={{ fontFamily: 'var(--font-body)' }}>
                    {activeTitle}
                  </h2>
                  <p className="text-[11px] text-[#9d9167]/80">
                    {MODE_LABELS[activeSession.chat_mode]} · {elderName}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.map((msg) => (
                  msg.sender === 'user' ? (
                    <div key={msg.id} className="flex justify-end animate-fade-in">
                      <div
                        className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-tr-sm bg-gradient-to-br from-[#c4a06a] to-[#a8865a] text-[#0b0a08] font-semibold text-sm leading-relaxed"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ) : (
                    <div key={msg.id} className="flex justify-start animate-fade-in">
                      <div
                        className={`max-w-[85%] px-4 py-3 rounded-2xl rounded-tl-sm border text-sm leading-relaxed ${
                          msg.isError
                            ? 'bg-red-500/15 text-red-200 border-red-400/20'
                            : 'bg-[#1a1815]/95 text-[#f8ebd5] border-[#c4a06a]/20'
                        }`}
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        <p>{msg.text}</p>
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#c4a06a]/10">
                          <button
                            onClick={() => handlePlayMessage(msg)}
                            disabled={playingId === msg.id}
                            className="text-[#c4a06a]/60 hover:text-[#c4a06a] transition-colors disabled:opacity-40"
                            title="اسمع الرد"
                          >
                            {playingId === msg.id
                              ? <Loader2 size={14} className="animate-spin" />
                              : <Volume2 size={14} />}
                          </button>
                          <span className="text-[10px] font-bold text-[#c4a06a]/70">{elderName}</span>
                        </div>
                      </div>
                    </div>
                  )
                ))}

                {isSending && (
                  <div className="flex justify-start">
                    <div className="bg-[#1a1815]/95 border border-[#c4a06a]/15 rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-1.5">
                      {[0, 0.2, 0.4].map((d, i) => (
                        <span key={i} className="w-2 h-2 rounded-full bg-[#c4a06a] opacity-60 animate-bounce" style={{ animationDelay: `${d}s` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Continue the conversation */}
              <ChatInput
                onSendText={handleSendText}
                onTranscribeAudio={transcribeAudio}
                isLoading={isSending}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
