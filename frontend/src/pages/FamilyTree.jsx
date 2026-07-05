import { useState, useRef, useCallback, useEffect } from 'react';
import { Plus, Mic, Square, RotateCcw, Upload, Users, Calendar, MessageCircle, ChevronLeft } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import ConsentScreen from '../components/consent/ConsentScreen';
import Button from '../components/common/Button';
import { useAppContext } from '../context/AppContext';

const DEMO_MEMBERS = [
  { id: 1, name: 'تيتا فاطمة', emoji: '👵', relation: 'جدة', dialect: 'دلتاوي', memories: 847, status: 'preserved', occasions: ['عيد ميلاد — 15 مارس', 'عيد الأضحى'] },
  { id: 2, name: 'جدو حسن', emoji: '👴', relation: 'جد', dialect: 'صعيدي', memories: 1203, status: 'preserved', occasions: ['ذكرى زواج — 8 يناير'] },
  { id: 3, name: 'عمو كريم', emoji: '👨', relation: 'عم', dialect: 'قاهري', memories: 0, status: 'recording', occasions: [] },
];

export default function FamilyTree() {
  const { consentGiven, setConsentGiven } = useAppContext();
  const [members, setMembers] = useState(DEMO_MEMBERS);
  const [view, setView] = useState('tree'); // tree | add | detail
  const [selectedMember, setSelectedMember] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [stream, setStream] = useState(null);
  const [newName, setNewName] = useState('');
  const [newRelation, setNewRelation] = useState('');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // ── Recording ────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(mediaStream);
      const recorder = new MediaRecorder(mediaStream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        mediaStream.getTracks().forEach((t) => t.stop());
        setStream(null);
      };
      recorder.start();
      setIsRecording(true);
    } catch {
      alert('لم نتمكن من الوصول إلى الميكروفون');
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  const toggleRecording = () => (isRecording ? stopRecording() : startRecording());

  const resetRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
  };

  const handleAddMember = () => {
    if (!newName.trim()) return;
    const newMember = {
      id: Date.now(),
      name: newName.trim(),
      emoji: '👤',
      relation: newRelation.trim() || 'فرد من العائلة',
      dialect: 'غير محدد',
      memories: 0,
      status: audioBlob ? 'recording' : 'new',
      occasions: [],
    };
    setMembers((prev) => [...prev, newMember]);
    setNewName('');
    setNewRelation('');
    resetRecording();
    setView('tree');
  };

  // ── Consent Gate ─────────────────────────────────────────────────
  if (!consentGiven) {
    return (
      <PageShell>
        <ConsentScreen isOpen={true} onConsent={() => setConsentGiven(true)} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-olive text-lg">يرجى الموافقة على شروط التسجيل أولاً</p>
        </div>
      </PageShell>
    );
  }

  // ── Member Detail View ──────────────────────────────────────────
  if (view === 'detail' && selectedMember) {
    const m = selectedMember;
    return (
      <PageShell>
        <div className="max-w-2xl mx-auto px-4 py-12">
          <button onClick={() => { setView('tree'); setSelectedMember(null); }} className="flex items-center gap-2 text-olive hover:text-espresso transition-colors mb-8 text-sm font-semibold">
            <ChevronLeft className="w-4 h-4" />
            العودة لشجرة العائلة
          </button>

          <div className="text-center mb-10">
            <div className="w-24 h-24 bg-wine/10 rounded-full flex items-center justify-center mx-auto mb-4 text-5xl ring-4 ring-wine/20">
              {m.emoji}
            </div>
            <h2 className="text-3xl font-bold text-espresso">{m.name}</h2>
            <p className="text-olive text-sm">{m.relation} · {m.dialect}</p>
            <span className={`inline-block mt-2 text-xs px-3 py-1 rounded-full font-semibold ${
              m.status === 'preserved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {m.status === 'preserved' ? '✅ محفوظ' : '🔄 جاري التسجيل'}
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-espresso/5 rounded-xl p-5 text-center border border-brown/8">
              <p className="text-3xl font-bold text-wine">{m.memories}</p>
              <p className="text-olive text-xs mt-1">ذكرى محفوظة</p>
            </div>
            <div className="bg-espresso/5 rounded-xl p-5 text-center border border-brown/8">
              <p className="text-3xl font-bold text-wine">{m.occasions.length}</p>
              <p className="text-olive text-xs mt-1">مناسبة مسجلة</p>
            </div>
          </div>

          {/* Occasions */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-espresso mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-wine" />
              المناسبات القادمة
            </h3>
            {m.occasions.length === 0 ? (
              <p className="text-olive text-sm bg-espresso/5 rounded-xl p-4 text-center">لا توجد مناسبات مسجلة بعد</p>
            ) : (
              <div className="space-y-2">
                {m.occasions.map((occ, i) => (
                  <div key={i} className="flex items-center gap-3 bg-wine/5 border border-wine/10 rounded-xl px-4 py-3">
                    <span className="text-lg">🎂</span>
                    <p className="text-sm text-espresso font-medium">{occ}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chat CTA */}
          {m.status === 'preserved' && (
            <Button variant="primary" size="lg" className="w-full" disabled>
              <MessageCircle className="w-5 h-5" />
              تحدث مع {m.name} (قريبًا)
            </Button>
          )}
        </div>
      </PageShell>
    );
  }

  // ── Add Member View ─────────────────────────────────────────────
  if (view === 'add') {
    return (
      <PageShell>
        <div className="max-w-2xl mx-auto px-4 py-12">
          <button onClick={() => setView('tree')} className="flex items-center gap-2 text-olive hover:text-espresso transition-colors mb-8 text-sm font-semibold">
            <ChevronLeft className="w-4 h-4" />
            العودة لشجرة العائلة
          </button>

          <h1 className="text-3xl font-bold text-espresso mb-2 text-center">إضافة فرد جديد</h1>
          <p className="text-olive text-center mb-10 text-sm">سجّل صوت أحبائك لحفظه للأجيال القادمة</p>

          <div className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-espresso mb-1.5">الاسم</label>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="مثال: تيتا فاطمة" className="w-full px-4 py-3 rounded-xl bg-espresso/5 border border-brown/12 text-espresso placeholder:text-olive/40 focus:outline-none focus:border-wine/40 transition-colors" />
            </div>

            {/* Relation */}
            <div>
              <label className="block text-sm font-semibold text-espresso mb-1.5">صلة القرابة</label>
              <input type="text" value={newRelation} onChange={(e) => setNewRelation(e.target.value)} placeholder="مثال: جدة، عم، أخ" className="w-full px-4 py-3 rounded-xl bg-espresso/5 border border-brown/12 text-espresso placeholder:text-olive/40 focus:outline-none focus:border-wine/40 transition-colors" />
            </div>

            {/* Voice Recording */}
            <div>
              <label className="block text-sm font-semibold text-espresso mb-3">تسجيل عينة صوتية (30 ثانية على الأقل)</label>
              <div className="text-center">
                <button onClick={toggleRecording} className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto transition-all duration-300 ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-wine/10 text-wine hover:bg-wine/20'}`}>
                  {isRecording ? <Square className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                </button>
                <p className="text-olive text-sm mt-3">{isRecording ? '🔴 جاري التسجيل... اضغط لإيقاف' : 'اضغط لبدء التسجيل'}</p>
              </div>
              {audioUrl && (
                <div className="bg-espresso/5 rounded-xl p-4 mt-4 border border-brown/10">
                  <audio controls src={audioUrl} className="w-full mb-3" />
                  <button onClick={resetRecording} className="text-xs text-wine font-semibold flex items-center gap-1 hover:text-wine/70">
                    <RotateCcw className="w-3 h-3" /> إعادة التسجيل
                  </button>
                </div>
              )}
            </div>

            <Button variant="primary" size="lg" className="w-full" disabled={!newName.trim()} onClick={handleAddMember}>
              <Upload className="w-5 h-5" />
              إضافة للشجرة
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  // ── Family Tree View (Default) ──────────────────────────────────
  return (
    <PageShell>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-espresso mb-2">شجرة العيلة</h1>
          <p className="text-olive text-sm max-w-md mx-auto">
            احفظ أصوات أحبائك وذكرياتهم. عندما يرحلون، يبقى صوتهم وشخصيتهم حية — يرسلون لك رسائل صوتية في الأعياد والمناسبات.
          </p>
        </div>

        {/* Family Members Grid */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => { setSelectedMember(m); setView('detail'); }}
              className="group flex items-center gap-4 bg-white/60 border border-brown/8 rounded-2xl p-5 text-right hover:border-wine/25 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-14 h-14 bg-wine/8 rounded-full flex items-center justify-center text-3xl flex-shrink-0 group-hover:bg-wine/15 transition-colors">
                {m.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-espresso text-lg">{m.name}</p>
                <p className="text-olive text-xs">{m.relation} · {m.dialect}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    m.status === 'preserved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {m.status === 'preserved' ? `✅ ${m.memories} ذكرى` : '🔄 جاري التسجيل'}
                  </span>
                </div>
              </div>
              <ChevronLeft className="w-5 h-5 text-olive/30 group-hover:text-wine transition-colors" />
            </button>
          ))}
        </div>

        {/* Add Member Button */}
        <button
          onClick={() => setView('add')}
          className="w-full flex items-center justify-center gap-3 py-5 border-2 border-dashed border-brown/15 rounded-2xl text-olive hover:border-wine/30 hover:text-wine hover:bg-wine/5 transition-all duration-300 group"
        >
          <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-sm">إضافة فرد جديد للعائلة</span>
        </button>

        {/* User Flow */}
        <div className="mt-16 pt-8 border-t border-brown/10">
          <h2 className="text-lg font-bold text-espresso mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-wine" />
            كيف تعمل شجرة العيلة؟
          </h2>
          <div className="space-y-4">
            {[
              'أضف فرد من العائلة ← سجّل عينة صوتية (30 ثانية على الأقل)',
              'النظام يستنسخ الصوت ويبني نموذج شخصية من القصص والذكريات',
              'سجّل المناسبات المهمة في تقويم العائلة (أعياد ميلاد، أعياد دينية)',
              'في كل مناسبة ← رسالة صوتية مولّدة تلقائيًا من الشخص بصوته',
              'افتح محادثة في أي وقت للتحدث مع أي صوت محفوظ في الشجرة',
            ].map((step, i) => (
              <div key={i} className="flex gap-4 items-start">
                <span className="w-8 h-8 bg-wine/10 rounded-full flex items-center justify-center text-wine text-sm font-bold flex-shrink-0">{i + 1}</span>
                <p className="text-olive text-sm leading-relaxed pt-1">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
