import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Mic,
  ChevronDown,
  MousePointer,
  Sparkles,
  Users,
  Heart,
  Play,
  Pause,
  Volume2,
  VolumeX,
  X,
  Compass,
  CheckCircle2,
  ArrowUp,
  Radio,
} from 'lucide-react';

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
    accentDim: 'rgba(212,133,58,0.22)',
    bg: 'linear-gradient(135deg, #1a0c04 0%, #2d1608 50%, #1a0c04 100%)',
    tagColor: '#f5a050',
    mapCx: 129,
    mapCy: 425,
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
    accentDim: 'rgba(200,160,32,0.22)',
    bg: 'linear-gradient(135deg, #160f00 0%, #2a1e04 50%, #160f00 100%)',
    tagColor: '#e8c040',
    mapCx: 140,
    mapCy: 320,
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
    accentDim: 'rgba(74,154,184,0.22)',
    bg: 'linear-gradient(135deg, #030c12 0%, #071828 50%, #030c12 100%)',
    tagColor: '#60c0e0',
    mapCx: 124,
    mapCy: 112,
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
    accentDim: 'rgba(58,144,160,0.22)',
    bg: 'linear-gradient(135deg, #020c10 0%, #051520 50%, #020c10 100%)',
    tagColor: '#50b0c8',
    mapCx: 95,
    mapCy: 58,
  },
];

const BARS = Array.from({ length: 36 }, (_, i) => ({ i, h: 12 + Math.sin(i * 0.45) * 20 + Math.random() * 15 }));

