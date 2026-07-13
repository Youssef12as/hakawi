import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, Mic, Heart, ChevronDown } from 'lucide-react';
import PageShell from '../components/layout/PageShell';

// ─── Region Data ───────────────────────────────────────────────────────────────
const REGIONS = [
  {
    key: 'aswan',
    name: 'أسوان والنوبة',
    nameEn: 'Aswan & Nubia',
    elderName: 'عم عثمان',
    elderTitle: 'حارس أسرار النوبة',
    quote: 'الكليم مش بس نسيج، ده لغة. كل رمز فيه بيحكي حكاية من جداتنا.',
    image: '/assets/char-aswan.png',
    accent: '#e8a87d',
    glow: 'rgba(232,168,125,0.35)',
    bg: 'linear-gradient(135deg, #1a0a00 0%, #3d1f00 40%, #7a4000 70%, #c4853a 100%)',
    tag: 'سجادة نوبية',
    symbol: '△',
    mapPos: { top: '72%', left: '54%' },
  },
  {
    key: 'luxor',
    name: 'الأقصر',
    nameEn: 'Luxor',
    elderName: 'حكيم الأقصر',
    elderTitle: 'راوي المعابد الفرعونية',
    quote: 'عنخ — مفتاح الحياة. أجدادنا نقشوه على كل باب ليحمي البيت من الأبد.',
    image: '/assets/char-luxor.png',
    accent: '#c4a847',
    glow: 'rgba(196,168,71,0.35)',
    bg: 'linear-gradient(135deg, #0a0600 0%, #2a1800 40%, #6b3d00 70%, #c4920a 100%)',
    tag: 'معبد الأقصر',
    symbol: '𓂀',
    mapPos: { top: '65%', left: '54%' },
  },
  {
    key: 'cairo',
    name: 'القاهرة',
    nameEn: 'Cairo',
    elderName: 'الشيخ محمود',
    elderTitle: 'عالم الأزهر الشريف',
    quote: 'الأرابيسك هو فن إسلامي خالص — خطوط بلا نهاية ترمز لاستمرارية الوجود.',
    image: '/assets/char-cairo.png',
    accent: '#5aa0c4',
    glow: 'rgba(90,160,196,0.35)',
    bg: 'linear-gradient(135deg, #00080f 0%, #001525 40%, #002d4a 70%, #1a5a80 100%)',
    tag: 'باب زويلة',
    symbol: '✦',
    mapPos: { top: '42%', left: '52%' },
  },
  {
    key: 'alexandria',
    name: 'الإسكندرية',
    nameEn: 'Alexandria',
    elderName: 'عم سيد البحري',
    elderTitle: 'ابن البحر المتوسط',
    quote: 'الإسكندرية مدينة بتتنفس من البحر. الإغريق والمصريين كلهم خلوا أثر هنا.',
    image: '/assets/char-alexandria.png',
    accent: '#4a9fc4',
    glow: 'rgba(74,159,196,0.35)',
    bg: 'linear-gradient(135deg, #00050a 0%, #001020 40%, #001e38 70%, #0a4a6e 100%)',
    tag: 'فنار الإسكندرية',
    symbol: '🔱',
    mapPos: { top: '28%', left: '46%' },
  },
];

// ─── Particle Component ────────────────────────────────────────────────────────
function Particles({ color }) {
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 4}s`,
    duration: `${3 + Math.random() * 4}s`,
    size: `${2 + Math.random() * 3}px`,
    opacity: 0.3 + Math.random() * 0.5,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.left,
            bottom: '-10px',
            width: p.size,
            height: p.size,
            backgroundColor: color,
            opacity: p.opacity,
            animation: `floatUp ${p.duration} ${p.delay} ease-in infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Egypt SVG Map ─────────────────────────────────────────────────────────────
