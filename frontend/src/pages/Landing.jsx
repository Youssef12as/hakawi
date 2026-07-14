import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mic, ChevronDown, MousePointer, Sparkles, Users, Heart } from 'lucide-react';

/* ─── Font constants ───────────────────────────────────────────────────────── */
const FONT_HEADING = "'Noto Kufi Arabic', 'IBM Plex Sans Arabic', sans-serif";
const FONT_BODY = "'IBM Plex Sans Arabic', 'Noto Kufi Arabic', sans-serif";

/* ─── Regions ──────────────────────────────────────────────────────────────── */
const REGIONS = [
  {
    key: 'aswan',
    name: 'أسوان والنوبة',
    nameEn: 'Aswan & Nubia',
    elderName: 'عم عثمان',
    elderTitle: 'حارس أسرار النوبة',
    quote: 'الكليم مش بس نسيج، ده لغة. كل رمز فيه بيحكي حكاية من جداتنا.',
    image: '/new photos/woman_aswan.png',
    accent: '#d4853a',
    accentDim: 'rgba(212,133,58,0.18)',
    bg: 'linear-gradient(135deg, #1a0c04 0%, #2d1608 50%, #1a0c04 100%)',
    tagColor: '#f5a050',
    mapCx: 129, mapCy: 425,
  },
  {
    key: 'luxor',
    name: 'الأقصر',
    nameEn: 'Luxor',
    elderName: 'حكيم الأقصر',
    elderTitle: 'راوي المعابد الفرعونية',
    quote: 'عنخ — مفتاح الحياة. أجدادنا نقشوه على كل باب ليحمي البيت من الأبد.',
    image: '/new photos/man_auxor.png',
    accent: '#c8a020',
    accentDim: 'rgba(200,160,32,0.18)',
    bg: 'linear-gradient(135deg, #160f00 0%, #2a1e04 50%, #160f00 100%)',
    tagColor: '#e8c040',
    mapCx: 140, mapCy: 320,
  },
  {
    key: 'cairo',
    name: 'القاهرة',
    nameEn: 'Cairo',
    elderName: 'الشيخ محمود',
    elderTitle: 'عالم الأزهر الشريف',
    quote: 'الأرابيسك هو فن إسلامي خالص — خطوط بلا نهاية ترمز لاستمرارية الوجود.',
    image: '/new photos/man_giza.png',
    accent: '#4a9ab8',
    accentDim: 'rgba(74,154,184,0.18)',
    bg: 'linear-gradient(135deg, #030c12 0%, #071828 50%, #030c12 100%)',
    tagColor: '#60c0e0',
    mapCx: 124, mapCy: 112,
  },
  {
    key: 'alexandria',
    name: 'الإسكندرية',
    nameEn: 'Alexandria',
    elderName: 'عم سيد البحري',
    elderTitle: 'ابن البحر المتوسط',
    quote: 'الإسكندرية مدينة بتتنفس من البحر. الإغريق والمصريين كلهم خلوا أثر هنا.',
    image: '/new photos/man_alex.png',
    accent: '#3a90a0',
    accentDim: 'rgba(58,144,160,0.18)',
    bg: 'linear-gradient(135deg, #020c10 0%, #051520 50%, #020c10 100%)',
    tagColor: '#50b0c8',
    mapCx: 95, mapCy: 58,
  },
];

const BARS = Array.from({ length: 36 }, (_, i) => ({ i, h: 10 + Math.random() * 44 }));

/* ─── Living Wall Symbols ──────────────────────────────────────────────────── */
const WALL_SYMBOLS = [
  {
    id: 'ankh',
    symbol: '𓋹',
    name: 'عنخ — مفتاح الحياة',
    description: 'رمز الخلود عند الفراعنة. كان يُحمل كتعويذة حماية، ويُنقش على جدران المعابد ليمنح الملوك حياة أبدية.',
    narrator: 'عم عثمان — أسوان',
    color: '#d4853a',
    top: '22%', left: '25%',
  },
  {
    id: 'eye',
    symbol: '𓂀',
    name: 'عين حورس — عين القمر',
    description: 'رمز الحماية والشفاء. تقول الأسطورة إن حورس فقد عينه في معركة مع ست، فأعادها تحوت كاملة — رمزًا للاكتمال.',
    narrator: 'حكيم الأقصر',
    color: '#c8a020',
    top: '35%', left: '65%',
  },
  {
    id: 'scarab',
    symbol: '𓆣',
    name: 'الجعران — خنفساء الشمس',
    description: 'الجعران المقدس يرمز للبعث والتجدد. كان المصريون يرون فيه صورة الإله خبري الذي يدفع الشمس كل صباح.',
    narrator: 'الشيخ محمود — القاهرة',
    color: '#4a9ab8',
    top: '60%', left: '30%',
  },
  {
    id: 'lotus',
    symbol: '❋',
    name: 'زهرة اللوتس — رمز الخلق',
    description: 'زهرة اللوتس تنبت من الطين وتتفتح في النور — رمز الولادة من العدم. كانت الزهرة المقدسة لمصر العليا.',
    narrator: 'عم سيد البحري — الإسكندرية',
    color: '#3a90a0',
    top: '48%', left: '72%',
  },
];

/* ─── Family Demo ──────────────────────────────────────────────────────────── */
const FAMILY_DEMO = [
  { name: 'تيتا فاطمة', emoji: '👵', relation: 'جدة', dialect: 'دلتاوي', status: 'محفوظ', memories: 847 },
  { name: 'جدو حسن', emoji: '👴', relation: 'جد', dialect: 'صعيدي', status: 'محفوظ', memories: 1203 },
  { name: 'عمو كريم', emoji: '👨', relation: 'عم', dialect: 'قاهري', status: 'جاري التسجيل', memories: 0 },
];