/* ─── Living Wall Symbols ──────────────────────────────────────────────────── */
const WALL_SYMBOLS = [
  {
    id: 'nubian-baskets',
    name: 'السلال النوبية',
    category: 'حرف النخيل',
    description:
      'تُنسج يدويًا من سعف النخيل وألياف الحلفا الطبيعية، وكانت تُستخدم لحفظ الخبز الشمسي والتمر والمحاصيل. أصبحت رمزًا للفخر البيتي النوبي وتناقل الأجيال للصبر والجمال.',
    narrator: 'حكاية من أسوان والنوبة',
    color: '#d6a62a',
    top: '66%',
    left: '12%',
  },
  {
    id: 'nubian-tray',
    name: 'الطبق النوبي',
    category: 'فنون الزخرفة',
    description:
      'يحمل كل طبق نوبي زخارف هندسية مستوحاة من تعرجات النيل وأشعة الشمس والنجوم. يُعلق على جدران المنازل كتميمة محبة وضيافة ترافق كل المناسبات العائلية.',
    narrator: 'حكاية من أسوان والنوبة',
    color: '#d6a62a',
    top: '61%',
    left: '32%',
  },
  {
    id: 'clay-jar',
    name: 'الجرة الفخارية (القلّة)',
    category: 'طين النيل',
    description:
      'تُصنع من طمي النيل المنقى، وتتميز بمساميتها الفائقة التي تبرّد الماء طبيعيًا في أشد أيام الصيف حرارة. كانت وما زالت أيقونة الكرم في شوارع وقرى صعيد مصر.',
    narrator: 'حكاية من جنوب مصر',
    color: '#d6a62a',
    top: '54%',
    left: '43%',
  },
  {
    id: 'hand-loom',
    name: 'النول اليدوي التقليدي',
    category: 'نسيج التراث',
    description:
      'آلة خشبية تتوارثها عائلات النساجين في أخميم وقنا. كل ضربة مكوك تُحكم خيطًا جديدًا يخلّد نقوش الكليم والسجاد اليدوي الذي يدوم لعقود دون أن يفقد بهاءه.',
    narrator: 'حكاية من صُنّاع النسيج',
    color: '#d6a62a',
    top: '56%',
    left: '51%',
  },
  {
    id: 'woven-textile',
    name: 'قطعة نسيج صوفية',
    category: 'ألوان طبيعية',
    description:
      'مصبوغة بنبات الفوّة وقشور الرمان ونيل النيل الأزرق. لا توجد قطعتان متطابقتان، إذ تضع الناسجة فيها نبض مشاعرها والقصص التي سمعتها أثناء الغزل.',
    narrator: 'حكاية من ذاكرة البيت',
    color: '#d6a62a',
    top: '81%',
    left: '74%',
  },
  {
    id: 'luxor-carpet',
    name: 'سجادة الأقصر المعمارية',
    category: 'معابد طيبة',
    description:
      'استُلهمت خطوطها من أعمدة معبد الكرنك وزهرة اللوتس الفرعونية. كانت تُهدى في زيجات العائلات الكبرى كرمز للبركة والخلود المستمر عبر التاريخ.',
    narrator: 'حكاية من الأقصر',
    color: '#d6a62a',
    top: '42%',
    left: '90%',
  },
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
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
          }
        }),
      { threshold: 0.12 }
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

    cycleRef.current = setInterval(() => {
      setActiveIdx((p) => (p + 1) % REGIONS.length);
      setAnimKey((k) => k + 1);
    }, 7000);
  }, []);

  /* Navigate with a zoom-burst from the clicked marker position */
  const navigateWithZoom = useCallback(
    (regionKey, svgEl, svgCx, svgCy) => {
      if (svgEl) {
        const rect = svgEl.getBoundingClientRect();
        const scaleX = rect.width / 1000;
        const scaleY = rect.height / 1000;
        const screenX = rect.left + svgCx * scaleX;
        const screenY = rect.top + svgCy * scaleY;
        setZoomOrigin({ x: `${screenX}px`, y: `${screenY}px` });
      }
      const r = REGIONS.find((r) => r.key === regionKey);
      setZoomColor(r?.accent || '#c89830');
      setZoomActive(true);
      setTimeout(() => navigate('/map'), 500);
    },
    [navigate]
  );

  // Auto-cycle characters
  useEffect(() => {
    cycleRef.current = setInterval(() => {
      setActiveIdx((p) => (p + 1) % REGIONS.length);
      setAnimKey((k) => k + 1);
    }, 7000);
    return () => {
      clearInterval(cycleRef.current);
    };
  }, []);

  const region = REGIONS[activeIdx];

  /* Living Wall state */
  const [activeSymbol, setActiveSymbol] = useState(null);
  const [wallAudioPlaying, setWallAudioPlaying] = useState(false);
  const [wallVisible, setWallVisible] = useState(false);
  const wallRef = useRef(null);

  useEffect(() => {
    if (!wallRef.current) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setWallVisible(true);
      },
      { threshold: 0.2 }
    );
    io.observe(wallRef.current);
    return () => io.disconnect();
  }, []);

  /* Family Tree audio waveform simulation */
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const waveRef = useRef(null);
  const TOTAL = 18;
  const fmt = (s) => `00:${String(s).padStart(2, '0')}`;

  const togglePlay = () => {
    setPlaying((p) => {
      if (!p) {
        waveRef.current = setInterval(() => {
          setElapsed((e) => {
            if (e >= TOTAL - 1) {
              clearInterval(waveRef.current);
              setPlaying(false);
              return 0;
            }
            return e + 1;
          });
        }, 1000);
      } else {
        clearInterval(waveRef.current);
      }
      return !p;
    });
  };

  useEffect(() => {
    return () => {
      if (waveRef.current) clearInterval(waveRef.current);
    };
  }, []);

  return (
    <div
      ref={pageRef}
      dir="rtl"
      style={{
        fontFamily: FONT_BODY,
        background: '#0e0b08',
        color: '#f0e0c8',
        overflowX: 'hidden',
      }}
    >
      {/* ── CSS Styles ──────────────────────────────────────────────────────── */}
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        a { text-decoration: none; color: inherit; }
        img { display: block; }

        /* Grain texture overlay */
        .grain {
          position: fixed; inset: -50%; z-index: 999; pointer-events: none; opacity: .035;
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

        /* Scroll reveal horizontal */
        .rv, .rv-l {
          opacity: 0;
          transition: opacity .85s cubic-bezier(.16,1,.3,1), transform .85s cubic-bezier(.16,1,.3,1);
        }
        .rv { transform: translateX(50px); }
        .rv-l { transform: translateX(-50px); }
        .rv.in, .rv-l.in { opacity: 1; transform: none; }
        .rv.d1, .rv-l.d1 { transition-delay: .1s; }
        .rv.d2, .rv-l.d2 { transition-delay: .22s; }
        .rv.d3, .rv-l.d3 { transition-delay: .34s; }
        .rv.d4, .rv-l.d4 { transition-delay: .46s; }

        /* Slide-up for content switch */
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .slide-up { animation: slideUp .5s cubic-bezier(.16,1,.3,1) forwards; }

        /* Eyebrow label */
        .ey { display: inline-flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 700; letter-spacing: .22em; text-transform: uppercase; font-family: ${FONT_BODY}; }
        .ey::before { content: ""; width: 28px; height: 1px; background: currentColor; }

        /* Quote styling */
        .qt { margin-top: 20px; padding: 16px 20px; font-size: 16px; line-height: 1.85; border-right: 2px solid currentColor; font-style: italic; border-radius: 0 8px 8px 0; font-family: ${FONT_BODY}; }

        /* Buttons */
        .btn {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          border: 0;
          padding: 13px 26px;
          border-radius: 999px;
          cursor: pointer;
          font-family: ${FONT_HEADING};
          font-size: 14.5px;
          font-weight: 700;
          transition: all .28s cubic-bezier(.16,1,.3,1);
          text-decoration: none;
        }
        .btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 36px rgba(200,152,48,.32);
        }

        /* Nile flow animation */
        @keyframes nileFlow {
          to { stroke-dashoffset: -240; }
        }

        /* Zoom burst */
        @keyframes zoomBurst {
          0%   { transform: scale(0); opacity: 1; }
          100% { transform: scale(45); opacity: 1; }
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

        /* Waveform bar bounce */
        @keyframes wvBounce {
          0%   { transform: scaleY(0.25); }
          50%  { transform: scaleY(1); }
          100% { transform: scaleY(0.35); }
        }

        /* Floating animation */
        @keyframes floatImg {
          0%, 100% { transform: translateY(0px) rotate(-.4deg); }
          50%      { transform: translateY(-12px) rotate(.4deg); }
        }

        /* Hotspot pulse beacon */
        @keyframes beaconPulse {
          0%   { box-shadow: 0 0 0 0 rgba(200,152,48, 0.7); }
          70%  { box-shadow: 0 0 0 16px rgba(200,152,48, 0); }
          100% { box-shadow: 0 0 0 0 rgba(200,152,48, 0); }
        }

        /* ripple */
        @keyframes ripple { 0% { transform: scale(1); opacity: .6; } 100% { transform: scale(3); opacity: 0; } }

        /* Carpet unfolding */
        @keyframes unfoldCarpet {
          from { opacity: 0; transform: scale(.94) perspective(900px) rotateX(6deg); }
          to   { opacity: 1; transform: scale(1) perspective(900px) rotateX(0deg); }
        }

        /* Grid */
        .g2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: center;
          gap: clamp(32px, 6vw, 80px);
          padding: 90px clamp(20px, 7vw, 100px);
        }
        @media (max-width: 880px) {
          .g2 { grid-template-columns: 1fr; padding: 70px 20px; }
        }

        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
          .rv, .rv-l { opacity: 1 !important; transform: none !important; }
        }

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

      {/* ── Parallax Floating Heritage Icons ────────────────────────── */}
      {PARALLAX_ICONS.map((icon, i) => (
        <span
          key={`picon-${i}`}
          style={{
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
          }}
        >
          {icon.symbol}
        </span>
      ))}

      {/* ══════════════════════════════════════════════════════════════════
          HERO SECTION — صوت الماضي، حيّ في الحاضر
      ══════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          position: 'relative',
          minHeight: '100svh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          background: '#0e0b08',
        }}
      >
        {/* Background artwork with subtle parallax */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '100%',
            backgroundImage: 'url(/image/background.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center bottom',
            backgroundRepeat: 'no-repeat',
            opacity: 0.94,
            filter: 'sepia(.15) brightness(.65) contrast(.95) saturate(.9)',
            transform: `translateY(${scrollY * 0.18}px)`,
          }}
        />

        {/* Cinematic Vignette */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to bottom, rgba(14,11,8,.4) 0%, rgba(14,11,8,.15) 40%, rgba(14,11,8,.45) 75%, #0e0b08 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at 50% 45%, rgba(200,152,48,.12) 0%, transparent 65%)',
          }}
        />

        {/* Floating Nile Felucca Ship */}
        <img
          src="/image/ship.png"
          alt="سفينة النيل التراثية"
          style={{
            position: 'absolute',
            right: '6%',
            bottom: '12%',
            width: 'clamp(140px, 15vw, 240px)',
            opacity: 0.88,
            filter: 'sepia(.25) brightness(.62) contrast(.9) saturate(.9)',
            animation: 'floatImg 8s ease-in-out infinite',
            pointerEvents: 'none',
            transform: `translateY(${scrollY * -0.08}px)`,
          }}
        />

        {/* Hero Content Container */}
        <div
          className="rv in"
          style={{
            position: 'relative',
            zIndex: 2,
            textAlign: 'center',
            padding: '0 24px',
            paddingTop: 84,
            maxWidth: 960,
          }}
        >
          {/* Status Pill Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 22px',
              borderRadius: 999,
              background: 'linear-gradient(90deg, rgba(200,152,48,0.2), rgba(200,152,48,0.06))',
              border: '1px solid rgba(200,152,48,0.35)',
              boxShadow: '0 0 25px rgba(200,152,48,0.18)',
              color: '#f0d078',
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 20,
              fontFamily: FONT_HEADING,
            }}
          >
            <Sparkles size={14} className="text-[#e8bc58]" />
            <span>مصر كما يرويها أهلها • منصة الذكاء الاصطناعي لحفظ التراث الشفوي</span>
          </div>

          {/* Monumental Hero Headline */}
          <h1
            style={{
              fontSize: 'clamp(5rem, 18vw, 12rem)',
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: 'normal',
              color: '#fff8ee',
              textShadow: '0 0 100px rgba(200,152,48,0.45), 0 4px 35px rgba(0,0,0,0.85)',
              fontFamily: FONT_HEADING,
              marginBottom: 8,
              paddingBottom: '16px',
            }}
          >
            حكاوي
          </h1>

          {/* Hero Subtitle in classical Amiri font */}
          <p
            className="font-amiri"
            style={{
              color: '#fff8ee',
              fontSize: 'clamp(20px, 2.2vw, 27px)',
              marginTop: 14,
              letterSpacing: '0.02em',
              textShadow: '0 2px 10px rgba(0,0,0,0.7)',
            }}
          >
            «صوت الماضي، حيّ في الحاضر»
          </p>

          <p
            style={{
              color: 'rgba(200,152,48,0.65)',
              fontSize: 12,
              marginTop: 6,
              letterSpacing: '.22em',
              fontWeight: 600,
              fontFamily: FONT_BODY,
            }}
          >
            THE VOICE OF THE PAST · ALIVE IN THE PRESENT
          </p>

          {/* Dual CTAs */}
          <div
            style={{
              display: 'flex',
              gap: 14,
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginTop: 38,
            }}
          >
            <Link
              to="/map"
              className="btn hover-lift"
              style={{
                background: 'linear-gradient(135deg, #e8bc58 0%, #c89830 100%)',
                color: '#0e0b08',
                boxShadow: '0 8px 32px rgba(200,152,48,.4)',
                padding: '14px 30px',
                fontSize: 15,
                fontWeight: 800,
              }}
            >
              <span>استكشف الخريطة</span>
              <ArrowLeft size={16} />
            </Link>

            <Link
              to="/family"
              className="btn hover-lift"
              style={{
                background: 'rgba(23, 18, 12, 0.85)',
                border: '1px solid rgba(200, 152, 48, 0.35)',
                color: '#f0e0c8',
                backdropFilter: 'blur(16px)',
                padding: '14px 28px',
                fontSize: 15,
                fontWeight: 700,
                boxShadow: '0 8px 24px rgba(0,0,0,.5)',
              }}
            >
              <Mic size={16} className="text-[#c89830]" />
              <span>سجّل صوت عيلتك</span>
            </Link>
          </div>
        </div>

        {/* Scroll hint indicator */}
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
            color: 'rgba(200,152,48,.5)',
            fontSize: 11,
            letterSpacing: '.18em',
            zIndex: 2,
            fontFamily: FONT_BODY,
          }}
        >
          <ChevronDown
            size={22}
            style={{ animation: 'scrollPulse 1.8s ease-in-out infinite', display: 'block', margin: '0 auto' }}
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 1 — شخصيات الأقاليم + الخريطة التفاعلية
      ══════════════════════════════════════════════════════════════════ */}
      <section
        id="chars"
        style={{
          position: 'relative',
          overflow: 'hidden',
          minHeight: '100svh',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#0e0b08',
          borderTop: '1px solid rgba(200,152,48,.15)',
        }}
      >
        {/* Dynamic Regional Backgrounds */}
        {REGIONS.map((r, i) => (
          <div
            key={`bgimg-${r.key}`}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              backgroundImage: r.bgImage ? `url("${r.bgImage}")` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: activeIdx === i && r.bgImage ? 0.85 : 0,
              filter: 'sepia(0.3) saturate(1.2) contrast(1.1)',
              transition: 'opacity 1s cubic-bezier(.16,1,.3,1), transform 1s cubic-bezier(.16,1,.3,1)',
              transform: activeIdx === i ? 'translateX(0) scale(1.02)' : 'translateX(80px) scale(1)',
            }}
          />
        ))}

        {/* Unified Hakawi Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            background:
              'linear-gradient(135deg, rgba(14,11,8,0.95) 0%, rgba(26,14,4,0.4) 50%, rgba(14,11,8,0.95) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Accent glow */}
        <div
          style={{
            position: 'absolute',
            top: '20%',
            right: '5%',
            zIndex: 2,
            width: '40%',
            height: '60%',
            background: `radial-gradient(ellipse, ${region.accentDim} 0%, transparent 70%)`,
            transition: 'background .8s ease',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            width: '100%',
            position: 'relative',
            zIndex: 3,
            display: 'grid',
            gridTemplateColumns: '1.1fr 1fr',
            alignItems: 'center',
            gap: 'clamp(20px,4vw,40px)',
            padding: '70px clamp(20px,5vw,80px)',
          }}
        >
          {/* ── LEFT: Big Map ─────────────────────────────────── */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              className="rv"
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: 440,
                maxHeight: '70vh',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1' }}>
                <img
                  src="/map/egypt_gold_outline.png"
                  alt="خريطة مصر"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 16px 40px rgba(0,0,0,.7))',
                  }}
                />
                <svg
                  viewBox="0 0 1000 1000"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                >
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

                    return (
                      <g
                        key={r.key}
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => {
                          goTo(i);
                          if (isActive) {
                            navigateWithZoom(r.key, e.currentTarget.closest('svg'), pos.cx, pos.cy);
                          }
                        }}
                      >
                        {/* Outer ring */}
                        <circle
                          cx={pos.cx}
                          cy={pos.cy}
                          r={isActive ? 34 : 24}
                          fill="none"
                          stroke={isActive ? '#e8a820' : 'rgba(200,152,48,.3)'}
                          strokeWidth={isActive ? 4 : 2}
                          opacity={isActive ? 0.8 : 0.4}
                          style={{ transition: 'all .4s ease' }}
                        />
                        {/* Active ripple */}
                        {isActive && (
                          <circle
                            cx={pos.cx}
                            cy={pos.cy}
                            r={24}
                            fill="none"
                            stroke="#e8a820"
                            strokeWidth="4"
                            opacity=".6"
                            style={{
                              animation: 'ripple 2s ease-out infinite',
                              transformOrigin: `${pos.cx}px ${pos.cy}px`,
                            }}
                          />
                        )}
                        {/* Golden dot */}
                        <circle
                          cx={pos.cx}
                          cy={pos.cy}
                          r={isActive ? 18 : 12}
                          fill={isActive ? '#e8a820' : '#c89830'}
                          stroke="#fff8ee"
                          strokeWidth={isActive ? 4 : 2.5}
                          filter="url(#markerGlow)"
                          style={{ transition: 'all .35s ease' }}
                        />
                        {/* Highlight */}
                        <circle
                          cx={pos.cx - 4}
                          cy={pos.cy - 4}
                          r={isActive ? 5 : 3}
                          fill="rgba(255,255,255,.7)"
                          style={{ transition: 'all .35s ease' }}
                        />
                        {/* Label */}
                        <text
                          x={pos.cx + label.dx}
                          y={pos.cy + label.dy}
                          textAnchor={label.anchor}
                          fill={isActive ? '#ffffff' : 'rgba(255,255,255,.9)'}
                          fontSize={isActive ? 32 : 24}
                          fontWeight={isActive ? 800 : 600}
                          fontFamily={FONT_HEADING}
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
            <div
              className="rv d1"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: 'rgba(200,152,48,.55)',
                fontSize: 11,
                fontFamily: FONT_BODY,
                background: 'rgba(200,152,48,.06)',
                padding: '6px 14px',
                borderRadius: 999,
                border: '1px solid rgba(200,152,48,.12)',
              }}
            >
              <MousePointer size={14} style={{ animation: 'floatImg 3s ease-in-out infinite' }} />
              <span>اضغط على أي منطقة لاستكشاف شخصيتها</span>
            </div>
          </div>

          {/* ── RIGHT: Character Card ────────────────────────────── */}
          <div>
            <div className="rv-l ey" style={{ color: '#c89830' }}>
              01 — شخصيات من كل ركن
            </div>

            {/* Photo + name */}
            <div
              key={`photo-${animKey}`}
              className="slide-up"
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              {/* Glow */}
              <div
                style={{
                  position: 'absolute',
                  top: '10%',
                  left: '10%',
                  right: '10%',
                  bottom: '10%',
                  background: `radial-gradient(ellipse, ${region.accentDim} 0%, transparent 70%)`,
                  filter: 'blur(30px)',
                  pointerEvents: 'none',
                }}
              />
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
              <div
                style={{
                  position: 'relative',
                  marginTop: -14,
                  zIndex: 2,
                  whiteSpace: 'nowrap',
                  background: 'rgba(14,11,8,.92)',
                  backdropFilter: 'blur(12px)',
                  border: `1px solid ${region.accent}50`,
                  borderRadius: 999,
                  padding: '6px 16px',
                  fontSize: 12,
                  color: region.tagColor,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: FONT_HEADING,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: region.accent,
                    display: 'inline-block',
                    animation: 'scrollPulse 2s ease-in-out infinite',
                  }}
                />
                {region.elderName} — {region.elderTitle}
              </div>
            </div>

            {/* Region name */}
            <div key={`name-${animKey}`} className="slide-up">
              <h2
                style={{
                  fontSize: 'clamp(28px,3.5vw,48px)',
                  fontWeight: 900,
                  lineHeight: 1.05,
                  color: '#f0dfc0',
                  textShadow: `0 0 60px rgba(240,223,192,0.15)`,
                  fontFamily: FONT_HEADING,
                }}
              >
                {region.name}
              </h2>
              <p
                style={{
                  color: 'rgba(255,230,180,.55)',
                  fontSize: 11,
                  marginTop: 2,
                  fontFamily: FONT_BODY,
                }}
              >
                {region.nameEn}
              </p>
            </div>

            {/* Quote without voice teaser */}
            <div key={`quote-${animKey}`} className="slide-up" style={{ animationDelay: '.08s' }}>
              <blockquote
                className="qt"
                style={{
                  color: 'rgba(255,235,200,.9)',
                  borderColor: '#c89830',
                  background: `linear-gradient(90deg, rgba(200,152,48,.12), transparent)`,
                  marginTop: 12,
                  padding: '12px 16px',
                  fontSize: 14,
                }}
              >
                "{region.quote}"
              </blockquote>
            </div>

            {/* Region tabs */}
            <div
              className="rv-l d2"
              style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 16 }}
            >
              {REGIONS.map((r, i) => (
                <button
                  key={r.key}
                  onClick={() => goTo(i)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: 'none',
                    fontFamily: FONT_HEADING,
                    transition: '.25s ease',
                    background: activeIdx === i ? r.tagColor : 'rgba(255,255,255,.08)',
                    color: activeIdx === i ? '#0e0b08' : 'rgba(255,225,170,.65)',
                    boxShadow: activeIdx === i ? `0 0 24px ${r.accentDim}` : 'none',
                    transform: activeIdx === i ? 'scale(1.05)' : 'scale(1)',
                  }}
                >
                  {r.name.split(' ')[0]}
                </button>
              ))}
            </div>

            <div className="rv-l d3" style={{ marginTop: 20 }}>
              <Link
                to="/map"
                className="btn"
                style={{
                  background: region.tagColor,
                  color: '#0e0b08',
                  boxShadow: `0 8px 28px ${region.accentDim}`,
                  padding: '10px 18px',
                  fontSize: 13,
                }}
              >
                <span>تحدث مع {region.elderName} على الخريطة</span>
                <ArrowLeft size={14} />
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
          SECTION 2 — شجرة العيلة (Family Voice Preservation)
      ══════════════════════════════════════════════════════════════════ */}
      <section
        id="family-tree"
        style={{
          position: 'relative',
          overflow: 'hidden',
          minHeight: '100svh',
          display: 'flex',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #0e0608 0%, #1a0f0d 50%, #0e0608 100%)',
          borderTop: '1px solid rgba(200,152,48,.15)',
        }}
      >
        {/* Ancient Hieroglyphic Stone Relief */}
        <img
          src="/image/noqush.png"
          alt="نقوش تاريخية"
          style={{
            position: 'absolute',
            right: '-4%',
            top: '8%',
            width: 'clamp(220px,32vw,480px)',
            opacity: 0.82,
            filter: 'sepia(.2) brightness(.5) contrast(.9) saturate(.8)',
            transform: `translateY(${(scrollY - 1500) * -0.07}px)`,
            pointerEvents: 'none',
            animation: 'floatImg 11s ease-in-out infinite',
          }}
        />

        <div className="g2" style={{ width: '100%', position: 'relative', zIndex: 2 }}>
          {/* Visual — Teta Fatma Vintage Memory Card & Audio Player */}
          <div
            style={{
              position: 'relative',
              minHeight: 460,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 18,
            }}
          >
            {/* Memory Card */}
            <div
              className="rv"
              style={{
                background: 'rgba(23, 18, 12, 0.88)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(200,152,48,.35)',
                borderRadius: 24,
                padding: 18,
                width: 'min(100%, 390px)',
                boxShadow: '0 30px 60px rgba(0,0,0,.7), 0 0 40px rgba(200,152,48,.12)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
              }}
            >
              {/* Ornate Gold Corner Filigree */}
              <div
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  width: 16,
                  height: 16,
                  borderTop: '2px solid #c89830',
                  borderRight: '2px solid #c89830',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 10,
                  left: 10,
                  width: 16,
                  height: 16,
                  borderTop: '2px solid #c89830',
                  borderLeft: '2px solid #c89830',
                }}
              />

              {/* Photo */}
              <div
                style={{
                  width: '100%',
                  aspectRatio: '4/3',
                  borderRadius: 16,
                  overflow: 'hidden',
                  position: 'relative',
                  border: '1px solid rgba(200,152,48,.2)',
                }}
              >
                <img
                  src="/new photos/teta_fatma.png"
                  alt="تيتا فاطمة"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: 'sepia(0.18) saturate(1.1) brightness(0.96)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(0deg, rgba(14,11,8,.7) 0%, transparent 40%)',
                  }}
                />
              </div>

              {/* Memory Text & Metadata */}
              <div style={{ padding: '18px 10px 8px', textAlign: 'center', width: '100%' }}>
                <span
                  style={{
                    color: '#c89830',
                    fontSize: 11.5,
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    fontFamily: FONT_BODY,
                  }}
                >
                  ذكرى صوتية محفوظة في شجرة العائلة
                </span>
                <h3
                  style={{
                    color: '#fff8ee',
                    fontSize: 'clamp(20px, 2.5vw, 24px)',
                    fontWeight: 800,
                    marginTop: 6,
                    marginBottom: 6,
                    fontFamily: FONT_HEADING,
                  }}
                >
                  «ضحكتها التي لا نريد أن ننساها»
                </h3>
                <p
                  style={{
                    color: 'rgba(255,230,180,.65)',
                    fontSize: 13,
                    fontFamily: FONT_BODY,
                  }}
                >
                  تيتا فاطمة · العيد في بيت العيلة الكبير
                </p>

                {/* Authenticity Chip */}
                <div
                  style={{
                    marginTop: 12,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 14px',
                    borderRadius: 999,
                    background: 'rgba(34, 197, 94, 0.12)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    color: '#4ade80',
                    fontSize: 11.5,
                    fontWeight: 700,
                  }}
                >
                  <CheckCircle2 size={13} />
                  <span>دقة استنساخ النبرة 98% • لهجة صعيدية أصلية</span>
                </div>
              </div>
            </div>

            {/* Audio Waveform Interactive Player */}
            <div
              className="rv d1"
              style={{
                width: 'min(92%, 380px)',
                padding: '16px 20px',
                border: '1px solid rgba(200,152,48,.3)',
                borderRadius: 20,
                background: 'rgba(17, 12, 10, 0.95)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 20px 50px rgba(0,0,0,.7)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <button
                  onClick={togglePlay}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    border: 0,
                    background: 'linear-gradient(135deg, #e8bc58, #c89830)',
                    color: '#0e0b08',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 4px 18px rgba(200,152,48,0.4)',
                    transition: 'all .25s ease',
                  }}
                  aria-label={playing ? 'إيقاف مؤقت' : 'تشغيل الذكرى الصوتية'}
                >
                  {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                </button>

                {/* Animated Waveform Bars */}
                <div
                  style={{
                    flex: 1,
                    height: 52,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    overflow: 'hidden',
                  }}
                >
                  {BARS.map(({ i, h }) => (
                    <div
                      key={i}
                      style={{
                        width: 4,
                        minHeight: 6,
                        borderRadius: 999,
                        height: h,
                        background: 'linear-gradient(to top, #c89830, #e8bc58)',
                        transformOrigin: 'center',
                        transform: playing ? 'scaleY(1)' : 'scaleY(0.28)',
                        transition: 'transform .25s ease',
                        animation: playing
                          ? `wvBounce ${0.5 + (i % 6) * 0.12}s ease-in-out ${-i * 0.04}s infinite alternate`
                          : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Progress and Duration Bar */}
              <div
                style={{
                  marginTop: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  color: 'rgba(200,152,48,.8)',
                  fontSize: 11.5,
                  fontFamily: FONT_BODY,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Volume2 size={13} className="text-[#c89830]" />
                  <span>عينة صوت الجدة المستنسخة</span>
                </span>
                <span dir="ltr">
                  {fmt(elapsed)} / {fmt(TOTAL)}
                </span>
              </div>
            </div>
          </div>

          {/* Copy & Feature Value Props */}
          <div>
            <div className="rv-l ey" style={{ color: '#c89830' }}>
              02 — شجرة العيلة الذكية
            </div>

            <h2
              className="rv-l d1 font-heading"
              style={{
                fontSize: 'clamp(34px, 4.8vw, 64px)',
                fontWeight: 900,
                lineHeight: 1.05,
                color: '#fff8ee',
                fontFamily: FONT_HEADING,
              }}
            >
              أصوات لا تنتهي،<br />
              <span style={{ color: '#e8bc58' }}>وذكريات تعيش للأبد.</span>
            </h2>

            <p
              className="rv-l d2"
              style={{
                color: 'rgba(255,225,190,.78)',
                fontSize: 'clamp(14px, 1.2vw, 17px)',
                lineHeight: 1.9,
                marginTop: 18,
                fontFamily: FONT_BODY,
              }}
            >
              سجّل دقيقة واحدة بصوت جدك أو جدتك، والمنصة تحفظ نبرتهم ولهجتهم داخل شجرة عائلتك
              التفاعلية. استمع لحكاياتهم مرة أخرى في كل مناسبة، واجعل الأجيال القادمة تعرف صوت أصلها.
            </p>

            <blockquote
              className="rv-l d2 font-amiri"
              style={{
                color: '#fff8ee',
                borderRight: '3px solid #c89830',
                background: 'linear-gradient(90deg, rgba(200,152,48,.15), transparent)',
                marginTop: 18,
                padding: '12px 20px',
                fontSize: 18,
                borderRadius: '0 10px 10px 0',
              }}
            >
              «سجّل صوت من تحب اليوم، ليبقى دافئًا في ذاكرة أحفادك غدًا.»
            </blockquote>

            {/* Value checklist */}
            <div
              className="rv-l d3"
              style={{
                marginTop: 22,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12,
              }}
            >
              {[
                { title: 'استنساخ فوري', desc: 'في أقل من 10 ثوانٍ تسجيل' },
                { title: 'شجرة تفاعلية', desc: 'تضم كل أفراد وأجداد الأسرة' },
                { title: 'حفظ آمن ومستمر', desc: 'تراث عائلتك محفوظ للأبد' },
              ].map((feat, i) => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(23, 18, 12, 0.7)',
                    border: '1px solid rgba(200,152,48,.2)',
                    borderRadius: 14,
                    padding: '12px 16px',
                  }}
                >
                  <div
                    style={{
                      color: '#e8bc58',
                      fontWeight: 700,
                      fontSize: 13,
                      fontFamily: FONT_HEADING,
                    }}
                  >
                    {feat.title}
                  </div>
                  <div
                    style={{
                      color: 'rgba(255,225,180,.65)',
                      fontSize: 11.5,
                      marginTop: 2,
                      fontFamily: FONT_BODY,
                    }}
                  >
                    {feat.desc}
                  </div>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div
              className="rv-l d3"
              style={{ marginTop: 28, display: 'flex', gap: 12, flexWrap: 'wrap' }}
            >
              <Link
                to="/family"
                className="btn hover-lift"
                style={{
                  background: 'linear-gradient(135deg, #e8bc58 0%, #c89830 100%)',
                  color: '#0e0b08',
                  boxShadow: '0 8px 28px rgba(200,152,48,.35)',
                  padding: '12px 26px',
                  fontWeight: 800,
                }}
              >
                <Mic size={15} /> <span>ابدأ تسجيل صوت الأسرة</span>
              </Link>

              <Link
                to="/family"
                className="btn hover-lift"
                style={{
                  background: 'rgba(23, 18, 12, 0.8)',
                  border: '1px solid rgba(200,152,48,.3)',
                  color: '#f0e0c8',
                  padding: '12px 22px',
                }}
              >
                <Users size={15} className="text-[#c89830]" /> <span>استكشف شجرة العيلة</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 3 — الجدار الحي (The Living Heritage Tapestry)
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
          padding: '60px clamp(20px, 4vw, 60px)',
          background: 'linear-gradient(135deg, #0d0805 0%, #17100a 50%, #0d0805 100%)',
          borderTop: '1px solid rgba(200,152,48,.15)',
        }}
      >
        {/* Section Header */}
        <div className="rv" style={{ textAlign: 'center', marginBottom: 24, maxWidth: 780 }}>
          <div className="ey" style={{ justifyContent: 'center', color: '#c89830', marginBottom: 10 }}>
            03 — الجدار الحي
          </div>

          <h2
            className="font-heading"
            style={{
              fontSize: 'clamp(32px, 4.5vw, 58px)',
              fontWeight: 900,
              lineHeight: 1.08,
              color: '#fff8ee',
              fontFamily: FONT_HEADING,
            }}
          >
            كل قطعة تحكي <span style={{ color: '#e8bc58' }}>حكاية</span>
          </h2>

          <p
            style={{
              color: 'rgba(255,225,180,.75)',
              fontSize: 'clamp(14px, 1.2vw, 17px)',
              lineHeight: 1.85,
              marginTop: 12,
              fontFamily: FONT_BODY,
            }}
          >
            اضغط على أي علامة متوهجة على جدار الحرف لاستكشاف قصة المنسوجات والأواني التي حملت
            ذاكرة النوبة والصعيد عبر آلاف السنين.
          </p>
        </div>

        {/* Tapestry Canvas */}
        <div
          className="rv d1"
          style={{
            position: 'relative',
            width: 'min(94vw, 1120px)',
            aspectRatio: '2.2 / 1',
            minHeight: 380,
            borderRadius: 26,
            overflow: 'hidden',
            border: '1px solid rgba(200,152,48,.35)',
            boxShadow: '0 34px 90px rgba(0,0,0,.75), 0 0 120px rgba(200,152,48,.1)',
            animation: wallVisible ? 'unfoldCarpet 1.2s cubic-bezier(.16,1,.3,1) forwards' : 'none',
            opacity: wallVisible ? 1 : 0,
            backgroundImage: 'url("/new photos/wall.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            isolation: 'isolate',
          }}
        >
          {/* Ambient Lighting Overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: activeSymbol
                ? 'linear-gradient(to top, rgba(14,10,8,.85), rgba(14,10,8,.3) 55%, rgba(14,10,8,.35))'
                : 'linear-gradient(to top, rgba(14,10,8,.65), rgba(14,10,8,.15) 60%, rgba(14,10,8,.25))',
              transition: 'background .35s ease',
              zIndex: 1,
              pointerEvents: 'none',
            }}
          />

          {/* Heritage Badge */}
          <div
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              zIndex: 5,
              padding: '8px 16px',
              borderRadius: 999,
              border: '1px solid rgba(200,152,48,.3)',
              background: 'rgba(14,11,8,.82)',
              backdropFilter: 'blur(16px)',
              color: '#f0d078',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: FONT_HEADING,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Sparkles size={14} className="text-[#c89830]" />
            <span>منسوجات وأوانٍ من الذاكرة المصرية</span>
          </div>

          {/* Interactive Hotspot Beacon Buttons */}
          {WALL_SYMBOLS.map((ws, index) => {
            const isActive = activeSymbol?.id === ws.id;

            return (
              <button
                key={ws.id}
                onClick={() => setActiveSymbol(isActive ? null : ws)}
                aria-label={ws.name}
                title={ws.name}
                style={{
                  position: 'absolute',
                  top: ws.top,
                  left: ws.left,
                  transform: `translate(-50%, -50%) ${isActive ? 'scale(1.2)' : 'scale(1)'}`,
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: `2px solid ${isActive ? '#fff4d4' : 'rgba(255,240,190,.85)'}`,
                  background: isActive
                    ? 'linear-gradient(135deg, #e8bc58, #c89830)'
                    : 'rgba(23, 15, 10, 0.85)',
                  color: isActive ? '#0e0b08' : '#f4d889',
                  cursor: 'pointer',
                  zIndex: 4,
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: FONT_HEADING,
                  fontSize: 12,
                  fontWeight: 900,
                  boxShadow: isActive
                    ? '0 0 0 10px rgba(200,152,48,.25), 0 0 35px rgba(200,152,48,.9)'
                    : '0 0 0 6px rgba(200,152,48,.12), 0 0 20px rgba(200,152,48,.6)',
                  animation: isActive ? 'none' : 'beaconPulse 2.8s ease-in-out infinite',
                  animationDelay: `${index * 0.4}s`,
                  transition: 'all .3s cubic-bezier(.16,1,.3,1)',
                }}
              >
                {index + 1}
              </button>
            );
          })}

          {/* Interactive Hotspot Inspection Card */}
          <div
            style={{
              position: 'absolute',
              left: !activeSymbol || parseInt(activeSymbol.left) > 50 ? 'clamp(16px, 3vw, 30px)' : 'auto',
              right: activeSymbol && parseInt(activeSymbol.left) <= 50 ? 'clamp(16px, 3vw, 30px)' : 'auto',
              bottom: 'clamp(16px, 3vw, 28px)',
              zIndex: 6,
              width: 'min(440px, calc(100% - 32px))',
              opacity: activeSymbol ? 1 : 0,
              transform: activeSymbol ? 'translateY(0)' : 'translateY(20px)',
              pointerEvents: activeSymbol ? 'auto' : 'none',
              transition: 'all .45s cubic-bezier(.16,1,.3,1)',
            }}
          >
            {activeSymbol && (
              <div
                key={activeSymbol.id}
                className="slide-up"
                style={{
                  padding: '22px 24px',
                  borderRadius: 22,
                  border: '1px solid rgba(200,152,48,.4)',
                  background: 'rgba(17, 12, 10, 0.96)',
                  backdropFilter: 'blur(24px)',
                  boxShadow: '0 24px 70px rgba(0,0,0,.8)',
                  position: 'relative',
                }}
              >
                {/* Close Button */}
                <button
                  onClick={() => setActiveSymbol(null)}
                  style={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    background: 'rgba(255,255,255,0.08)',
                    border: 'none',
                    color: '#f0e0c8',
                    cursor: 'pointer',
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  aria-label="إغلاق التفاصيل"
                >
                  <X size={15} />
                </button>

                <div
                  style={{
                    color: '#e8bc58',
                    fontSize: 11.5,
                    fontWeight: 700,
                    marginBottom: 6,
                    fontFamily: FONT_HEADING,
                  }}
                >
                  {activeSymbol.category} • القطعة {WALL_SYMBOLS.findIndex((item) => item.id === activeSymbol.id) + 1}
                </div>

                <h3
                  style={{
                    fontFamily: FONT_HEADING,
                    fontWeight: 900,
                    fontSize: 'clamp(20px, 2.2vw, 26px)',
                    color: '#fff8ee',
                    marginBottom: 10,
                  }}
                >
                  {activeSymbol.name}
                </h3>

                <p
                  style={{
                    fontFamily: FONT_BODY,
                    fontSize: 13.5,
                    lineHeight: 1.85,
                    color: 'rgba(255,230,200,.88)',
                    marginBottom: 14,
                  }}
                >
                  {activeSymbol.description}
                </p>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: 12,
                    borderTop: '1px solid rgba(200,152,48,.18)',
                    fontSize: 12,
                    color: 'rgba(200,152,48,.8)',
                    fontFamily: FONT_BODY,
                  }}
                >
                  <span>{activeSymbol.narrator}</span>
                  <Link
                    to="/map"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      color: '#f0d078',
                      fontWeight: 700,
                    }}
                  >
                    <span>استكشف في الخريطة</span>
                    <ArrowLeft size={13} />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Exploration 3-step Guide */}
        <div
          className="rv-l d2"
          style={{
            display: 'flex',
            gap: 'clamp(16px, 4vw, 40px)',
            justifyContent: 'center',
            marginTop: 24,
            flexWrap: 'wrap',
          }}
        >
          {[
            { icon: <Sparkles size={18} className="text-[#c89830]" />, text: 'اختر قطعة متوهجة' },
            { icon: <Volume2 size={18} className="text-[#c89830]" />, text: 'اكتشف حكايتها الشفوية' },
            { icon: <Heart size={18} className="text-[#c89830]" />, text: 'احفظها في ذاكرة تراثك' },
          ].map((step, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: 'rgba(255,230,200,.75)',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: FONT_BODY,
              }}
            >
              {step.icon}
              <span>{step.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          FOOTER & GRAND CALL TO ACTION
      ══════════════════════════════════════════════════════════════════ */}
      <footer
        style={{
          position: 'relative',
          padding: '90px 24px 60px',
          textAlign: 'center',
          borderTop: '1px solid rgba(200,152,48,.18)',
          background: 'linear-gradient(to bottom, #090705 0%, #0e0b08 100%)',
          overflow: 'hidden',
        }}
      >
        {/* Giant Watermark Lettering */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'min(30vw, 420px)',
            fontWeight: 900,
            color: 'rgba(200,152,48,.025)',
            letterSpacing: 'normal',
            lineHeight: 1.15,
            userSelect: 'none',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            fontFamily: FONT_HEADING,
          }}
        >
          حكاوي
        </div>

        <div className="rv-l" style={{ position: 'relative', zIndex: 2, maxWidth: 840, margin: '0 auto' }}>
          {/* Key Metrics Counter Strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 16,
              marginBottom: 44,
            }}
          >
            {[
              { val: '27', label: 'محافظة مصرية بتراثها ولهجتها' },
              { val: '+1,000', label: 'دقيقة حكايات وتاريخ شفهي' },
              { val: '98%', label: 'دقة الحفظ الصوتي بتقنيات AI' },
            ].map((stat, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(23, 18, 12, 0.7)',
                  border: '1px solid rgba(200,152,48,.22)',
                  borderRadius: 18,
                  padding: '18px 20px',
                }}
              >
                <div
                  style={{
                    color: '#e8bc58',
                    fontSize: 32,
                    fontWeight: 900,
                    fontFamily: FONT_HEADING,
                  }}
                >
                  {stat.val}
                </div>
                <div
                  style={{
                    color: 'rgba(255,230,200,.7)',
                    fontSize: 12.5,
                    marginTop: 4,
                    fontFamily: FONT_BODY,
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              fontSize: 'clamp(17px, 2vw, 22px)',
              fontWeight: 800,
              color: '#c89830',
              marginBottom: 12,
              fontFamily: FONT_HEADING,
            }}
          >
            حكاوي — لأن صوت الماضي يجب أن يعيش في الحاضر ويكمل في المستقبل
          </div>

          <h2
            className="font-heading"
            style={{
              fontSize: 'clamp(38px, 6vw, 84px)',
              fontWeight: 900,
              letterSpacing: 'normal',
              lineHeight: 1.1,
              marginBottom: 20,
              color: '#fff8ee',
              fontFamily: FONT_HEADING,
            }}
          >
            ابدأ رحلتك الآن.
          </h2>

          <p
            style={{
              color: 'rgba(255,225,185,.8)',
              fontSize: 16.5,
              marginBottom: 36,
              lineHeight: 1.8,
              fontFamily: FONT_BODY,
              maxWidth: 620,
              margin: '0 auto 36px',
            }}
          >
            اختر محافظة على الخريطة، تحدث مع حراس التراث بلهجتهم الأم، وسجّل صوت أجدادك ليبقى حيًّا
            مع كل الأجيال.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Link
              to="/map"
              className="btn hover-lift"
              style={{
                fontSize: 16,
                padding: '16px 36px',
                background: 'linear-gradient(135deg, #e8bc58 0%, #c89830 100%)',
                color: '#0e0b08',
                boxShadow: '0 10px 36px rgba(200,152,48,.35)',
                fontWeight: 800,
              }}
            >
              <span>ادخل إلى حكاوي</span>
              <ArrowLeft size={16} />
            </Link>

            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="btn hover-lift"
              style={{
                fontSize: 14,
                padding: '16px 24px',
                background: 'rgba(23, 18, 12, 0.8)',
                border: '1px solid rgba(200,152,48,.3)',
                color: '#f0e0c8',
              }}
              aria-label="العودة لأعلى الصفحة"
            >
              <ArrowUp size={15} className="text-[#c89830]" />
              <span>العودة للأعلى</span>
            </button>
          </div>

          <div
            style={{
              marginTop: 60,
              paddingTop: 24,
              borderTop: '1px solid rgba(200,152,48,.12)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              color: 'rgba(200,152,48,.45)',
              fontSize: 12,
              letterSpacing: '.06em',
            }}
          >
            <div>منصة حكاوي (Hikawi) © 2026 — جميع الحقوق محفوظة للتراث المصري</div>
            <div>Cairo University · AI Nexus Hackathon 2026</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