function EgyptMap({ activeKey, onHover }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center select-none">
      {/* Simplified Egypt outline */}
      <svg viewBox="0 0 200 300" className="w-48 h-72 md:w-64 md:h-96 opacity-40" fill="none">
        <path
          d="M80,10 L120,10 L145,30 L155,60 L160,100 L165,140 L160,180 L130,220 L100,280 L70,220 L40,180 L35,140 L40,100 L45,60 L55,30 Z"
          stroke="#c4a06a"
          strokeWidth="1.5"
          fill="rgba(196,160,106,0.05)"
        />
        {/* Nile line */}
        <path
          d="M100,280 L98,220 L100,160 L102,100 L100,60 L100,30"
          stroke="#c4a06a"
          strokeWidth="0.8"
          strokeDasharray="4 4"
          opacity="0.4"
        />
      </svg>

      {/* Region dots on map */}
      {REGIONS.map((r) => (
        <button
          key={r.key}
          onMouseEnter={() => onHover(r.key)}
          onClick={() => onHover(r.key)}
          className="absolute group"
          style={{ top: r.mapPos.top, left: r.mapPos.left, transform: 'translate(-50%,-50%)' }}
        >
          {/* Outer pulse */}
          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{
              backgroundColor: r.accent,
              opacity: activeKey === r.key ? 0.5 : 0.2,
              width: '24px',
              height: '24px',
            }}
          />
          {/* Dot */}
          <div
            className="relative w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs transition-all duration-300"
            style={{
              backgroundColor: activeKey === r.key ? r.accent : 'transparent',
              borderColor: r.accent,
              boxShadow: activeKey === r.key ? `0 0 20px ${r.glow}` : 'none',
              color: activeKey === r.key ? '#000' : r.accent,
              transform: activeKey === r.key ? 'scale(1.3)' : 'scale(1)',
            }}
          >
            <span className="text-[8px]">{r.symbol}</span>
          </div>
          {/* Label */}
          <span
            className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] whitespace-nowrap font-bold"
            style={{ color: r.accent, opacity: activeKey === r.key ? 1 : 0.5 }}
          >
            {r.name}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Main Landing ──────────────────────────────────────────────────────────────
export default function Landing() {
  const [activeRegion, setActiveRegion] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const intervalRef = useRef(null);

  // Auto-cycle regions
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setActiveRegion((prev) => (prev + 1) % REGIONS.length);
        setIsTransitioning(false);
      }, 400);
    }, 4000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const handleRegionHover = (key) => {
    clearInterval(intervalRef.current);
    const idx = REGIONS.findIndex((r) => r.key === key);
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveRegion(idx);
      setIsTransitioning(false);
    }, 200);
  };

  const region = REGIONS[activeRegion];

  return (
    <div className="min-h-screen font-cairo overflow-x-hidden" dir="rtl">

      {/* ══════════════════════════════════════════════════════════════
          HERO SECTION — Full screen cinematic
      ══════════════════════════════════════════════════════════════ */}
      <section
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        style={{ background: '#050302' }}
      >
        {/* Hero background image */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
          style={{
            backgroundImage: 'url(/assets/hero-egypt-night.png)',
            opacity: 0.45,
          }}
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/90" />

        {/* Floating hieroglyph symbols */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {['𓂀', '𓋹', '𓆣', '△', '✦', '〰'].map((sym, i) => (
            <span
              key={i}
              className="absolute text-2xl select-none"
              style={{
                left: `${10 + i * 15}%`,
                top: `${15 + (i % 3) * 25}%`,
                color: '#c4a06a',
                opacity: 0.08 + (i % 3) * 0.04,
                animation: `floatDrift ${6 + i * 1.5}s ease-in-out ${i * 0.8}s infinite alternate`,
                fontSize: `${1.2 + (i % 3) * 0.6}rem`,
              }}
            >
              {sym}
            </span>
          ))}
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-8"
            style={{ borderColor: '#c4a06a40', backgroundColor: '#c4a06a10', color: '#c4a06a' }}>
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-xs font-bold">منصة التراث المصري الشفوي</span>
          </div>

          {/* Main title */}
          <h1
            className="font-extrabold mb-4 leading-none"
            style={{
              fontSize: 'clamp(5rem, 20vw, 12rem)',
              color: '#f5e6c8',
              textShadow: '0 0 80px rgba(196,160,106,0.3), 0 4px 20px rgba(0,0,0,0.8)',
              animation: 'fadeSlideUp 1s ease forwards',
            }}
          >
            حكاوي
          </h1>

          <p className="text-xl text-white/50 mb-2 font-light" style={{ animation: 'fadeSlideUp 1s 0.2s ease forwards', opacity: 0 }}>
            صوت الماضي، حيّ في الحاضر
          </p>
          <p className="text-sm text-white/25 mb-12 tracking-widest uppercase" style={{ animation: 'fadeSlideUp 1s 0.35s ease forwards', opacity: 0 }}>
            The voice of the past, alive in the present
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center" style={{ animation: 'fadeSlideUp 1s 0.5s ease forwards', opacity: 0 }}>
            <Link
              to="/map"
              className="group flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105"
              style={{ backgroundColor: '#c4853a', color: '#fff', boxShadow: '0 0 40px rgba(196,133,58,0.4)' }}
              id="hero-cta-map"
            >
              استكشف الخريطة
              <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            </Link>
            <Link
              to="/family"
              className="flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 border"
              style={{ borderColor: '#c4a06a40', color: '#c4a06a', backgroundColor: 'transparent' }}
              id="hero-cta-family"
            >
              <Mic className="w-5 h-5" />
              سجّل صوت عيلتك
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
          <span className="text-white text-xs">اكتشف أكثر</span>
          <ChevronDown className="w-5 h-5 text-white animate-bounce" />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 1 — شخصيات من كل ركن (Scroll Storytelling)
      ══════════════════════════════════════════════════════════════ */}
      <section
        className="relative min-h-screen flex items-center overflow-hidden transition-all duration-700"
        style={{ background: region.bg }}
        id="characters-section"
      >
        <Particles color={region.accent} />

        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-700"
          style={{ background: `radial-gradient(ellipse at 30% 50%, ${region.glow} 0%, transparent 70%)` }}
        />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-12 items-center">

          {/* ── Left: Text + Map ── */}
          <div className="flex flex-col gap-8">
            {/* Section label */}
            <div className="flex items-center gap-3">
              <div className="w-px h-12 opacity-60" style={{ backgroundColor: region.accent }} />
              <div>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: region.accent }}>
                  شخصيات من كل ركن
                </p>
                <p className="text-white/30 text-xs">Interactive Heritage Characters</p>
              </div>
            </div>

            {/* Region name — transitions */}
            <div className={`transition-all duration-400 ${isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
              <h2
                className="text-5xl md:text-6xl font-extrabold mb-2 leading-tight"
                style={{ color: region.accent, textShadow: `0 0 40px ${region.glow}` }}
              >
                {region.name}
              </h2>
              <p className="text-white/40 text-lg mb-6">{region.nameEn}</p>

              {/* Quote */}
              <blockquote
                className="text-white/80 text-xl leading-relaxed border-r-4 pr-5 italic mb-8"
                style={{ borderColor: region.accent }}
              >
                "{region.quote}"
              </blockquote>

              <p className="text-white/50 text-sm font-bold">
                — {region.elderName}، {region.elderTitle}
              </p>
            </div>

            {/* Region selector tabs */}
            <div className="flex gap-3 flex-wrap">
              {REGIONS.map((r, i) => (
                <button
                  key={r.key}
                  onClick={() => handleRegionHover(r.key)}
                  className="px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300"
                  style={{
                    backgroundColor: activeRegion === i ? r.accent : 'rgba(255,255,255,0.06)',
                    color: activeRegion === i ? '#000' : 'rgba(255,255,255,0.5)',
                    border: `1px solid ${activeRegion === i ? r.accent : 'rgba(255,255,255,0.1)'}`,
                    boxShadow: activeRegion === i ? `0 0 20px ${r.glow}` : 'none',
                  }}
                >
                  {r.symbol} {r.name}
                </button>
              ))}
            </div>

            {/* CTA */}
            <Link
              to="/map"
              className="self-start flex items-center gap-2 font-bold transition-all duration-300 hover:gap-3"
              style={{ color: region.accent }}
              id="characters-cta"
            >
              تحدث مع الشخصية
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </div>

          {/* ── Right: Character Image + Map ── */}
          <div className="relative flex items-center justify-center gap-6">

            {/* Character portrait */}
            <div
              className={`relative transition-all duration-500 ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
            >
              {/* Glow ring */}
              <div
                className="absolute inset-0 rounded-3xl blur-2xl -z-10 scale-110 transition-colors duration-700"
                style={{ backgroundColor: region.glow }}
              />
              <img
                src={region.image}
                alt={region.elderName}
                className="w-64 h-80 md:w-80 md:h-96 object-cover rounded-3xl shadow-2xl"
                style={{
                  border: `2px solid ${region.accent}40`,
                  boxShadow: `0 0 60px ${region.glow}, 0 20px 60px rgba(0,0,0,0.6)`,
                }}
              />
              {/* Tag badge */}
              <div
                className="absolute -top-4 -right-4 px-3 py-1.5 rounded-xl text-xs font-bold"
                style={{ backgroundColor: region.accent, color: '#000' }}
              >
                {region.tag}
              </div>
              {/* AI badge */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs"
                style={{ backgroundColor: 'rgba(0,0,0,0.7)', border: `1px solid ${region.accent}30`, color: 'rgba(255,255,255,0.5)' }}>
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: region.accent }} />
                ذكاء اصطناعي — ليس شخصًا حقيقيًا
              </div>
            </div>

            {/* Mini Egypt map */}
            <div className="hidden md:block w-48 h-72 opacity-80">
              <EgyptMap activeKey={region.key} onHover={handleRegionHover} />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 2 — صوت حبايبك
      ══════════════════════════════════════════════════════════════ */}
      <section
        className="relative min-h-screen flex items-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #080308 0%, #150a15 40%, #1f0a0a 100%)' }}
        id="voice-section"
      >
        {/* Subtle red/wine glow */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 70% 50%, rgba(120,30,30,0.3) 0%, transparent 65%)' }} />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-16 items-center">

          {/* Mock voice recorder card */}
          <div className="relative">
            <div
              className="rounded-3xl p-8 border"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(180,60,60,0.2)' }}
            >
              {/* Waveform visual */}
              <div className="flex items-center justify-center gap-1 mb-8 h-16">
                {Array.from({ length: 32 }, (_, i) => (
                  <div
                    key={i}
                    className="rounded-full"
                    style={{
                      width: '4px',
                      backgroundColor: '#b03030',
                      height: `${10 + Math.sin(i * 0.5) * 30 + Math.random() * 20}px`,
                      opacity: 0.4 + Math.sin(i * 0.3) * 0.4,
                      animation: `waveBar ${0.5 + (i % 5) * 0.15}s ease-in-out ${i * 0.05}s infinite alternate`,
                    }}
                  />
                ))}
              </div>

              {/* Mic button */}
              <div className="flex justify-center mb-6">
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
                  style={{
                    backgroundColor: '#8b1a1a',
                    boxShadow: '0 0 40px rgba(139,26,26,0.5), 0 0 80px rgba(139,26,26,0.2)',
                  }}
                >
                  <Mic className="w-10 h-10 text-white" />
                </div>
              </div>

              <p className="text-center text-white/40 text-sm mb-4">اضغط وابدأ التسجيل</p>

              {/* Sample member */}
              <div className="flex items-center gap-4 p-4 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{ backgroundColor: 'rgba(180,60,60,0.2)' }}>👵</div>
                <div>
                  <p className="text-white font-bold text-sm">تيتا فاطمة</p>
                  <p className="text-white/30 text-xs">تسجيل ٣ دقائق و٤٢ ثانية</p>
                </div>
                <div className="mr-auto flex items-center gap-1 px-3 py-1 rounded-lg" style={{ backgroundColor: 'rgba(180,60,60,0.2)' }}>
                  <Heart className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-red-400 text-xs font-bold">محفوظ</span>
                </div>
              </div>
            </div>
          </div>

          {/* Text */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#b03030' }}>
              صوت شجرة العيلة
            </p>
            <h2 className="text-5xl font-extrabold text-white mb-6 leading-tight">
              سجّل صوت
              <br />
              <span style={{ color: '#c46060', textShadow: '0 0 30px rgba(180,60,60,0.5)' }}>
                حبايبك
              </span>
            </h2>
            <p className="text-white/50 text-lg leading-relaxed mb-8">
              قبل ما يرحلوا، خليهم يفضلوا معاك. سجّل أصوات أجدادك وحبايبك — حكاياتهم، أغانيهم، وصاياهم.
              الـ AI هيبني نموذج من صوتهم يتكلم معاك في المناسبات.
            </p>
            <div className="space-y-4 mb-10">
              {['سجّل صوت أي شخص بأي لغة أو لهجة', 'الـ AI بيحفظ طريقة كلامه وشخصيته', 'بيتكلم معاك في الأعياد والمناسبات'].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#b03030' }} />
                  <span className="text-white/60 text-sm">{item}</span>
                </div>
              ))}
            </div>
            <Link
              to="/family"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105"
              style={{ backgroundColor: '#8b1a1a', color: '#fff', boxShadow: '0 0 30px rgba(139,26,26,0.4)' }}
              id="voice-cta"
            >
              ابدأ التسجيل
              <Mic className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 3 — التعليم والأطفال
      ══════════════════════════════════════════════════════════════ */}
      <section
        className="relative min-h-[70vh] flex items-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #030812 0%, #061525 50%, #0a2040 100%)' }}
        id="education-section"
      >
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(20,80,140,0.4) 0%, transparent 65%)' }} />

        <div className="relative z-10 w-full max-w-5xl mx-auto px-6 py-20 text-center">
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#4a9fc4' }}>
            تعليم وأطفال
          </p>
          <h2 className="text-5xl font-extrabold text-white mb-6">
            حكايات لكل
            <span style={{ color: '#4a9fc4', textShadow: '0 0 30px rgba(74,159,196,0.5)' }}> عمر</span>
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto mb-12 leading-relaxed">
            اكتشف التراث المصري مع أطفالك بطريقة ممتعة وتفاعلية. قصص، ألغاز، ورسومات مستوحاة من عمق التاريخ المصري.
          </p>
          <div className="flex flex-wrap gap-4 justify-center mb-12">
            {['قصص الأقصر', 'رموز النوبة', 'الأبجدية الهيروغليفية', 'أساطير الإسكندرية'].map((tag, i) => (
              <span key={i} className="px-4 py-2 rounded-xl text-sm font-bold"
                style={{ backgroundColor: 'rgba(74,159,196,0.15)', border: '1px solid rgba(74,159,196,0.3)', color: '#4a9fc4' }}>
                {tag}
              </span>
            ))}
          </div>
          <Link to="/map" id="education-cta"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105"
            style={{ backgroundColor: '#1a4a6e', color: '#fff', border: '1px solid rgba(74,159,196,0.4)' }}>
            <Sparkles className="w-5 h-5" />
            استكشف الآن
          </Link>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════ */}
      <footer className="py-10 px-4" style={{ backgroundColor: '#030201' }}>
        <div className="max-w-5xl mx-auto text-center">
          <h3 className="text-3xl font-extrabold mb-2" style={{ color: '#c4a06a' }}>حكاوي</h3>
          <p className="text-white/20 text-sm mb-1">حفظ التراث الشفوي المصري بالذكاء الاصطناعي</p>
          <p className="text-white/10 text-xs">Cairo University × AI Nexus Hackathon 2026</p>
        </div>
      </footer>

      {/* CSS Animations */}
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(1); opacity: 0.4; }
          100% { transform: translateY(-100vh) scale(0.3); opacity: 0; }
        }
        @keyframes floatDrift {
          0% { transform: translateY(0px) rotate(0deg); }
          100% { transform: translateY(-15px) rotate(5deg); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes waveBar {
          from { transform: scaleY(0.4); }
          to { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