/* ─── Parallax Icons ───────────────────────────────────────────────────────── */
const PARALLAX_ICONS = [
  { symbol: '𓂀', left: '5%', top: '15%', size: '1.4rem', speed: -0.15, opacity: 0.08 },
  { symbol: '𓋹', left: '22%', top: '8%', size: '1.8rem', speed: 0.2, opacity: 0.06 },
  { symbol: '𓆣', left: '45%', top: '20%', size: '1.2rem', speed: -0.1, opacity: 0.07 },
  { symbol: '△', left: '67%', top: '12%', size: '1.1rem', speed: 0.18, opacity: 0.05 },
  { symbol: '𓏏', left: '85%', top: '18%', size: '1.3rem', speed: -0.22, opacity: 0.06 },
  { symbol: '☽', left: '12%', top: '42%', size: '1.6rem', speed: 0.12, opacity: 0.04 },
  { symbol: '✦', left: '78%', top: '35%', size: '1rem', speed: -0.18, opacity: 0.06 },
  { symbol: '◇', left: '35%', top: '55%', size: '1.1rem', speed: 0.25, opacity: 0.05 },
  { symbol: '𓂀', left: '92%', top: '48%', size: '1.5rem', speed: -0.14, opacity: 0.04 },
  { symbol: '𓋹', left: '55%', top: '65%', size: '1.3rem', speed: 0.16, opacity: 0.05 },
  { symbol: '✦', left: '8%', top: '72%', size: '1.2rem', speed: -0.2, opacity: 0.06 },
  { symbol: '△', left: '42%', top: '82%', size: '1rem', speed: 0.13, opacity: 0.04 },
];

/* ─── Hooks ────────────────────────────────────────────────────────────────── */
function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    const fn = () => setY(window.scrollY);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);
  return y;
}

