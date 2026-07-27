import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
    elderName: 'الجدة حليمة',
    elderTitle: 'حارسة التراث النوبي',
    quote: 'الكليم مش بس نسيج، ده لغة. كل رمز فيه بيحكي حكاية من جداتنا.',
    image: '/new photos/new_aswan.png',
    bgImage: '/new photos/aswan_background.png',
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
    bgImage: '/new photos/auxor_background.png',
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
    image: '/new photos/cairo_man_new.png',
    bgImage: '/new photos/cairo_background.png',
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
    elderName: 'كليوباترا',
    elderTitle: 'ملكة مصر الأسطورية',
    quote: 'الإسكندرية لم تكن مجرد مدينة، بل كانت منارة العالم القديم وملتقى كل الثقافات.',
    image: '/new photos/alex_man_new.png',
    bgImage: '/new photos/alex_background.png',
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
    id: 'nubian-baskets',
    name: 'السلال النوبية',
    description:
      'كانت هذه السلال تُنسج يدويًا من سعف النخيل، وتُستخدم لحفظ الخبز والتمر والمحاصيل. ومع مرور الزمن أصبحت رمزًا للحياة اليومية في النوبة وللمهارة التي انتقلت بين الأجيال.',
    narrator: 'حكاية من أسوان والنوبة',
    color: '#d6a62a',
    top: '66%',
    left: '12%',
  },
  {
    id: 'nubian-tray',
    name: 'الطبق النوبي',
    description:
      'يحمل كل طبق زخارف هندسية مستوحاة من النيل والبيئة المحيطة. لم يكن مجرد أداة منزلية، بل قطعة فنية تزيّن البيوت وترافق المناسبات.',
    narrator: 'حكاية من أسوان والنوبة',
    color: '#d6a62a',
    top: '61%',
    left: '32%',
  },
  {
    id: 'clay-jar',
    name: 'الجرة الفخارية',
    description:
      'كانت الجرار تحفظ الماء باردًا حتى في أشد أيام الصيف حرارة. صُنعت من طين النيل وأصبحت جزءًا من تفاصيل الحياة اليومية في صعيد مصر.',
    narrator: 'حكاية من جنوب مصر',
    color: '#d6a62a',
    top: '54%',
    left: '43%',
  },
  {
    id: 'hand-loom',
    name: 'النول اليدوي',
    description:
      'على هذا النول كانت تُنسج المفروشات والسجاد خيطًا بعد خيط. تعلّمت الأجيال هذه الحرفة داخل البيوت، فصار النول رمزًا لاستمرار التراث.',
    narrator: 'حكاية من صُنّاع النسيج',
    color: '#d6a62a',
    top: '56%',
    left: '51%',
  },
  {
    id: 'woven-textile',
    name: 'قطعة نسيج يدوية',
    description:
      'كل لون ونقشة يحملان دلالة خاصة ترتبط بالمكان والمناسبة. لذلك لا توجد قطعتان متطابقتان تمامًا، فلكل واحدة بصمتها الخاصة.',
    narrator: 'حكاية من ذاكرة البيت',
    color: '#d6a62a',
    top: '81%',
    left: '74%',
  },
  {
    id: 'luxor-carpet',
    name: 'سجادة الأقصر',
    description:
      'استُلهمت زخارفها من المعابد وأعمدة الكرنك والطبيعة المحيطة بالنيل. كانت تُهدى في المناسبات وتبقى مع العائلة سنوات طويلة.',
    narrator: 'حكاية من الأقصر',
    color: '#d6a62a',
    top: '42%',
    left: '90%',
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
  const navigate = useNavigate();

  /* region state */
  const [activeIdx, setActiveIdx] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const cycleRef = useRef(null);

  /* zoom-transition state */
  const [zoomActive, setZoomActive] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: '50%', y: '50%' });
  const [zoomColor, setZoomColor] = useState('#c89830');

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

  /* Navigate with a zoom-burst from the clicked marker position */
  const navigateWithZoom = useCallback((regionKey, svgEl, svgCx, svgCy) => {
    // Convert SVG coords → screen %
    if (svgEl) {
      const rect = svgEl.getBoundingClientRect();
      const scaleX = rect.width / 1000;
      const scaleY = rect.height / 1000;
      const screenX = rect.left + svgCx * scaleX;
      const screenY = rect.top + svgCy * scaleY;
      setZoomOrigin({ x: `${screenX}px`, y: `${screenY}px` });
    }
    const r = REGIONS.find(r => r.key === regionKey);
    setZoomColor(r?.accent || '#c89830');
    setZoomActive(true);
    setTimeout(() => navigate('/map'), 550);
  }, [navigate]);

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

        /* zoom portal burst */
        @keyframes zoomBurst {
          0%   { transform: scale(0); opacity: 1; }
          100% { transform: scale(40); opacity: 1; }
        }
        .zoom-portal {
          position: fixed;
          border-radius: 50%;
          z-index: 9999;
          pointer-events: none;
          width: 80px;
          height: 80px;
          margin-left: -40px;
          margin-top: -40px;
          animation: zoomBurst 0.65s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

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

      {/* Zoom portal overlay */}
      {zoomActive && (
        <div
          className="zoom-portal"
          style={{
            left: zoomOrigin.x,
            top: zoomOrigin.y,
            background: `radial-gradient(circle, ${zoomColor} 0%, ${zoomColor}cc 40%, ${zoomColor}44 70%, transparent 100%)`,
          }}
        />
      )}

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
        backgroundColor: '#0e0b08',
        borderTop: '1px solid rgba(255,220,140,.06)',
      }}>

        {/* Dynamic Background Images */}
        {REGIONS.map((r, i) => (
          <div key={`bgimg-${r.key}`} style={{
            position: 'absolute', inset: 0, zIndex: 0,
            backgroundImage: r.bgImage ? `url("${r.bgImage}")` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: activeIdx === i && r.bgImage ? 0.85 : 0,
            filter: 'sepia(0.3) saturate(1.2) contrast(1.1)',
            transition: 'opacity 1s cubic-bezier(.16,1,.3,1), transform 1s cubic-bezier(.16,1,.3,1)',
            transform: activeIdx === i ? 'translateX(0) scale(1.02)' : 'translateX(80px) scale(1)',
          }} />
        ))}

        {/* Unified Hakawi Overlay */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'linear-gradient(135deg, rgba(14,11,8,0.95) 0%, rgba(26,14,4,0.4) 50%, rgba(14,11,8,0.95) 100%)',
          pointerEvents: 'none',
        }} />

        {/* Accent glow */}
        <div style={{
          position: 'absolute', top: '20%', right: '5%', zIndex: 2,
          width: '40%', height: '60%',
          background: `radial-gradient(ellipse, ${region.accentDim} 0%, transparent 70%)`,
          transition: 'background .8s ease',
          pointerEvents: 'none',
        }} />

        <div style={{ width: '100%', position: 'relative', zIndex: 3, display: 'grid', gridTemplateColumns: '1.1fr 1fr', alignItems: 'center', gap: 'clamp(20px,4vw,40px)', padding: '70px clamp(20px,5vw,80px)' }}>

          {/* ── LEFT: Big Map ─────────────────────────────────── */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div className="rv" style={{ position: 'relative', width: '100%', maxWidth: 440, maxHeight: '70vh', display: 'flex', justifyContent: 'center' }}>
              <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1' }}>
                <img 
                  src="/map/egypt_gold_outline.png" 
                  alt="خريطة مصر" 
                  style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 16px 40px rgba(0,0,0,.7))' }} 
                />
                <svg viewBox="0 0 1000 1000" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                  <defs>
                    <filter id="markerGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="8" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* City markers */}
                  {REGIONS.map((r, i) => {
                    const isActive = region.key === r.key;
                    const positions = {
                      aswan: { cx: 660, cy: 840 },
                      luxor: { cx: 690, cy: 650 },
                      cairo: { cx: 575, cy: 260 },
                      alexandria: { cx: 470, cy: 150 },
                    };
                    const pos = positions[r.key] || { cx: 500, cy: 500 };
                    const labelOffsets = {
                      aswan: { dx: 45, dy: 10, anchor: 'start' },
                      luxor: { dx: 45, dy: 10, anchor: 'start' },
                      cairo: { dx: 45, dy: 10, anchor: 'start' },
                      alexandria: { dx: -35, dy: -25, anchor: 'end' },
                    };
                    const label = labelOffsets[r.key] || { dx: 40, dy: 10, anchor: 'start' };

                    const svgRef = { current: null };

                    return (
                      <g key={r.key} style={{ cursor: 'pointer' }} onClick={(e) => {
                        goTo(i);
                        navigateWithZoom(r.key, e.currentTarget.closest('svg'), pos.cx, pos.cy);
                      }}>
                        {/* Outer ring */}
                        <circle cx={pos.cx} cy={pos.cy} r={isActive ? 34 : 24}
                          fill="none"
                          stroke={isActive ? '#e8a820' : 'rgba(200,152,48,.3)'}
                          strokeWidth={isActive ? 4 : 2}
                          opacity={isActive ? .8 : .4}
                          style={{ transition: 'all .4s ease' }}
                        />
                        {/* Active ripple */}
                        {isActive && (
                          <circle cx={pos.cx} cy={pos.cy} r={24}
                            fill="none" stroke="#e8a820" strokeWidth="4" opacity=".6"
                            style={{ animation: 'ripple 2s ease-out infinite', transformOrigin: `${pos.cx}px ${pos.cy}px` }}
                          />
                        )}
                        {/* Golden dot */}
                        <circle cx={pos.cx} cy={pos.cy} r={isActive ? 18 : 12}
                          fill={isActive ? '#e8a820' : '#c89830'}
                          stroke="#fff8ee" strokeWidth={isActive ? 4 : 2.5}
                          filter="url(#markerGlow)"
                          style={{ transition: 'all .35s ease' }}
                        />
                        {/* Highlight */}
                        <circle cx={pos.cx - 4} cy={pos.cy - 4} r={isActive ? 5 : 3}
                          fill="rgba(255,255,255,.7)"
                          style={{ transition: 'all .35s ease' }}
                        />
                        {/* Label */}
                        <text x={pos.cx + label.dx} y={pos.cy + label.dy}
                          textAnchor={label.anchor}
                          fill={isActive ? '#ffffff' : 'rgba(255,255,255,.9)'}
                          fontSize={isActive ? 32 : 24}
                          fontWeight={isActive ? 800 : 600}
                          fontFamily="'Noto Kufi Arabic', sans-serif"
                          style={{ transition: 'all .35s ease' }}
                        >
                          {r.name.split(' ')[0]}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
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
            <div className="rv-l ey" style={{ color: '#c89830' }}>01 — شخصيات من كل ركن</div>

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
                color: '#f0dfc0',
                textShadow: `0 0 60px rgba(240,223,192,0.15)`,
                fontFamily: FONT_HEADING,
              }}>{region.name}</h2>
              <p style={{ color: 'rgba(255,230,180,.55)', fontSize: 11, marginTop: 2, fontFamily: FONT_BODY }}>{region.nameEn}</p>
            </div>

            <div key={`quote-${animKey}`} className="slide-up" style={{ animationDelay: '.08s' }}>
              <blockquote className="qt" style={{ color: 'rgba(255,235,200,.9)', borderColor: '#c89830', background: `linear-gradient(90deg, rgba(200,152,48,.12), transparent)`, marginTop: 12, padding: '12px 16px', fontSize: 14 }}>
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

          {/* Visual — Teta Fatma Memory Card */}
          <div style={{ position: 'relative', minHeight: 460, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            
            <div className="rv" style={{
              background: 'rgba(14,11,8,.85)',
              border: '1px solid rgba(200,152,48,.3)',
              borderRadius: 24,
              padding: 16,
              width: 'min(100%, 380px)',
              boxShadow: '0 30px 60px rgba(0,0,0,.6), 0 0 40px rgba(200,152,48,.1)',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
              {/* Photo */}
              <div style={{
                width: '100%', aspectRatio: '4/3',
                borderRadius: 16, overflow: 'hidden',
                position: 'relative',
              }}>
                <img src="/new photos/teta_fatma.png" alt="تيتا فاطمة" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'sepia(0.2) saturate(1.1) brightness(0.95)' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,.6) 0%, transparent 40%)' }} />
              </div>

              {/* Memory Text */}
              <div style={{ padding: '24px 10px 10px', textAlign: 'center' }}>
                <span style={{ color: '#c89830', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', fontFamily: FONT_BODY }}>
                  ذكرى مختارة من شجرة العائلة
                </span>
                <h3 style={{
                  color: '#fff8ee', fontSize: 'clamp(20px, 2.5vw, 24px)', fontWeight: 800, marginTop: 8, marginBottom: 8,
                  fontFamily: FONT_HEADING
                }}>
                  ضحكتها التي لا نريد أن ننساها
                </h3>
                <p style={{ color: 'rgba(255,230,180,.6)', fontSize: 13, fontFamily: FONT_BODY }}>
                  تيتا فاطمة · العيد في بيت العيلة · 2025
                </p>
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
            <div className="rv-l ey" style={{ color: '#c89830' }}>02 — شجرة العيلة</div>
            <h2 className="rv-l d1 font-heading" style={{ fontSize: 'clamp(36px,5vw,68px)', fontWeight: 900, lineHeight: 1.04, color: '#fff8ee', fontFamily: FONT_HEADING }}>
              أصوات لا تنتهي<br />
              <span style={{ color: '#d4853a' }}>ذكريات تعيش.</span>
            </h2>
            <p className="rv-l d2" style={{ color: 'rgba(255,225,190,.75)', fontSize: 'clamp(14px,1.2vw,17px)', lineHeight: 1.9, marginTop: 18, fontFamily: FONT_BODY }}>
              نسجّل صوت شخص عزيز، ثم نحفظ نبرته ولهجته داخل تجربة تسمح للعائلة أن تسمع حكاياته مرة أخرى — في الأعياد، في المناسبات، وفي كل لحظة تشتاق فيها لصوته.
            </p>
            <div className="rv-l d2 qt" style={{ color: 'rgba(255,230,200,.9)', borderColor: '#c89830', background: 'linear-gradient(90deg, rgba(200,152,48,.12), transparent)' }}>
              "سجّل صوت جدك قبل ما يختفي للأبد."
            </div>
            <div className="rv-l d3" style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 9 }}>
              {['سجّل صوت أي شخص بأي لهجة', 'الـ AI يحفظ نبرته وشخصيته', 'يتكلم مع عيلتك في المناسبات'].map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'rgba(255,220,180,.7)', fontSize: 13, fontFamily: FONT_BODY }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#c89830', flexShrink: 0 }} />
                  {t}
                </div>
              ))}
            </div>
            <div className="rv-l d3" style={{ marginTop: 26, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link to="/family" className="btn" style={{ background: '#c89830', color: '#0e0b08', boxShadow: '0 8px 28px rgba(200,152,48,.35)' }}>
                <Mic size={14} /> ابدأ التسجيل
              </Link>
              <Link to="/family" className="btn" style={{ background: 'transparent', border: '1px solid rgba(200,152,48,.25)', color: '#c89830' }}>
                <Users size={14} /> شاهد الشجرة
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 3 — الجدار الحي
      ══════════════════════════════════════════════════════════════════ */}
      <section
        id="living-wall"
        ref={wallRef}
        style={{
          position: 'relative',
          overflow: 'hidden',
          minHeight: '100svh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px clamp(20px,4vw,60px)',
          background:
            'linear-gradient(135deg, #100a04 0%, #1c1208 50%, #100a04 100%)',
          borderTop: '1px solid rgba(255,220,140,.06)',
        }}
      >
        {/* Header */}
        <div
          className="rv"
          style={{
            textAlign: 'center',
            marginBottom: 16,
            maxWidth: 760,
          }}
        >
          <div
            className="ey"
            style={{
              justifyContent: 'center',
              color: '#c89830',
            }}
          >
            03 — الجدار الحي
          </div>

          <h2
            className="font-heading"
            style={{
              fontSize: 'clamp(34px,5vw,62px)',
              fontWeight: 900,
              lineHeight: 1.08,
              color: '#fff8ee',
              fontFamily: FONT_HEADING,
            }}
          >
            كل قطعة تحكي{' '}
            <span style={{ color: '#c89830' }}>حكاية</span>
          </h2>

          <p
            style={{
              color: 'rgba(255,225,180,.68)',
              fontSize: 'clamp(13px,1.2vw,16px)',
              lineHeight: 1.9,
              marginTop: 14,
              fontFamily: FONT_BODY,
            }}
          >
            اضغط على أي علامة متوهجة لتكتشف قصة السجاد والمفروشات
            والمنسوجات التي حملت ذاكرة أسوان والأقصر عبر الأجيال.
          </p>
        </div>

        {/* Main image */}
        <div
          className="rv d1"
          style={{
            position: 'relative',
            width: 'min(92vw, 1080px)',
            aspectRatio: '2.2 / 1',
            minHeight: 360,
            borderRadius: 26,
            overflow: 'hidden',
            border: '1px solid rgba(200,152,48,.32)',
            boxShadow:
              '0 34px 90px rgba(0,0,0,.72), 0 0 120px rgba(200,152,48,.08)',
            animation: wallVisible
              ? 'unfoldCarpet 1.2s cubic-bezier(.16,1,.3,1) forwards'
              : 'none',
            opacity: wallVisible ? 1 : 0,

            backgroundImage: 'url("/new photos/wall.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',

            isolation: 'isolate',
          }}
        >
          {/* Dark overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: activeSymbol
                ? 'linear-gradient(to top, rgba(10,6,4,.72), rgba(10,6,4,.14) 55%, rgba(10,6,4,.2))'
                : 'linear-gradient(to top, rgba(10,6,4,.52), rgba(10,6,4,.06) 60%, rgba(10,6,4,.14))',
              transition: 'background .35s ease',
              zIndex: 1,
              pointerEvents: 'none',
            }}
          />

          {/* Small label */}
          <div
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              zIndex: 5,
              padding: '8px 13px',
              borderRadius: 999,
              border: '1px solid rgba(200,152,48,.26)',
              background: 'rgba(14,11,8,.7)',
              backdropFilter: 'blur(12px)',
              color: '#c89830',
              fontSize: 11,
              fontWeight: 700,
              fontFamily: FONT_BODY,
            }}
          >
            منسوجات من الذاكرة المصرية
          </div>

          {/* Markers */}
          {WALL_SYMBOLS.map((ws, index) => {
            const isActive = activeSymbol?.id === ws.id;

            return (
              <button
                key={ws.id}
                onClick={() =>
                  setActiveSymbol(isActive ? null : ws)
                }
                aria-label={ws.name}
                title={ws.name}
                style={{
                  position: 'absolute',
                  top: ws.top,
                  left: ws.left,

                  transform: `translate(-50%, -50%) ${
                    isActive ? 'scale(1.16)' : 'scale(1)'
                  }`,

                  width: 34,
                  height: 34,
                  borderRadius: '50%',

                  border: `1px solid ${
                    isActive
                      ? '#fff4d4'
                      : 'rgba(255,240,190,.72)'
                  }`,

                  background: isActive
                    ? '#c89830'
                    : 'rgba(24,15,9,.8)',

                  color: isActive
                    ? '#140d08'
                    : '#f4d889',

                  cursor: 'pointer',
                  zIndex: 4,

                  display: 'grid',
                  placeItems: 'center',

                  fontFamily: FONT_HEADING,
                  fontSize: 11,
                  fontWeight: 900,

                  boxShadow: isActive
                    ? '0 0 0 10px rgba(200,152,48,.14), 0 0 28px rgba(200,152,48,.8)'
                    : '0 0 0 7px rgba(200,152,48,.08), 0 0 20px rgba(200,152,48,.55)',

                  animation: isActive
                    ? 'none'
                    : 'hotspotPulse 2.5s ease-in-out infinite',

                  animationDelay: `${index * 0.35}s`,
                  transition:
                    'all .3s cubic-bezier(.16,1,.3,1)',
                }}
              >
                {index + 1}
              </button>
            );
          })}

          {/* Story card */}
          <div
            style={{
              position: 'absolute',
              left: (!activeSymbol || parseInt(activeSymbol.left) > 50) ? 'clamp(16px,3vw,30px)' : 'auto',
              right: (activeSymbol && parseInt(activeSymbol.left) <= 50) ? 'clamp(16px,3vw,30px)' : 'auto',
              bottom: 'clamp(16px,3vw,28px)',
              zIndex: 5,

              width: 'min(430px, calc(100% - 32px))',

              opacity: activeSymbol ? 1 : 0,

              transform: activeSymbol
                ? 'translateY(0)'
                : 'translateY(18px)',

              pointerEvents: activeSymbol
                ? 'auto'
                : 'none',

              transition:
                'all .45s cubic-bezier(.16,1,.3,1)',
            }}
          >
            {activeSymbol && (
              <div
                key={activeSymbol.id}
                className="slide-up"
                style={{
                  padding: '20px 22px',
                  borderRadius: 20,

                  border:
                    '1px solid rgba(200,152,48,.3)',

                  background:
                    'rgba(14,10,8,.96)',

                  backdropFilter: 'blur(18px)',

                  boxShadow:
                    '0 22px 60px rgba(0,0,0,.46)',
                }}
              >
                <div
                  style={{
                    color: '#c89830',
                    fontSize: 11,
                    fontWeight: 700,
                    marginBottom: 7,
                    fontFamily: FONT_BODY,
                  }}
                >
                  القطعة المختارة
                </div>

                <h3
                  style={{
                    fontFamily: FONT_HEADING,
                    fontWeight: 900,
                    fontSize: 'clamp(18px,2vw,24px)',
                    color: '#fff8ee',
                    marginBottom: 8,
                  }}
                >
                  {activeSymbol.name}
                </h3>

                <p
                  style={{
                    fontFamily: FONT_BODY,
                    fontSize: 13,
                    lineHeight: 1.85,
                    color: 'rgba(255,230,200,.82)',
                    marginBottom: 12,
                  }}
                >
                  {activeSymbol.description}
                </p>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,

                    color: 'rgba(200,152,48,.58)',
                    fontSize: 11,
                    fontFamily: FONT_BODY,
                  }}
                >
                  <span>{activeSymbol.narrator}</span>

                  <span dir="ltr">
                    {String(
                      WALL_SYMBOLS.findIndex(
                        item =>
                          item.id === activeSymbol.id
                      ) + 1
                    ).padStart(2, '0')}
                    {' / '}
                    {String(
                      WALL_SYMBOLS.length
                    ).padStart(2, '0')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom steps */}
        <div
          className="rv-l d2"
          style={{
            display: 'flex',
            gap: 'clamp(16px,4vw,40px)',
            justifyContent: 'center',
            marginTop: 16,
            flexWrap: 'wrap',
          }}
        >
          {[
            {
              icon: <Sparkles size={18} />,
              text: 'اختر قطعة',
            },
            {
              icon: '→',
              text: 'اكتشف حكايتها',
            },
            {
              icon: <Heart size={18} />,
              text: 'احفظها في ذاكرتك',
            },
          ].map((step, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: 'rgba(200,152,48,.66)',
                fontSize: 13,
                fontFamily: FONT_BODY,
              }}
            >
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',

                  background:
                    'rgba(200,152,48,.08)',

                  border:
                    '1px solid rgba(200,152,48,.22)',

                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',

                  color: '#c89830',
                }}
              >
                {step.icon}
              </span>

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
        display: 'flex', alignItems: 'center',
        backgroundColor: '#060a10',
        borderTop: '1px solid rgba(255,220,140,.06)',
      }}>
        
        {/* Background Image */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: 'url("/new photos/child.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.6,
          filter: 'sepia(0.1) saturate(1.1) brightness(0.9)',
        }} />

        {/* Dark Overlay */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'linear-gradient(135deg, rgba(6,10,16,0.95) 0%, rgba(10,18,32,0.7) 50%, rgba(6,10,16,0.95) 100%)',
          pointerEvents: 'none',
        }} />

        <div style={{ width: '100%', maxWidth: 940, margin: '0 auto', padding: '60px clamp(20px,6vw,80px)', textAlign: 'center', position: 'relative', zIndex: 2 }}>
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
        position: 'relative', minHeight: '80svh', display: 'grid', placeItems: 'center',
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
          <div style={{
            fontSize: 'clamp(18px,2vw,24px)', fontWeight: 800, color: '#c89830',
            marginTop: 12, marginBottom: 16, fontFamily: FONT_HEADING,
          }}>
            حكاوي عشان صوت الماضي يفضل في الحاضر ويكمل في المستقبل
          </div>
          <h2 className="font-heading" style={{ fontSize: 'clamp(44px,7.5vw,98px)', fontWeight: 900, letterSpacing: '-.04em', lineHeight: .9, marginBottom: 20, color: '#fff8ee', fontFamily: FONT_HEADING }}>
            ابدأ رحلتك.
          </h2>
          <p style={{ color: 'rgba(255,225,185,.7)', fontSize: 16, marginBottom: 36, lineHeight: 1.75, fontFamily: FONT_BODY }}>
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
