import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

function DismissButton({ label, onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`group flex h-8 w-8 items-center justify-center rounded-full border border-[#e6b768]/20 bg-[#0b0907]/58 text-[#f4dfbd]/65 backdrop-blur-md transition duration-200 hover:border-[#e6b768]/55 hover:bg-[#e6b768]/12 hover:text-[#fff5e3] active:scale-95 ${className}`}
    >
      <X className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-90" aria-hidden="true" />
    </button>
  );
}

export default function RamsisLegacyStage({
  isSpeaking,
  name,
  location,
  title,
  bio,
  chips = [],
  onChipClick,
  onClose,
}) {
  const idleVideoRef = useRef(null);
  const speakingVideoRef = useRef(null);
  const [speakingReady, setSpeakingReady] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [visibleSuggestions, setVisibleSuggestions] = useState(() =>
    chips.map((_, index) => index),
  );

  const dismissSuggestion = (index) => {
    setVisibleSuggestions((current) => current.filter((item) => item !== index));
  };

  const markSpeakingFrameReady = () => {
    const video = speakingVideoRef.current;
    if (!video) return;

    if ('requestVideoFrameCallback' in video) {
      video.requestVideoFrameCallback(() => setSpeakingReady(true));
      return;
    }

    setSpeakingReady(true);
  };

  useEffect(() => {
    const idleVideo = idleVideoRef.current;
    const speakingVideo = speakingVideoRef.current;
    if (!idleVideo || !speakingVideo) return;

    idleVideo.play().catch(() => {});
    speakingVideo.play().catch(() => {});
  }, []);

  const showSpeakingVideo = isSpeaking && speakingReady;

  return (
    <section
      className="ramsis-legacy relative isolate h-full min-h-0 flex-1 overflow-hidden bg-[#0b0907]"
      aria-label={`واجهة ${name}`}
    >
      <img
        src="/map/ramsis-legacy.jpg"
        alt={`تمثال فرعوني يجسد ${name} داخل معبد مصري قديم`}
        width="1356"
        height="1159"
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover object-[28%_30%] lg:object-[45%_34%]"
      />
      <video
        ref={idleVideoRef}
        src="/character/ramsis_legacy_idle.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/map/ramsis-legacy.jpg"
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full object-cover object-[28%_30%] transition-opacity duration-500 lg:object-[45%_34%] ${
          showSpeakingVideo ? 'opacity-0' : 'opacity-100'
        }`}
      />
      <video
        ref={speakingVideoRef}
        src="/character/ramsis_legacy_speaking.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onPlaying={markSpeakingFrameReady}
        poster="/map/ramsis-legacy.jpg"
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full object-cover object-[28%_30%] transition-opacity duration-500 lg:object-[45%_34%] ${
          showSpeakingVideo ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,6,4,0.34)_0%,rgba(8,6,4,0.03)_32%,rgba(8,6,4,0.42)_72%,rgba(8,6,4,0.94)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,6,4,0.62)_0%,transparent_45%,rgba(8,6,4,0.42)_100%)]" />
      <div className="ramsis-legacy__light pointer-events-none absolute -top-24 left-[16%] h-[72%] w-40 -rotate-12 bg-[#ffd48b]/15 blur-3xl" />

      <DismissButton
        label="إغلاق صفحة رمسيس"
        onClick={onClose}
        className="absolute left-4 top-4 z-30 hidden h-9 w-9 lg:flex sm:left-5 sm:top-5"
      />

      <article className="ramsis-legacy__intro ramsis-legacy__intro-copy absolute bottom-5 right-5 z-20 w-[min(18rem,calc(100%-2.5rem))] lg:bottom-auto lg:right-8 lg:top-[27%] lg:w-[min(20rem,calc(100%-3.5rem))]">
          <p className="mb-1 text-[0.68rem] font-bold tracking-[0.15em] text-[#edc47e]">
            مَلِكُ الملوك
          </p>
          <h1 className="font-amiri text-4xl font-bold leading-tight text-[#fff0d2] sm:text-[2.75rem]">
            {name}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-[#f4dfbd]/85">
            <span>{location}</span>
            {title && <span className="text-[#e6b768]/50">•</span>}
            {title && <span>{title}</span>}
          </div>
          <div className="my-2.5 h-px w-3/4 bg-gradient-to-l from-[#e6b768]/60 to-transparent" />
          <p className="max-w-[30ch] text-[0.8rem] leading-6 text-[#fff3df]/90 sm:text-sm">
            {bio}
          </p>
      </article>

      {showSuggestions && visibleSuggestions.length > 0 && (
        <section className="ramsis-legacy__suggestions absolute inset-x-3 bottom-3 z-30 mx-auto hidden max-w-4xl rounded-[1.15rem] border border-[#e6b768]/22 bg-[#0b0907]/72 p-2.5 shadow-[0_16px_45px_rgba(0,0,0,0.42)] backdrop-blur-xl lg:block lg:inset-x-4 lg:bottom-4 lg:p-3">
          <div className="mb-2 flex items-center justify-between gap-4 px-0.5">
            <h2 className="font-amiri text-lg font-bold text-[#ffe2b3] sm:text-xl">اسأل رمسيس</h2>
            <DismissButton
              label="إخفاء كل الأسئلة المقترحة"
              onClick={() => setShowSuggestions(false)}
              className="h-7 w-7"
            />
          </div>

          <div className="flex snap-x gap-2 overflow-x-auto pb-0.5 sm:grid sm:grid-cols-3 sm:overflow-visible">
            {visibleSuggestions.map((index) => {
              const label = chips[index];

              return (
                <div
                  key={`${label}-${index}`}
                  className="group relative min-w-[12.5rem] snap-center overflow-hidden rounded-xl border border-[#e6b768]/24 bg-[#17110b]/65 transition duration-200 hover:border-[#e6b768]/55 hover:bg-[#21170d]/82 sm:min-w-0"
                >
                  <button
                    type="button"
                    onClick={() => onChipClick(label)}
                    className="min-h-12 w-full px-3 py-2 pl-9 text-right text-xs font-semibold leading-5 text-[#fff2dc] transition-colors group-hover:text-[#ffe1aa] sm:text-[0.8rem]"
                  >
                    {label}
                  </button>
                  <DismissButton
                    label={`إزالة اقتراح: ${label}`}
                    onClick={() => dismissSuggestion(index)}
                    className="absolute left-1.5 top-1.5 h-6 w-6 border-transparent bg-black/18"
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}
    </section>
  );
}