function useReveal(ref) {
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { 
        if (e.isIntersecting) {
          e.target.classList.add('in'); 
        } else {
          e.target.classList.remove('in');
        }
      }),
      { threshold: 0.1 }
    );
    ref.current.querySelectorAll('.rv, .rv-l').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ref]);
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function Landing() {
  const pageRef = useRef(null);
  useReveal(pageRef);
  const scrollY = useScrollY();

  /* region state */
  const [activeIdx, setActiveIdx] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const cycleRef = useRef(null);

  const goTo = useCallback((idx) => {
    clearInterval(cycleRef.current);
    setActiveIdx(idx);
    setAnimKey((k) => k + 1);
    // Restart auto-cycle after manual click
    cycleRef.current = setInterval(() => {
      setActiveIdx((p) => (p + 1) % REGIONS.length);
      setAnimKey((k) => k + 1);
    }, 6000);
  }, []);

  // Auto-cycle characters — kept for animation feel
  useEffect(() => {
    cycleRef.current = setInterval(() => {
      setActiveIdx((p) => (p + 1) % REGIONS.length);
      setAnimKey((k) => k + 1);
    }, 6000);
    return () => clearInterval(cycleRef.current);
  }, []);

  const region = REGIONS[activeIdx];

  /* Living Wall state */
  const [activeSymbol, setActiveSymbol] = useState(null);
  const [wallVisible, setWallVisible] = useState(false);
  const wallRef = useRef(null);

  useEffect(() => {
    if (!wallRef.current) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setWallVisible(true); },
      { threshold: 0.2 }
    );
    io.observe(wallRef.current);
    return () => io.disconnect();
  }, []);

  /* waveform */
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const waveRef = useRef(null);
  const TOTAL = 18;
  const fmt = (s) => `00:${String(s).padStart(2, '0')}`;
  const togglePlay = () => {
    setPlaying((p) => {
      if (!p) {
        waveRef.current = setInterval(() => setElapsed((e) => {
          if (e >= TOTAL - 1) { clearInterval(waveRef.current); setPlaying(false); return 0; }
          return e + 1;
        }), 1000);
      } else {
        clearInterval(waveRef.current);
      }
      return !p;
    });
  };

  return (
    <div ref={pageRef} dir="rtl" style={{ fontFamily: FONT_BODY, background: '#0e0b08', color: '#f0e0c8', overflowX: 'hidden' }}>

      {/* ── CSS ───────────────────────────────────────────────────────────── */}
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        a { text-decoration: none; color: inherit; }
        img { display: block; }

        /* grain */
        .grain {
          position: fixed; inset: -50%; z-index: 999; pointer-events: none; opacity: .04;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          animation: gr .22s steps(2) infinite;
        }
        @keyframes gr {
          0%  { transform: translate(0,0); }
          25% { transform: translate(3%,-2%); }
          50% { transform: translate(-2%,3%); }
          75% { transform: translate(2%,2%); }
          100%{ transform: translate(-3%,-3%); }
        }

        /* scroll reveal horizontal (left/right) */
        .rv, .rv-l { opacity: 0; transition: opacity .85s cubic-bezier(.16,1,.3,1), transform .85s cubic-bezier(.16,1,.3,1); }
        .rv { transform: translateX(60px); }
        .rv-l { transform: translateX(-60px); }
        .rv.in, .rv-l.in { opacity: 1; transform: none; }
        .rv.d1, .rv-l.d1 { transition-delay: .1s; }
        .rv.d2, .rv-l.d2 { transition-delay: .22s; }
        .rv.d3, .rv-l.d3 { transition-delay: .34s; }
        .rv.d4, .rv-l.d4 { transition-delay: .46s; }

        /* slide-up for region content switch */
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .slide-up { animation: slideUp .55s cubic-bezier(.16,1,.3,1) forwards; }

        /* eyebrow */
        .ey { display: inline-flex; align-items: center; gap: 10px; font-size: 11px; font-weight: 800; letter-spacing: .15em; margin-bottom: 14px; font-family: ${FONT_HEADING}; }
        .ey::before { content: ""; width: 28px; height: 1px; background: currentColor; }

        /* quote */
        .qt { margin-top: 20px; padding: 16px 20px; font-size: 16px; line-height: 1.85; border-right: 2px solid currentColor; font-style: italic; border-radius: 0 8px 8px 0; font-family: ${FONT_BODY}; }

        /* buttons */
        .btn { display: inline-flex; align-items: center; gap: 8px; border: 0; padding: 13px 22px; border-radius: 999px; cursor: pointer; font-family: ${FONT_HEADING}; font-size: 14px; font-weight: 700; transition: .25s ease; text-decoration: none; }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(200,152,48,.25); }

        /* nile */
        @keyframes nile { to { stroke-dashoffset: -180; } }

        /* wave */
        @keyframes wvAnim { from { transform: scaleY(.2); } to { transform: scaleY(1); } }

        /* float anim */
        @keyframes floatImg { 0%,100% { transform: translateY(0px) rotate(-.5deg); } 50% { transform: translateY(-14px) rotate(.5deg); } }

        /* scroll pulse */
        @keyframes scrollPulse { 0%,100% { opacity: .2; transform: scaleY(.3); transform-origin: top; } 50% { opacity: .8; transform: scaleY(1); transform-origin: top; } }

        /* ripple */
        @keyframes ripple { 0% { transform: scale(1); opacity: .6; } 100% { transform: scale(3); opacity: 0; } }

        /* hotspot pulse */
        @keyframes hotspotPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(200,152,48,.5); } 50% { box-shadow: 0 0 0 14px rgba(200,152,48,0); } }

        /* unfold */
        @keyframes unfoldCarpet {
          from { opacity: 0; transform: scale(.92) perspective(800px) rotateX(8deg); }
          to   { opacity: 1; transform: scale(1) perspective(800px) rotateX(0deg); }
        }

        /* tree line draw */
        @keyframes drawLine { from { stroke-dashoffset: 200; } to { stroke-dashoffset: 0; } }

        /* grid */
        .g2 { display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: clamp(32px,6vw,80px); padding: 90px clamp(20px,7vw,100px); }
        @media (max-width: 860px) { .g2 { grid-template-columns: 1fr; padding: 70px 20px; } }
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; } .rv { opacity: 1; transform: none; } }

        /* heading font utility */
        .font-heading { font-family: ${FONT_HEADING}; }
      `}</style>

      <div className="grain" />

      {/* ── Parallax Floating Icons (across entire page) ───────────────── */}
      {PARALLAX_ICONS.map((icon, i) => (
        <span key={`picon-${i}`} style={{
          position: 'fixed',
          color: '#c89830',
          opacity: icon.opacity,
          fontSize: icon.size,
          left: icon.left,
          top: icon.top,
          transform: `translateY(${scrollY * icon.speed}px)`,
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 1,
          transition: 'transform 0.1s linear',
        }}>{icon.symbol}</span>
      ))}

      {/* ══════════════════════════════════════════════════════════════════
          HERO — فاتح background
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ position: 'relative', minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#0e0b08' }}>

        {/* Background — more visible, "فاتح" */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '100%',
          backgroundImage: 'url(/image/background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
          backgroundRepeat: 'no-repeat',
          opacity: .92,
          filter: 'sepia(.12) brightness(.62) contrast(.95) saturate(.9)',
          transform: `translateY(${scrollY * 0.2}px)`,
        }} />

        {/* Gentle vignette — NOT hiding the photo */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(14,11,8,.25) 0%, rgba(14,11,8,.1) 35%, rgba(14,11,8,.35) 70%, #0e0b08 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 40%, rgba(200,152,48,.08) 0%, transparent 60%)' }} />

        {/* Ship floating */}
        <img src="/image/ship.png" alt="" style={{
          position: 'absolute', right: '5%', bottom: '14%',
          width: 'clamp(130px,14vw,220px)',
          opacity: .85, filter: 'sepia(.2) brightness(.6) contrast(.9) saturate(.85)',
          animation: 'floatImg 8s ease-in-out infinite',
          pointerEvents: 'none',
          transform: `translateY(${scrollY * -0.1}px)`,
        }} />

        {/* Hero text */}
        <div className="rv in" style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 20px', paddingTop: 70 }}>
          <div className="ey" style={{ justifyContent: 'center', color: '#c89830', marginBottom: 18 }}>
            مصر كما يرويها أهلها
          </div>
          <h1 style={{
            fontSize: 'clamp(5rem,18vw,12rem)', fontWeight: 900, lineHeight: .88,
            letterSpacing: '-.04em', color: '#fff8ee',
            textShadow: '0 0 120px rgba(200,152,48,.35), 0 4px 30px rgba(0,0,0,.8)',
            fontFamily: FONT_HEADING,
          }}>
            حكاوي
          </h1>
          <p style={{ color: 'rgba(255,230,180,.8)', fontSize: 'clamp(15px,1.5vw,19px)', marginTop: 16, fontFamily: FONT_BODY }}>
            صوت الماضي، حيّ في الحاضر
          </p>
          <p style={{ color: 'rgba(200,152,48,.35)', fontSize: 11, marginTop: 6, letterSpacing: '.2em' }}>
            The voice of the past · alive in the present
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 40 }}>
            <Link to="/map" className="btn" style={{ background: '#c89830', color: '#0e0b08', boxShadow: '0 10px 32px rgba(200,152,48,.3)' }}>
              استكشف الخريطة <ArrowLeft size={15} />
            </Link>
            <Link to="/family" className="btn" style={{ background: 'transparent', border: '1px solid rgba(240,210,160,.25)', color: '#f0ddb8' }}>
              <Mic size={14} /> سجّل صوت عيلتك
            </Link>
          </div>
        </div>

        {/* Scroll hint */}
        <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', color: 'rgba(200,152,48,.4)', fontSize: 10, letterSpacing: '.18em', zIndex: 2, fontFamily: FONT_BODY }}>
          <ChevronDown size={20} style={{ animation: 'scrollPulse 1.8s ease-in-out infinite', display: 'block', margin: '0 auto' }} />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 1 — الشخصيات + الخريطة الكبيرة
      ══════════════════════════════════════════════════════════════════ */}
      <section id="chars" style={{
        position: 'relative', overflow: 'hidden',
        minHeight: '100svh', display: 'flex', alignItems: 'center',
        background: region.bg,
        transition: 'background .8s ease',
        borderTop: '1px solid rgba(255,220,140,.06)',
      }}>

        {/* Temple illustration */}
        <img src="/image/mamar.png" alt="" style={{
          position: 'absolute', left: 0, bottom: 0,
          width: 'clamp(200px,32vw,500px)',
          opacity: .85, filter: 'sepia(.2) brightness(.5) contrast(.9) saturate(.8)',
          transform: `translateY(${(scrollY - 700) * -0.08}px)`,
          pointerEvents: 'none',
        }} />

        {/* Accent glow */}
        <div style={{
          position: 'absolute', top: '20%', right: '5%',
          width: '40%', height: '60%',
          background: `radial-gradient(ellipse, ${region.accentDim} 0%, transparent 70%)`,
          transition: 'background .8s ease',
          pointerEvents: 'none',
        }} />

        <div style={{ width: '100%', position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: '1.1fr 1fr', alignItems: 'center', gap: 'clamp(20px,4vw,40px)', padding: '70px clamp(20px,5vw,80px)' }}>

          {/* ── LEFT: Big Map ─────────────────────────────────────── */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div className="rv" style={{ position: 'relative', width: '100%', maxWidth: 320, maxHeight: '60vh', display: 'flex', justifyContent: 'center' }}>
              <svg viewBox="0 0 260 500" style={{ width: '100%', maxHeight: '100%', filter: 'drop-shadow(0 12px 30px rgba(0,0,0,.6))' }}>
                {/* Egypt shape */}
                <path d="M88 17L162 35L166 112L184 145L169 199L203 269L177 335L148 409L136 481L103 466L85 390L70 315L76 239L62 177L79 111L73 58Z"
                  fill="rgba(14,11,8,.85)" stroke="rgba(200,152,48,.35)" strokeWidth="1.8" />
                {/* Nile */}
                <path d="M124 49C151 96 101 126 134 171C166 215 112 257 144 301C169 336 118 379 128 447"
                  fill="none" stroke="rgba(90,160,190,.55)" strokeWidth="2.5" strokeLinecap="round"
                  strokeDasharray="5 9" style={{ animation: 'nile 6s linear infinite' }} />
                {/* Region dots with labels */}
                {REGIONS.map((r, i) => {
                  const isActive = region.key === r.key;
                  return (
                    <g key={r.key}
                      style={{ cursor: 'pointer' }}
                      onClick={() => goTo(i)}>
                      {/* Ripple ring for active */}
                      {isActive && (
                        <circle cx={r.mapCx} cy={r.mapCy} r={7}
                          fill="none" stroke={r.accent} strokeWidth="2"
                          opacity=".6"
                          style={{ animation: 'ripple 1.5s ease-out infinite', transformOrigin: `${r.mapCx}px ${r.mapCy}px` }} />
                      )}
                      {/* Main dot */}
                      <circle cx={r.mapCx} cy={r.mapCy} r={isActive ? 9 : 6}
                        fill={isActive ? r.accent : 'rgba(200,152,48,.25)'}
                        stroke={isActive ? '#fff' : 'rgba(200,152,48,.5)'}
                        strokeWidth={isActive ? 2.5 : 1.5}
                        style={{ transition: 'all .35s ease' }} />
                      {/* Region name label */}
                      <text x={r.mapCx + (r.mapCx > 130 ? 18 : -18)} y={r.mapCy + 4}
                        textAnchor={r.mapCx > 130 ? 'start' : 'end'}
                        fill={isActive ? r.tagColor : 'rgba(200,152,48,.45)'}
                        fontSize={isActive ? 11 : 9}
                        fontWeight={isActive ? 700 : 400}
                        fontFamily="'Noto Kufi Arabic', sans-serif"
                        style={{ transition: 'all .35s ease' }}>
                        {r.name.split(' ')[0]}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            {/* Map interaction hint */}
            <div className="rv d1" style={{
              display: 'flex', alignItems: 'center', gap: 8,
              color: 'rgba(200,152,48,.55)', fontSize: 11, fontFamily: FONT_BODY,
              background: 'rgba(200,152,48,.06)', padding: '6px 14px', borderRadius: 999,
              border: '1px solid rgba(200,152,48,.12)',
            }}>
              <MousePointer size={14} style={{ animation: 'floatImg 3s ease-in-out infinite' }} />
              اضغط على أي منطقة لاستكشاف شخصيتها
            </div>
          </div>

          {/* ── RIGHT: Character Card ────────────────────────────── */}
          <div>
            <div className="rv-l ey" style={{ color: region.tagColor }}>01 — شخصيات من كل ركن</div>

            {/* Photo + name */}
            <div key={`photo-${animKey}`} className="slide-up" style={{
              position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 12,
            }}>
              {/* Glow */}
              <div style={{
                position: 'absolute', top: '10%', left: '10%', right: '10%', bottom: '10%',
                background: `radial-gradient(ellipse, ${region.accentDim} 0%, transparent 70%)`,
                filter: 'blur(30px)', pointerEvents: 'none',
              }} />
              <img
                src={region.image}
                alt={region.elderName}
                style={{
                  width: 'clamp(180px,20vw,240px)',
                  aspectRatio: '3/4',
                  objectFit: 'cover',
                  objectPosition: 'center top',
                  borderRadius: 22,
                  border: `2px solid ${region.accent}60`,
                  boxShadow: `0 0 80px ${region.accentDim}, 0 16px 40px rgba(0,0,0,.6)`,
                  position: 'relative',
                  zIndex: 1,
                }}
              />
              {/* Name tag */}
              <div style={{
                position: 'relative', marginTop: -14, zIndex: 2,
                whiteSpace: 'nowrap',
                background: 'rgba(14,11,8,.92)', backdropFilter: 'blur(12px)',
                border: `1px solid ${region.accent}50`, borderRadius: 999,
                padding: '6px 16px', fontSize: 12, color: region.tagColor, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: FONT_HEADING,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: region.accent, display: 'inline-block', animation: 'scrollPulse 2s ease-in-out infinite' }} />
                {region.elderName} — {region.elderTitle}
              </div>
            </div>

            {/* Region name + quote */}
            <div key={`name-${animKey}`} className="slide-up">
              <h2 style={{
                fontSize: 'clamp(28px,3.5vw,48px)', fontWeight: 900, lineHeight: 1.05,
                color: region.tagColor,
                textShadow: `0 0 60px ${region.accentDim}`,
                fontFamily: FONT_HEADING,
              }}>{region.name}</h2>
              <p style={{ color: 'rgba(255,230,180,.55)', fontSize: 11, marginTop: 2, fontFamily: FONT_BODY }}>{region.nameEn}</p>
            </div>

            <div key={`quote-${animKey}`} className="slide-up" style={{ animationDelay: '.08s' }}>
              <blockquote className="qt" style={{ color: 'rgba(255,235,200,.9)', borderColor: region.tagColor, background: `linear-gradient(90deg, ${region.accentDim}, transparent)`, marginTop: 12, padding: '12px 16px', fontSize: 14 }}>
                "{region.quote}"
              </blockquote>
            </div>

            {/* Region tabs */}
            <div className="rv-l d2" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 16 }}>
              {REGIONS.map((r, i) => (
                <button key={r.key} onClick={() => goTo(i)} style={{
                  padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', border: 'none', fontFamily: FONT_HEADING, transition: '.25s ease',
                  background: activeIdx === i ? r.tagColor : 'rgba(255,255,255,.08)',
                  color: activeIdx === i ? '#0e0b08' : 'rgba(255,225,170,.65)',
                  boxShadow: activeIdx === i ? `0 0 24px ${r.accentDim}` : 'none',
                  transform: activeIdx === i ? 'scale(1.05)' : 'scale(1)',
                }}>{r.name.split(' ')[0]}</button>
              ))}
            </div>

            <div className="rv-l d3" style={{ marginTop: 20 }}>
              <Link to="/map" className="btn" style={{ background: region.tagColor, color: '#0e0b08', boxShadow: `0 8px 28px ${region.accentDim}`, padding: '10px 18px', fontSize: 13 }}>
                تحدث مع الشخصية <ArrowLeft size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* Responsive override */}
        <style>{`
          @media (max-width: 900px) {
            #chars > div:last-of-type { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 2 — شجرة العيلة (Family Tree Preview)
      ══════════════════════════════════════════════════════════════════ */}
      <section id="family-tree" style={{
        position: 'relative', overflow: 'hidden',
        minHeight: '100svh', display: 'flex', alignItems: 'center',
        background: 'linear-gradient(135deg, #0e0608 0%, #180a0a 50%, #0e0608 100%)',
        borderTop: '1px solid rgba(255,220,140,.06)',
      }}>

        {/* Hieroglyphic stone */}
        <img src="/image/noqush.png" alt="" style={{
          position: 'absolute', right: '-4%', top: '8%',
          width: 'clamp(220px,32vw,480px)',
          opacity: .8, filter: 'sepia(.2) brightness(.5) contrast(.9) saturate(.8)',
          transform: `translateY(${(scrollY - 1500) * -0.07}px)`,
          pointerEvents: 'none',
          animation: 'floatImg 11s ease-in-out infinite',
        }} />

        <div className="g2" style={{ width: '100%', position: 'relative', zIndex: 2 }}>

          {/* Visual — Family Tree Nodes */}
          <div style={{ position: 'relative', minHeight: 460, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            {/* Tree visualization */}
            <div className="rv" style={{ position: 'relative', width: 'min(100%, 420px)' }}>
              {/* Connection lines SVG */}
              <svg viewBox="0 0 420 300" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
                {/* Top line connecting first two */}
                <line x1="110" y1="100" x2="210" y2="100" stroke="rgba(224,96,80,.3)" strokeWidth="2" strokeDasharray="6 4"
                  style={{ animation: 'drawLine 2s ease-out forwards' }} />
                <line x1="210" y1="100" x2="310" y2="100" stroke="rgba(224,96,80,.3)" strokeWidth="2" strokeDasharray="6 4"
                  style={{ animation: 'drawLine 2s ease-out .3s forwards' }} />
                {/* Vertical connectors */}
                <line x1="210" y1="100" x2="210" y2="200" stroke="rgba(224,96,80,.2)" strokeWidth="2" strokeDasharray="6 4"
                  style={{ animation: 'drawLine 2s ease-out .6s forwards' }} />
              </svg>

              {/* Member cards */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(16px,4vw,40px)', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
                {FAMILY_DEMO.map((m, i) => (
                  <div key={i} className="rv" style={{
                    transitionDelay: `${i * 0.15}s`,
                    background: 'rgba(14,11,8,.9)',
                    border: `1px solid ${m.status === 'محفوظ' ? 'rgba(80,200,120,.3)' : 'rgba(224,96,80,.3)'}`,
                    borderRadius: 18,
                    padding: '20px 18px',
                    textAlign: 'center',
                    width: 'clamp(110px,14vw,130px)',
                    backdropFilter: 'blur(12px)',
                    transition: 'transform .3s ease, box-shadow .3s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,.5)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <div style={{ fontSize: 40, marginBottom: 8 }}>{m.emoji}</div>
                    <p style={{ fontWeight: 700, fontSize: 14, color: '#f0e0c8', fontFamily: FONT_HEADING, marginBottom: 2 }}>{m.name}</p>
                    <p style={{ fontSize: 11, color: 'rgba(240,224,200,.5)', marginBottom: 8 }}>{m.relation} · {m.dialect}</p>
                    <span style={{
                      display: 'inline-block',
                      fontSize: 10, fontWeight: 600,
                      padding: '3px 10px', borderRadius: 999,
                      background: m.status === 'محفوظ' ? 'rgba(80,200,120,.15)' : 'rgba(224,96,80,.15)',
                      color: m.status === 'محفوظ' ? '#60c880' : '#e06050',
                      border: `1px solid ${m.status === 'محفوظ' ? 'rgba(80,200,120,.3)' : 'rgba(224,96,80,.3)'}`,
                    }}>
                      {m.status === 'محفوظ' ? `✅ ${m.memories} ذكرى` : '🔄 جاري التسجيل'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Audio panel */}
            <div className="rv d1" style={{
              width: 'min(85%,360px)', padding: '14px 16px',
              border: '1px solid rgba(200,100,80,.2)', borderRadius: 16,
              background: 'rgba(10,6,6,.94)', backdropFilter: 'blur(20px)',
              boxShadow: '0 20px 50px rgba(0,0,0,.6)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={togglePlay} style={{
                  width: 44, height: 44, borderRadius: '50%', border: 0,
                  background: '#c89830', color: '#0e0b08', fontWeight: 900,
                  cursor: 'pointer', fontSize: 14, flexShrink: 0,
                }}>{playing ? '❚❚' : '▶'}</button>
                <div style={{ flex: 1, height: 50, display: 'flex', alignItems: 'center', gap: 2.5, overflow: 'hidden' }}>
                  {BARS.map(({ i, h }) => (
                    <div key={i} style={{
                      width: 3.5, minHeight: 5, borderRadius: 5, height: h,
                      background: 'linear-gradient(#c89830, rgba(200,152,48,.15))',
                      transformOrigin: 'center',
                      transform: playing ? 'scaleY(1)' : 'scaleY(.28)',
                      transition: 'transform .3s ease',
                      animation: playing ? `wvAnim ${.45 + (i % 7) * .1}s ease-in-out ${-i * .04}s infinite alternate` : 'none',
                    }} />
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 9, display: 'flex', justifyContent: 'space-between', color: 'rgba(200,152,48,.5)', fontSize: 11, fontFamily: FONT_BODY }}>
                <span>صوت من ذاكرة الأسرة</span>
                <span>{fmt(elapsed)} / {fmt(TOTAL)}</span>
              </div>
            </div>
          </div>

          {/* Copy */}
          <div>
            <div className="rv-l ey" style={{ color: '#e06050' }}>02 — شجرة العيلة</div>
            <h2 className="rv-l d1 font-heading" style={{ fontSize: 'clamp(36px,5vw,68px)', fontWeight: 900, lineHeight: 1.04, color: '#fff8ee', fontFamily: FONT_HEADING }}>
              أصوات لا تنتهي<br />
              <span style={{ color: '#e05050' }}>ذكريات تعيش.</span>
            </h2>
            <p className="rv-l d2" style={{ color: 'rgba(255,225,190,.75)', fontSize: 'clamp(14px,1.2vw,17px)', lineHeight: 1.9, marginTop: 18, fontFamily: FONT_BODY }}>
              نسجّل صوت شخص عزيز، ثم نحفظ نبرته ولهجته داخل تجربة تسمح للعائلة أن تسمع حكاياته مرة أخرى — في الأعياد، في المناسبات، وفي كل لحظة تشتاق فيها لصوته.
            </p>
            <div className="rv-l d2 qt" style={{ color: 'rgba(255,230,200,.9)', borderColor: '#e06050', background: 'linear-gradient(90deg, rgba(224,96,80,.12), transparent)' }}>
              "سجّل صوت جدك قبل ما يختفي للأبد."
            </div>
            <div className="rv-l d3" style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 9 }}>
              {['سجّل صوت أي شخص بأي لهجة', 'الـ AI يحفظ نبرته وشخصيته', 'يتكلم مع عيلتك في المناسبات'].map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'rgba(255,220,180,.7)', fontSize: 13, fontFamily: FONT_BODY }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#e06050', flexShrink: 0 }} />
                  {t}
                </div>
              ))}
            </div>
            <div className="rv-l d3" style={{ marginTop: 26, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link to="/family" className="btn" style={{ background: '#e06050', color: '#fff', boxShadow: '0 8px 28px rgba(224,96,80,.35)' }}>
                <Mic size={14} /> ابدأ التسجيل
              </Link>
              <Link to="/family" className="btn" style={{ background: 'transparent', border: '1px solid rgba(224,96,80,.25)', color: '#e06050' }}>
                <Users size={14} /> شاهد الشجرة
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 3 — الجدار الحي (Living Wall) — Interactive Heritage Tapestry
      ══════════════════════════════════════════════════════════════════ */}
      <section id="living-wall" ref={wallRef} style={{
        position: 'relative', overflow: 'hidden',
        minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '60px clamp(20px,4vw,60px)',
        background: 'linear-gradient(135deg, #100a04 0%, #1c1208 50%, #100a04 100%)',
        borderTop: '1px solid rgba(255,220,140,.06)',
      }}>

        {/* Section header */}
        <div className="rv" style={{ textAlign: 'center', marginBottom: 20, maxWidth: 700 }}>
          <div className="ey" style={{ justifyContent: 'center', color: '#c89830' }}>03 — الجدار الحي</div>
          <h2 className="font-heading" style={{ fontSize: 'clamp(32px,5vw,60px)', fontWeight: 900, lineHeight: 1.08, color: '#fff8ee', fontFamily: FONT_HEADING }}>
            كل رمز يحكي <span style={{ color: '#c89830' }}>حكاية</span>
          </h2>
          <p style={{ color: 'rgba(255,225,180,.65)', fontSize: 'clamp(13px,1.2vw,16px)', lineHeight: 1.8, marginTop: 14, fontFamily: FONT_BODY }}>
            الجدار الحي — اضغط على أي رمز متوهج لتكتشف قصته المخبأة في نسيج التراث المصري
          </p>
        </div>

        {/* Carpet / Tapestry interactive area */}
        <div className="rv d1" style={{
          position: 'relative',
          width: 'min(90vw, 700px)',
          aspectRatio: '2',
          borderRadius: 22,
          overflow: 'hidden',
          border: '2px solid rgba(200,152,48,.2)',
          boxShadow: '0 30px 80px rgba(0,0,0,.7), 0 0 120px rgba(200,152,48,.08)',
          animation: wallVisible ? 'unfoldCarpet 1.2s cubic-bezier(.16,1,.3,1) forwards' : 'none',
          opacity: wallVisible ? 1 : 0,
        }}>
          {/* Carpet background gradient (representing the tapestry) */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(145deg, #2a1a0a, #1a0e04 30%, #2a1806 60%, #1c0e04)',
          }} />
          {/* Geometric pattern overlay */}
          <div style={{
            position: 'absolute', inset: 0, opacity: .15,
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(200,152,48,.3) 40px, rgba(200,152,48,.3) 41px),
              repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(200,152,48,.3) 40px, rgba(200,152,48,.3) 41px),
              repeating-linear-gradient(45deg, transparent, transparent 56px, rgba(200,120,60,.2) 56px, rgba(200,120,60,.2) 57px),
              repeating-linear-gradient(-45deg, transparent, transparent 56px, rgba(200,120,60,.2) 56px, rgba(200,120,60,.2) 57px)
            `,
          }} />
          {/* Diamond pattern center */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            width: '60%', height: '60%',
            border: '2px solid rgba(200,152,48,.15)',
            borderRadius: 8,
            transform: 'translate(-50%,-50%) rotate(45deg)',
          }} />

          {/* Glowing hotspots */}
          {WALL_SYMBOLS.map((ws) => (
            <button
              key={ws.id}
              onClick={() => setActiveSymbol(activeSymbol?.id === ws.id ? null : ws)}
              style={{
                position: 'absolute',
                top: ws.top,
                left: ws.left,
                width: 48, height: 48,
                borderRadius: '50%',
                border: `2px solid ${activeSymbol?.id === ws.id ? ws.color : 'rgba(200,152,48,.4)'}`,
                background: activeSymbol?.id === ws.id ? `${ws.color}30` : 'rgba(200,152,48,.08)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                color: activeSymbol?.id === ws.id ? ws.color : '#c89830',
                animation: activeSymbol?.id === ws.id ? 'none' : 'hotspotPulse 2.5s ease-in-out infinite',
                animationDelay: `${WALL_SYMBOLS.indexOf(ws) * 0.5}s`,
                transition: 'all .35s ease',
                transform: activeSymbol?.id === ws.id ? 'scale(1.2)' : 'scale(1)',
                zIndex: 3,
              }}
            >
              {ws.symbol}
            </button>
          ))}
        </div>

        {/* Symbol info card — appears on click */}
        <div style={{
          marginTop: 16,
          width: 'min(90vw, 600px)',
          minHeight: 80,
          transition: 'all .5s cubic-bezier(.16,1,.3,1)',
          opacity: activeSymbol ? 1 : 0,
          transform: activeSymbol ? 'translateY(0)' : 'translateY(20px)',
        }}>
          {activeSymbol && (
            <div key={activeSymbol.id} className="slide-up" style={{
              background: 'rgba(14,11,8,.92)',
              backdropFilter: 'blur(20px)',
              border: `1px solid ${activeSymbol.color}40`,
              borderRadius: 18,
              padding: '16px 20px',
              display: 'flex',
              gap: 16,
              alignItems: 'flex-start',
            }}>
              <div style={{
                width: 50, height: 50, borderRadius: 12,
                background: `${activeSymbol.color}18`,
                border: `1px solid ${activeSymbol.color}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, flexShrink: 0,
                color: activeSymbol.color,
              }}>
                {activeSymbol.symbol}
              </div>
              <div>
                <h3 style={{ fontFamily: FONT_HEADING, fontWeight: 800, fontSize: 16, color: activeSymbol.color, marginBottom: 4 }}>
                  {activeSymbol.name}
                </h3>
                <p style={{ fontFamily: FONT_BODY, fontSize: 13, lineHeight: 1.7, color: 'rgba(255,230,200,.8)', marginBottom: 8 }}>
                  {activeSymbol.description}
                </p>
                <span style={{ fontSize: 11, color: 'rgba(200,152,48,.5)', fontFamily: FONT_BODY }}>
                  الراوي: {activeSymbol.narrator}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 3-step flow */}
        <div className="rv-l d2" style={{ display: 'flex', gap: 'clamp(16px,4vw,40px)', justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
          {[
            { icon: <Sparkles size={18} />, text: 'اختار رمز' },
            { icon: '→', text: 'اكتشف حكايته' },
            { icon: <Heart size={18} />, text: 'اسمع الراوي' },
          ].map((step, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              color: 'rgba(200,152,48,.6)', fontSize: 13, fontFamily: FONT_BODY,
            }}>
              <span style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(200,152,48,.08)', border: '1px solid rgba(200,152,48,.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, color: '#c89830',
              }}>{typeof step.icon === 'string' ? step.icon : step.icon}</span>
              {step.text}
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 4 — التعليم
      ══════════════════════════════════════════════════════════════════ */}
      <section id="kids" style={{
        position: 'relative', overflow: 'hidden',
        minHeight: '80svh', display: 'flex', alignItems: 'center',
        background: 'linear-gradient(135deg, #060a10 0%, #0a1220 50%, #060a10 100%)',
        borderTop: '1px solid rgba(255,220,140,.06)',
      }}>
        {/* Ramz scroll */}
        <img src="/image/ramz.png" alt="" style={{
          position: 'absolute', left: '2%', bottom: '6%',
          width: 'clamp(150px,20vw,300px)',
          opacity: .85, filter: 'sepia(.2) brightness(.5) contrast(.9) saturate(.8)',
          transform: `translateY(${(scrollY - 3400) * -0.06}px)`,
          pointerEvents: 'none',
          animation: 'floatImg 10s ease-in-out 1.5s infinite',
        }} />

        <div style={{ width: '100%', maxWidth: 940, margin: '0 auto', padding: '88px clamp(20px,6vw,80px)', textAlign: 'center', position: 'relative', zIndex: 2 }}>
          <div className="rv-l ey" style={{ justifyContent: 'center', color: '#50b8e0' }}>04 — التعليم والأطفال</div>
          <h2 className="rv-l d1 font-heading" style={{ fontSize: 'clamp(36px,5vw,68px)', fontWeight: 900, letterSpacing: '-.03em', lineHeight: 1.04, color: '#fff8ee', fontFamily: FONT_HEADING }}>
            التاريخ يتحول إلى <span style={{ color: '#50b8e0' }}>مغامرة.</span>
          </h2>
          <p className="rv d2" style={{ color: 'rgba(255,225,190,.72)', fontSize: 'clamp(14px,1.2vw,17px)', lineHeight: 1.9, maxWidth: 560, margin: '16px auto 28px', fontFamily: FONT_BODY }}>
            الطفل لا يشاهد معلومة فقط؛ يختار طريقًا، يفتح بوابة، يقابل شخصية، ويكتشف تراث كل منطقة بطريقة تفاعلية.
          </p>
          <div className="rv-l d2" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 28 }}>
            {['قصص الأقصر', 'رموز النوبة', 'الأبجدية الهيروغليفية', 'أساطير الإسكندرية', 'حكايات القاهرة'].map(tag => (
              <span key={tag} style={{ padding: '7px 15px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: 'rgba(80,184,224,.1)', border: '1px solid rgba(80,184,224,.3)', color: '#70c8ee', fontFamily: FONT_HEADING }}>{tag}</span>
            ))}
          </div>
          <div className="rv-l d3">
            <Link to="/map" className="btn" style={{ background: '#2a6080', color: '#f0e8d8', boxShadow: '0 8px 28px rgba(42,96,128,.35)' }}>
              استكشف الآن
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════════ */}
      <footer style={{
        position: 'relative', minHeight: '60svh', display: 'grid', placeItems: 'center',
        padding: '80px 22px', textAlign: 'center',
        borderTop: '1px solid rgba(255,220,140,.06)',
        background: 'linear-gradient(to bottom, #0a0806, #0e0b08)',
        overflow: 'hidden',
      }}>
        {/* Ghost title */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 'min(32vw,440px)', fontWeight: 900, color: 'rgba(200,152,48,.04)',
          letterSpacing: '-.06em', userSelect: 'none', pointerEvents: 'none', whiteSpace: 'nowrap',
          fontFamily: FONT_HEADING,
        }}>حكاوي</div>

        {/* Ship footer */}
        <img src="/image/ship.png" alt="" style={{
          position: 'absolute', left: '3%', bottom: '6%',
          width: 'clamp(100px,13vw,190px)',
          opacity: .8, filter: 'sepia(.3) brightness(.5) contrast(.9) saturate(.8)',
          pointerEvents: 'none',
          animation: 'floatImg 7s ease-in-out infinite',
        }} />

        <div className="rv-l" style={{ position: 'relative', zIndex: 2, maxWidth: 700 }}>
          <div className="ey" style={{ justifyContent: 'center', color: '#c89830' }}>جاهز تبدأ؟</div>
          <h2 className="font-heading" style={{ fontSize: 'clamp(44px,7.5vw,98px)', fontWeight: 900, letterSpacing: '-.04em', lineHeight: .9, marginBottom: 18, color: '#fff8ee', fontFamily: FONT_HEADING }}>
            ابدأ رحلتك.
          </h2>
          <p style={{ color: 'rgba(255,225,185,.7)', fontSize: 16, marginBottom: 30, lineHeight: 1.75, fontFamily: FONT_BODY }}>
            اختر مكانًا على الخريطة، ودع أول حكاية تقودك إلى الباقي.
          </p>
          <Link to="/map" className="btn" style={{ fontSize: 16, padding: '14px 30px', background: '#c89830', color: '#0e0b08', boxShadow: '0 10px 36px rgba(200,152,48,.28)' }}>
            ادخل إلى حكاوي <ArrowLeft size={15} />
          </Link>
          <p style={{ color: 'rgba(200,152,48,.15)', fontSize: 11, marginTop: 44, letterSpacing: '.1em' }}>
            Cairo University · AI Nexus Hackathon 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
