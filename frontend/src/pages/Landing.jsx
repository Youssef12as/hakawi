import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mic, ChevronDown } from 'lucide-react';

/* ─── Regions ─────────────────────────────────────────────────────────────── */
const REGIONS = [
  {
    key: 'aswan',
    name: 'أسوان والنوبة',
    nameEn: 'Aswan & Nubia',
    elderName: 'عم عثمان',
    elderTitle: 'حارس أسرار النوبة',
    quote: 'الكليم مش بس نسيج، ده لغة. كل رمز فيه بيحكي حكاية من جداتنا.',
    image: '/assets/char-aswan.png',
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
    image: '/assets/char-luxor.png',
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
    image: '/assets/char-cairo.png',
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
    image: '/assets/char-alexandria.png',
    accent: '#3a90a0',
    accentDim: 'rgba(58,144,160,0.18)',
    bg: 'linear-gradient(135deg, #020c10 0%, #051520 50%, #020c10 100%)',
    tagColor: '#50b0c8',
    mapCx: 95, mapCy: 58,
  },
];

const BARS = Array.from({ length: 36 }, (_, i) => ({ i, h: 10 + Math.random() * 44 }));

/* ─── Hooks ───────────────────────────────────────────────────────────────── */
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
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('in'); }),
      { threshold: 0.1 }
    );
    ref.current.querySelectorAll('.rv').forEach((el) => io.observe(el));
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
  const [animKey, setAnimKey]     = useState(0); // forces re-mount for animation
  const cycleRef = useRef(null);

  const goTo = useCallback((idx) => {
    clearInterval(cycleRef.current);
    setActiveIdx(idx);
    setAnimKey((k) => k + 1);
    cycleRef.current = setInterval(() => {
      setActiveIdx((p) => { const next = (p + 1) % REGIONS.length; return next; });
      setAnimKey((k) => k + 1);
    }, 5000);
  }, []);

  useEffect(() => {
    cycleRef.current = setInterval(() => {
      setActiveIdx((p) => (p + 1) % REGIONS.length);
      setAnimKey((k) => k + 1);
    }, 5000);
    return () => clearInterval(cycleRef.current);
  }, []);

  const region = REGIONS[activeIdx];

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
    <div ref={pageRef} dir="rtl" style={{ fontFamily: '"Segoe UI",Tahoma,Arial,sans-serif', background: '#0e0b08', color: '#f0e0c8', overflowX: 'hidden' }}>

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

        /* scroll reveal */
        .rv { opacity: 0; transform: translateY(36px); transition: opacity .85s cubic-bezier(.16,1,.3,1), transform .85s cubic-bezier(.16,1,.3,1); }
        .rv.in { opacity: 1; transform: none; }
        .rv.d1 { transition-delay: .1s; }
        .rv.d2 { transition-delay: .22s; }
        .rv.d3 { transition-delay: .34s; }

        /* slide-up for region content switch */
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .slide-up { animation: slideUp .5s cubic-bezier(.16,1,.3,1) forwards; }

        /* eyebrow */
        .ey { display: inline-flex; align-items: center; gap: 10px; font-size: 11px; font-weight: 800; letter-spacing: .2em; text-transform: uppercase; margin-bottom: 14px; }
        .ey::before { content: ""; width: 28px; height: 1px; background: currentColor; }

        /* quote */
        .qt { margin-top: 20px; padding: 16px 20px; font-size: 16px; line-height: 1.85; border-right: 2px solid currentColor; font-style: italic; border-radius: 0 8px 8px 0; }

        /* buttons */
        .btn { display: inline-flex; align-items: center; gap: 8px; border: 0; padding: 13px 22px; border-radius: 999px; cursor: pointer; font-family: inherit; font-size: 14px; font-weight: 700; transition: .25s ease; }
        .btn:hover { transform: translateY(-2px); }

        /* nile */
        @keyframes nile { to { stroke-dashoffset: -180; } }

        /* wave */
        @keyframes wvAnim { from { transform: scaleY(.2); } to { transform: scaleY(1); } }

        /* float anim */
        @keyframes floatImg { 0%,100% { transform: translateY(0px) rotate(-.5deg); } 50% { transform: translateY(-14px) rotate(.5deg); } }

        /* scroll pulse */
        @keyframes scrollPulse { 0%,100% { opacity: .2; transform: scaleY(.3); transform-origin: top; } 50% { opacity: .8; transform: scaleY(1); transform-origin: top; } }

        /* grid */
        .g2 { display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: clamp(32px,6vw,80px); padding: 90px clamp(20px,7vw,100px); }
        @media (max-width: 860px) { .g2 { grid-template-columns: 1fr; padding: 70px 20px; } }
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; } .rv { opacity: 1; transform: none; } }
      `}</style>

      <div className="grain" />

      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, right: 0, left: 0, zIndex: 500, height: 70,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(18px,5vw,72px)',
        background: scrollY > 30 ? 'rgba(14,11,8,.9)' : 'transparent',
        backdropFilter: scrollY > 30 ? 'blur(20px)' : 'none',
        borderBottom: `1px solid ${scrollY > 30 ? 'rgba(255,220,140,.08)' : 'transparent'}`,
        transition: '.35s ease',
      }}>
        <Link to="/" style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-.04em', color: '#f0e0c8' }}>
          حكاوي<span style={{ color: '#c89830' }}>.</span>
        </Link>
        <div style={{ display: 'flex', gap: 28, color: 'rgba(240,224,200,.5)', fontSize: 13 }}>
          <a href="#chars" style={{ transition: '.2s' }}>الشخصيات</a>
          <a href="#voice" style={{ transition: '.2s' }}>صوت حبايبك</a>
          <a href="#kids"  style={{ transition: '.2s' }}>التعلّم</a>
        </div>
        <Link to="/map" style={{ border: '1px solid rgba(200,152,48,.4)', background: 'rgba(200,152,48,.1)', color: '#c89830', padding: '9px 18px', borderRadius: 999, fontSize: 13, fontWeight: 700 }}>
          ابدأ رحلتك
        </Link>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ position: 'relative', minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#0e0b08' }}>

        {/* Parallax illustration — الأهرامات — visible! */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '70%',
          backgroundImage: 'url(/image/background.png)',
          backgroundSize: '100% auto',
          backgroundPosition: 'center bottom',
          backgroundRepeat: 'no-repeat',
          opacity: .22,
          filter: 'sepia(.6) brightness(.65) saturate(1.4)',
          transform: `translateY(${scrollY * 0.25}px)`,
        }} />

        {/* Gradient overlays */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, #0e0b08 0%, rgba(14,11,8,.3) 35%, rgba(14,11,8,.5) 65%, #0e0b08 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 40%, rgba(200,152,48,.06) 0%, transparent 60%)' }} />

        {/* Ship floating */}
        <img src="/image/ship.png" alt="" style={{
          position: 'absolute', right: '5%', bottom: '14%',
          width: 'clamp(130px,14vw,220px)',
          opacity: .18, filter: 'sepia(.5) brightness(.75) saturate(1.3)',
          animation: 'floatImg 8s ease-in-out infinite',
          pointerEvents: 'none',
          transform: `translateY(${scrollY * -0.1}px)`,
        }} />

        {/* Hieroglyph symbols */}
        {['𓂀', '𓋹', '𓆣', '△', '𓏏'].map((s, i) => (
          <span key={i} style={{
            position: 'absolute', color: '#c89830',
            opacity: .08 + i * .015,
            fontSize: `${1.1 + i % 3 * 0.5}rem`,
            left: `${5 + i * 19}%`, top: `${12 + i % 3 * 20}%`,
            animation: `floatImg ${7 + i * 1.3}s ease-in-out ${i * .8}s infinite alternate`,
            pointerEvents: 'none', userSelect: 'none',
          }}>{s}</span>
        ))}

        {/* Hero text */}
        <div className="rv in" style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 20px', paddingTop: 70 }}>
          <div className="ey" style={{ justifyContent: 'center', color: '#c89830', marginBottom: 18 }}>
            مصر كما يرويها أهلها
          </div>
          <h1 style={{
            fontSize: 'clamp(5rem,18vw,12rem)', fontWeight: 900, lineHeight: .88,
            letterSpacing: '-.07em', color: '#f0ddb8',
            textShadow: '0 0 100px rgba(200,152,48,.2), 0 4px 30px rgba(0,0,0,.8)',
          }}>
            حكاوي
          </h1>
          <p style={{ color: 'rgba(240,210,160,.55)', fontSize: 'clamp(15px,1.5vw,19px)', marginTop: 16 }}>
            صوت الماضي، حيّ في الحاضر
          </p>
          <p style={{ color: 'rgba(200,152,48,.3)', fontSize: 11, marginTop: 6, letterSpacing: '.2em', textTransform: 'uppercase' }}>
            The voice of the past · alive in the present
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 40 }}>
            <Link to="/map" className="btn" style={{ background: '#c89830', color: '#0e0b08', boxShadow: '0 10px 32px rgba(200,152,48,.3)' }}>
              استكشف الخريطة <ArrowLeft size={15} />
            </Link>
            <Link to="/family" className="btn" style={{ background: 'transparent', border: '1px solid rgba(240,210,160,.2)', color: '#f0ddb8' }}>
              <Mic size={14} /> سجّل صوت عيلتك
            </Link>
          </div>
        </div>

        {/* Scroll hint */}
        <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', color: 'rgba(200,152,48,.4)', fontSize: 10, letterSpacing: '.18em', zIndex: 2 }}>
          <ChevronDown size={20} style={{ animation: 'scrollPulse 1.8s ease-in-out infinite', display: 'block', margin: '0 auto' }} />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 1 — الشخصيات  (Scroll Storytelling)
      ══════════════════════════════════════════════════════════════════ */}
      <section id="chars" style={{
        position: 'relative', overflow: 'hidden',
        minHeight: '100svh', display: 'flex', alignItems: 'center',
        background: region.bg,
        transition: 'background .8s ease',
        borderTop: '1px solid rgba(255,220,140,.06)',
      }}>

        {/* Temple illustration — decorative, visible */}
        <img src="/image/mamar.png" alt="" style={{
          position: 'absolute', left: 0, bottom: 0,
          width: 'clamp(200px,32vw,500px)',
          opacity: .14, filter: 'sepia(.4) brightness(.7) saturate(1.5)',
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

        <div className="g2" style={{ width: '100%', position: 'relative', zIndex: 2 }}>

          {/* ── Left: Copy ─────────────────────────────────────────── */}
          <div>
            <div className="rv ey" style={{ color: region.accent }}>01 — شخصيات من كل ركن</div>

            {/* Animated content — slides up when region changes */}
            <div key={`name-${animKey}`} className="slide-up">
              <h2 style={{
                fontSize: 'clamp(38px,5vw,70px)', fontWeight: 900, lineHeight: 1.02,
                letterSpacing: '-.05em', color: region.accent,
                textShadow: `0 0 60px ${region.accentDim}`,
              }}>{region.name}</h2>
              <p style={{ color: 'rgba(240,210,160,.45)', fontSize: 13, marginTop: 4 }}>{region.nameEn}</p>
            </div>

            <div key={`quote-${animKey}`} className="slide-up" style={{ animationDelay: '.08s' }}>
              <blockquote className="qt" style={{ color: 'rgba(240,210,160,.8)', borderColor: region.accent, background: `linear-gradient(90deg, ${region.accentDim}, transparent)` }}>
                "{region.quote}"
                <small style={{ display: 'block', marginTop: 10, fontStyle: 'normal', color: 'rgba(240,210,160,.45)', fontSize: 12 }}>
                  — {region.elderName}، {region.elderTitle}
                </small>
              </blockquote>
            </div>

            {/* Region tabs */}
            <div className="rv d2" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 24 }}>
              {REGIONS.map((r, i) => (
                <button key={r.key} onClick={() => goTo(i)} style={{
                  padding: '8px 16px', borderRadius: 999, fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', border: 'none', fontFamily: 'inherit', transition: '.25s ease',
                  background: activeIdx === i ? r.accent : 'rgba(255,255,255,.06)',
                  color: activeIdx === i ? '#0e0b08' : 'rgba(240,210,160,.5)',
                  boxShadow: activeIdx === i ? `0 0 24px ${r.accentDim}` : 'none',
                  transform: activeIdx === i ? 'scale(1.05)' : 'scale(1)',
                }}>{r.name}</button>
              ))}
            </div>

            <div className="rv d3" style={{ marginTop: 28 }}>
              <Link to="/map" className="btn" style={{ background: region.accent, color: '#0e0b08', boxShadow: `0 8px 28px ${region.accentDim}` }}>
                تحدث مع الشخصية <ArrowLeft size={14} />
              </Link>
            </div>
          </div>

          {/* ── Right: Photo + Map ──────────────────────────────────── */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, minHeight: 480 }}>

            {/* Glow behind photo */}
            <div key={`glow-${animKey}`} className="slide-up" style={{
              position: 'absolute', inset: 0,
              background: `radial-gradient(ellipse at 45% 50%, ${region.accentDim} 0%, transparent 65%)`,
              transition: 'background .8s ease', pointerEvents: 'none',
            }} />

            {/* Character photo — clearly visible */}
            <div key={`photo-${animKey}`} className="slide-up" style={{ position: 'relative', zIndex: 1 }}>
              <img
                src={region.image}
                alt={region.elderName}
                style={{
                  width: 'clamp(200px,22vw,290px)',
                  aspectRatio: '3/4',
                  objectFit: 'cover',
                  borderRadius: 22,
                  border: `2px solid ${region.accent}40`,
                  boxShadow: `0 0 70px ${region.accentDim}, 0 24px 60px rgba(0,0,0,.7)`,
                  filter: 'saturate(.9) brightness(.95)',
                }}
              />
              {/* Name tag */}
              <div style={{
                position: 'absolute', bottom: -14, left: '50%', transform: 'translateX(-50%)',
                whiteSpace: 'nowrap', zIndex: 2,
                background: 'rgba(14,11,8,.92)', backdropFilter: 'blur(12px)',
                border: `1px solid ${region.accent}35`, borderRadius: 999,
                padding: '6px 14px', fontSize: 12, color: region.tagColor,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: region.accent, display: 'inline-block', animation: 'scrollPulse 2s ease-in-out infinite' }} />
                {region.elderName}
              </div>
            </div>

            {/* Mini map */}
            <div className="rv d1" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <svg viewBox="0 0 260 500" style={{ width: 'clamp(75px,9vw,115px)', filter: 'drop-shadow(0 8px 20px rgba(0,0,0,.5))' }}>
                <path d="M88 17L162 35L166 112L184 145L169 199L203 269L177 335L148 409L136 481L103 466L85 390L70 315L76 239L62 177L79 111L73 58Z"
                  fill="rgba(14,11,8,.85)" stroke="rgba(200,152,48,.3)" strokeWidth="1.6" />
                <path d="M124 49C151 96 101 126 134 171C166 215 112 257 144 301C169 336 118 379 128 447"
                  fill="none" stroke="rgba(90,160,190,.55)" strokeWidth="2.5" strokeLinecap="round"
                  strokeDasharray="5 9" style={{ animation: 'nile 6s linear infinite' }} />
                {REGIONS.map((r) => (
                  <g key={r.key}
                    style={{ cursor: 'pointer', transformBox: 'fill-box', transformOrigin: 'center', transition: '.28s ease', transform: region.key === r.key ? 'scale(1.5)' : 'scale(1)' }}
                    onClick={() => goTo(REGIONS.indexOf(r))}>
                    <circle cx={r.mapCx} cy={r.mapCy} r={7}
                      fill={region.key === r.key ? r.accent : 'rgba(200,152,48,.2)'}
                      stroke={region.key === r.key ? r.accent : 'rgba(200,152,48,.4)'}
                      strokeWidth="2" />
                  </g>
                ))}
              </svg>
              <p style={{ fontSize: 9, color: 'rgba(200,152,48,.4)', letterSpacing: '.12em', textTransform: 'uppercase' }}>اضغط للتنقل</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 2 — صوت حبايبك
      ══════════════════════════════════════════════════════════════════ */}
      <section id="voice" style={{
        position: 'relative', overflow: 'hidden',
        minHeight: '100svh', display: 'flex', alignItems: 'center',
        background: 'linear-gradient(135deg, #0e0608 0%, #180a0a 50%, #0e0608 100%)',
        borderTop: '1px solid rgba(255,220,140,.06)',
      }}>

        {/* Hieroglyphic stone — clearly visible */}
        <img src="/image/noqush.png" alt="" style={{
          position: 'absolute', right: '-4%', top: '8%',
          width: 'clamp(220px,32vw,480px)',
          opacity: .12, filter: 'sepia(.3) brightness(.7) saturate(1.5)',
          transform: `translateY(${(scrollY - 1500) * -0.07}px)`,
          pointerEvents: 'none',
          animation: 'floatImg 11s ease-in-out infinite',
        }} />

        <div className="g2" style={{ width: '100%', position: 'relative', zIndex: 2 }}>

          {/* Visual */}
          <div style={{ position: 'relative', minHeight: 460, display: 'grid', placeItems: 'center' }}>
            {/* Memory photo card */}
            <div className="rv" style={{
              position: 'relative', width: 'min(90%,500px)', aspectRatio: '1.2',
              borderRadius: 22, overflow: 'hidden',
              border: '1px solid rgba(200,100,80,.15)',
              boxShadow: '0 28px 70px rgba(0,0,0,.7)',
              background: 'linear-gradient(160deg, #5a3020, #1c0e0a)',
            }}>
              {/* CSS person silhouette */}
              <div style={{ position: 'absolute', width: 130, height: 165, borderRadius: '50% 50% 42% 42%', top: 72, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(#9a6048,#58281a)', boxShadow: '0 96px 0 56px #3c1e12, 0 -15px 0 10px #c8a070' }} />
              <div style={{ position: 'absolute', right: 22, bottom: 20, left: 22, zIndex: 3 }}>
                <span style={{ display: 'block', color: 'rgba(200,120,80,.7)', fontSize: 11, marginBottom: 6 }}>ذاكرة عائلية — ١٩٧٨</span>
                <strong style={{ fontSize: 'clamp(15px,1.8vw,21px)', lineHeight: 1.55, color: 'rgba(240,210,180,.85)', fontWeight: 700 }}>
                  "كان كل بيت له حكاية،<br />وكل حكاية تبدأ من القعدة."
                </strong>
              </div>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,.7))' }} />
            </div>

            {/* Audio panel */}
            <div className="rv d1" style={{
              position: 'absolute', right: -20, top: '50%', transform: 'translateY(-50%)',
              width: 'min(78%,340px)', padding: '14px 16px',
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
              <div style={{ marginTop: 9, display: 'flex', justifyContent: 'space-between', color: 'rgba(200,152,48,.5)', fontSize: 11 }}>
                <span>صوت من ذاكرة الأسرة</span>
                <span>{fmt(elapsed)} / {fmt(TOTAL)}</span>
              </div>
            </div>
          </div>

          {/* Copy */}
          <div>
            <div className="rv ey" style={{ color: '#b05040' }}>02 — صوت حبايبك</div>
            <h2 className="rv d1" style={{ fontSize: 'clamp(36px,5vw,68px)', fontWeight: 900, lineHeight: 1.04, letterSpacing: '-.05em' }}>
              الصوت الذي تحبه<br />
              <span style={{ color: '#c04040' }}>لا يختفي.</span>
            </h2>
            <p className="rv d2" style={{ color: 'rgba(240,210,160,.55)', fontSize: 'clamp(14px,1.2vw,17px)', lineHeight: 1.9, marginTop: 18 }}>
              نسجّل صوت شخص عزيز، ثم نحفظ نبرته ولهجته داخل تجربة تسمح للعائلة أن تسمع حكاياته مرة أخرى.
            </p>
            <div className="rv d2 qt" style={{ color: 'rgba(240,210,160,.75)', borderColor: '#b05040', background: 'linear-gradient(90deg, rgba(176,80,64,.1), transparent)' }}>
              "سجّل صوت جدك قبل ما يختفي للأبد."
            </div>
            <div className="rv d3" style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 9 }}>
              {['سجّل صوت أي شخص بأي لهجة', 'الـ AI يحفظ نبرته وشخصيته', 'يتكلم مع عيلتك في المناسبات'].map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'rgba(240,210,160,.45)', fontSize: 13 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#c04040', flexShrink: 0 }} />
                  {t}
                </div>
              ))}
            </div>
            <div className="rv d3" style={{ marginTop: 26 }}>
              <Link to="/family" className="btn" style={{ background: '#b05040', color: '#fff', boxShadow: '0 8px 28px rgba(176,80,64,.3)' }}>
                <Mic size={14} /> ابدأ التسجيل
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 3 — التعليم
      ══════════════════════════════════════════════════════════════════ */}
      <section id="kids" style={{
        position: 'relative', overflow: 'hidden',
        minHeight: '80svh', display: 'flex', alignItems: 'center',
        background: 'linear-gradient(135deg, #060a10 0%, #0a1220 50%, #060a10 100%)',
        borderTop: '1px solid rgba(255,220,140,.06)',
      }}>
        {/* Ramz scroll — visible */}
        <img src="/image/ramz.png" alt="" style={{
          position: 'absolute', left: '2%', bottom: '6%',
          width: 'clamp(150px,20vw,300px)',
          opacity: .14, filter: 'sepia(.3) brightness(.7) saturate(1.5)',
          transform: `translateY(${(scrollY - 2400) * -0.06}px)`,
          pointerEvents: 'none',
          animation: 'floatImg 10s ease-in-out 1.5s infinite',
        }} />

        <div style={{ width: '100%', maxWidth: 940, margin: '0 auto', padding: '88px clamp(20px,6vw,80px)', textAlign: 'center', position: 'relative', zIndex: 2 }}>
          <div className="rv ey" style={{ justifyContent: 'center', color: '#3a90c0' }}>03 — التعليم والأطفال</div>
          <h2 className="rv d1" style={{ fontSize: 'clamp(36px,5vw,68px)', fontWeight: 900, letterSpacing: '-.05em', lineHeight: 1.04 }}>
            التاريخ يتحول إلى <span style={{ color: '#3a90c0' }}>مغامرة.</span>
          </h2>
          <p className="rv d2" style={{ color: 'rgba(240,210,160,.5)', fontSize: 'clamp(14px,1.2vw,17px)', lineHeight: 1.9, maxWidth: 560, margin: '16px auto 28px' }}>
            الطفل لا يشاهد معلومة فقط؛ يختار طريقًا، يفتح بوابة، يقابل شخصية، ويكتشف تراث كل منطقة بطريقة تفاعلية.
          </p>
          <div className="rv d2" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 28 }}>
            {['قصص الأقصر', 'رموز النوبة', 'الأبجدية الهيروغليفية', 'أساطير الإسكندرية', 'حكايات القاهرة'].map(tag => (
              <span key={tag} style={{ padding: '7px 15px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: 'rgba(58,144,192,.12)', border: '1px solid rgba(58,144,192,.25)', color: '#5ab0d8' }}>{tag}</span>
            ))}
          </div>
          <div className="rv d3">
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
          letterSpacing: '-.08em', userSelect: 'none', pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>حكاوي</div>

        {/* Ship footer */}
        <img src="/image/ship.png" alt="" style={{
          position: 'absolute', left: '3%', bottom: '6%',
          width: 'clamp(100px,13vw,190px)',
          opacity: .1, filter: 'sepia(.4) brightness(.7)',
          pointerEvents: 'none',
          animation: 'floatImg 7s ease-in-out infinite',
        }} />

        <div className="rv" style={{ position: 'relative', zIndex: 2, maxWidth: 700 }}>
          <div className="ey" style={{ justifyContent: 'center', color: '#c89830' }}>جاهز تبدأ؟</div>
          <h2 style={{ fontSize: 'clamp(44px,7.5vw,98px)', fontWeight: 900, letterSpacing: '-.068em', lineHeight: .9, marginBottom: 18, color: '#f0ddb8' }}>
            ابدأ رحلتك.
          </h2>
          <p style={{ color: 'rgba(240,210,160,.45)', fontSize: 16, marginBottom: 30, lineHeight: 1.75 }}>
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
