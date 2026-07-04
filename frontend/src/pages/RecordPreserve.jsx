import { useEffect, useState, useRef, useCallback } from 'react';
import { CheckCircle, RotateCcw, Upload, Users } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import ConsentScreen from '../components/consent/ConsentScreen';
import RecordButton from '../components/record/RecordButton';
import WaveformIndicator from '../components/record/WaveformIndicator';
import Button from '../components/common/Button';
import { useAppContext } from '../context/AppContext';

export default function RecordPreserve() {
  const { consentGiven, setConsentGiven } = useAppContext();
  const [step, setStep] = useState('record'); // record | review | success
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [stream, setStream] = useState(null);
  const [charName, setCharName] = useState('');
  const [refText, setRefText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [existingChars, setExistingChars] = useState([]);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // Fetch existing characters on mount
  useEffect(() => {
    fetch('/api/characters')
      .then((res) => res.json())
      .then((data) => {
        // Handle array or object
        if (Array.isArray(data.characters)) {
          setExistingChars(data.characters);
        } else if (data.characters && typeof data.characters === 'object') {
          setExistingChars(Object.keys(data.characters));
        }
      })
      .catch((err) => console.error('Failed to fetch characters:', err));
  }, [step]); // re-fetch when step changes (e.g. after success)

  // ── Recording ────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(mediaStream);

      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = '';
      }

      const recorder = new MediaRecorder(mediaStream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setStep('review');
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      setError('لم نتمكن من الوصول للميكروفون. تأكد من إعطاء الإذن.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setIsRecording(false);
  }, [stream]);

  const toggleRecording = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const resetRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setStep('record');
    setError(null);
  };

  // ── Submit ───────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!charName.trim() || !refText.trim() || !audioBlob) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('char_name', charName.trim());
      formData.append('ref_text', refText.trim());
      formData.append('audio_file', audioBlob, 'recording.webm');

      const res = await fetch('/api/characters/add', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'فشل في حفظ الشخصية');
      }

      setStep('success');
    } catch (e) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startOver = () => {
    resetRecording();
    setCharName('');
    setRefText('');
    setStep('record');
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

  // ── Main Flow ────────────────────────────────────────────────────
  return (
    <PageShell>
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-espresso mb-2 text-center">سجّل واحفظ</h1>
        <p className="text-olive text-center mb-10 text-sm">
          سجّل صوت وحكايات الأجداد لحفظ التراث الشفوي
        </p>

        {/* ── Step: Record ── */}
        {step === 'record' && (
          <div className="text-center animate-fade-in" id="record-step">
            <div className="mb-8">
              <WaveformIndicator stream={stream} isRecording={isRecording} />
            </div>
            <RecordButton
              isRecording={isRecording}
              onToggle={toggleRecording}
            />
            <p className="text-olive text-sm mt-6">
              {isRecording ? '🔴 جاري التسجيل... اضغط لإيقاف' : 'اضغط لبدء التسجيل'}
            </p>
            {error && (
              <p className="text-red-600 text-sm mt-4 bg-red-50 rounded-xl px-4 py-3">
                {error}
              </p>
            )}
          </div>
        )}

        {/* ── Step: Review & Submit ── */}
        {step === 'review' && (
          <div className="animate-fade-in space-y-6" id="review-step">
            {audioUrl && (
              <div className="bg-espresso/5 rounded-2xl p-6 border border-brown/10">
                <p className="text-sm font-semibold text-espresso mb-3">مراجعة التسجيل</p>
                <audio controls src={audioUrl} className="w-full mb-4" />
                <Button variant="ghost" size="sm" onClick={resetRecording}>
                  <RotateCcw className="w-4 h-4" />
                  إعادة التسجيل
                </Button>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="char-name-input"
                  className="block text-sm font-semibold text-espresso mb-1.5"
                >
                  اسم الشخصية
                </label>
                <input
                  id="char-name-input"
                  type="text"
                  value={charName}
                  onChange={(e) => setCharName(e.target.value)}
                  placeholder="مثال: الحاج علي"
                  className="w-full px-4 py-3 rounded-xl bg-espresso/5 border border-brown/12 text-espresso placeholder:text-olive/40 focus:outline-none focus:border-wine/40 transition-colors"
                />
              </div>
              <div>
                <label
                  htmlFor="ref-text-input"
                  className="block text-sm font-semibold text-espresso mb-1.5"
                >
                  النص المرجعي (المنطوق في التسجيل)
                </label>
                <textarea
                  id="ref-text-input"
                  value={refText}
                  onChange={(e) => setRefText(e.target.value)}
                  placeholder="اكتب النص الذي تم نطقه في التسجيل..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-espresso/5 border border-brown/12 text-espresso placeholder:text-olive/40 focus:outline-none focus:border-wine/40 transition-colors resize-none"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">{error}</p>
            )}

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!charName.trim() || !refText.trim()}
              loading={isSubmitting}
              onClick={handleSubmit}
              id="submit-character-btn"
            >
              <Upload className="w-5 h-5" />
              حفظ الشخصية
            </Button>
          </div>
        )}

        {/* ── Step: Success ── */}
        {step === 'success' && (
          <div className="text-center animate-fade-in py-8" id="success-step">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-espresso mb-2">تم الحفظ بنجاح!</h2>
            <p className="text-olive mb-8 text-sm">
              تم حفظ الشخصية الصوتية بنجاح. يمكنك الآن تسجيل شخصية أخرى.
            </p>
            <Button variant="primary" onClick={startOver}>
              <RotateCcw className="w-4 h-4" />
              سجّل شخصية أخرى
            </Button>
          </div>
        )}

        {/* ── Existing Personas ── */}
        <div className="mt-16 pt-8 border-t border-brown/10 animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-wine/10 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-wine" />
            </div>
            <h2 className="text-xl font-bold text-espresso">الشخصيات المسجلة</h2>
          </div>
          
          {existingChars.length === 0 ? (
            <p className="text-olive text-sm bg-espresso/5 rounded-xl p-4 text-center">
              لا توجد شخصيات مسجلة حتى الآن. كن أول من يسجل!
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {existingChars.map((char, index) => (
                <div key={index} className="bg-white/50 border border-brown/10 rounded-xl p-4 text-center hover:border-wine/20 transition-colors">
                  <span className="text-2xl mb-2 block">👤</span>
                  <p className="font-bold text-espresso text-sm">{char}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
