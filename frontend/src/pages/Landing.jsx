import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mic } from 'lucide-react';

/* ─── Region data ─────────────────────────────────────────────────────────── */
const REGIONS = [
  {
    key: 'aswan',
    name: 'أسوان والنوبة',
    nameEn: 'Aswan & Nubia',
    elderName: 'عم عثمان',
    elderTitle: 'حارس أسرار النوبة',
    quote: 'الكليم مش بس نسيج، ده لغة. كل رمز فيه بيحكي حكاية من جداتنا.',
    image: '/assets/char-aswan.png',
    accent: '#c47a3a',
    glow: 'rgba(196,122,58,0.28)',
    bg: 'radial-gradient(circle at 70% 50%,rgba(196,122,58,.15),transparent 45%), linear-gradient(145deg,#100800,#1a0e05)',
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
    accent: '#b8962a',
    glow: 'rgba(184,150,42,0.28)',
    bg: 'radial-gradient(circle at 70% 50%,rgba(184,150,42,.14),transparent 45%), linear-gradient(145deg,#0c0800,#181204)',
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
    accent: '#4a8aaa',
    glow: 'rgba(74,138,170,0.25)',
    bg: 'radial-gradient(circle at 70% 50%,rgba(74,138,170,.13),transparent 45%), linear-gradient(145deg,#03080d,#060f18)',
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
    accent: '#3a8090',
    glow: 'rgba(58,128,144,0.25)',
    bg: 'radial-gradient(circle at 70% 50%,rgba(58,128,144,.13),transparent 45%), linear-gradient(145deg,#030a0d,#050e12)',
    mapCx: 95, mapCy: 58,
  },
];

/* ─── Wave bars (generated once) ─────────────────────────────────────────── */
const BARS = Array.from({ length: 40 }, (_, i) => ({
  i,
  h: 10 + Math.random() * 44,
}));

/* ─── Reveal on scroll ────────────────────────────────────────────────────── */
function useReveal(ref) {
  useEffect(() => {
    if (!ref.current) return;
    const els = ref.current.querySelectorAll('.reveal');
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.14 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ref]);
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function Landing() {
  const pageRef = useRef(null);
  useReveal(pageRef);

  /* nav blur on scroll */
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  /* auto-cycling region */
  const [activeIdx, setActiveIdx] = useState(0);
  const [fading, setFading]       = useState(false);
  const intervalRef = useRef(null);

  const goTo = useCallback((idx) => {
    clearInterval(intervalRef.current);
    setFading(true);
    setTimeout(() => { setActiveIdx(idx); setFading(false); }, 320);
    intervalRef.current = setInterval(() => {
      setFading(true);
      setTimeout(() => { setActiveIdx((p) => (p + 1) % REGIONS.length); setFading(false); }, 320);
    }, 4500);
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setFading(true);
      setTimeout(() => { setActiveIdx((p) => (p + 1) % REGIONS.length); setFading(false); }, 320);
    }, 4500);
    return () => clearInterval(intervalRef.current);
  }, []);

  const region = REGIONS[activeIdx];

  /* waveform player */
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  const TOTAL = 18;
  const fmt   = (s) => `00:${String(s).padStart(2, '0')}`;

  const togglePlay = () => {
    setPlaying((prev) => {
      const next = !prev;
      if (next) {
        timerRef.current = setInterval(() => {
          setElapsed((e) => {
            if (e >= TOTAL - 1) { clearInterval(timerRef.current); setPlaying(false); return 0; }
            return e + 1;
          });
        }, 1000);
      } else {
        clearInterval(timerRef.current);
      }
      return next;
    });
  };

  return (
    <div ref={pageRef} dir="rtl" style={{ fontFamily: '"Segoe UI",Tahoma,Arial,sans-serif', overflowX: 'hidden', background: '#0d0a08', color: '#f8ecd3' }}>

      {/* ── Global CSS ─────────────────────────────────────────────────────── */}
      <style>{`
        :root{
          --gold:#c4a06a; --muted:#a89880; --line:rgba(196,160,106,.14);
          --shadow:0 28px 70px rgba(0,0,0,.5);
        }
        *{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        a{text-decoration:none;color:inherit}

        /* grain */
        .hk-grain{position:fixed;inset:-50%;z-index:200;pointer-events:none;opacity:.048;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          animation:hkGrain .25s steps(2) infinite}
        @keyframes hkGrain{
          0%{transform:translate(0,0)}25%{transform:translate(2%,-3%)}
          50%{transform:translate(-3%,2%)}75%{transform:translate(3%,3%)}
          100%{transform:translate(-2%,-2%)}
        }

        /* scroll reveal */
        .reveal{opacity:0;transform:translateY(38px);
          transition:opacity .85s ease,transform .85s cubic-bezier(.18,.75,.18,1)}
        .reveal.visible{opacity:1;transform:none}

        /* eyebrow */
        .eyebrow{display:inline-flex;align-items:center;gap:10px;color:var(--gold);
          font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;margin-bottom:18px}
        .eyebrow::before{content:"";width:32px;height:1px;background:var(--gold)}

        /* quote */
        .hk-quote{margin-top:24px;padding:18px 20px;
          border-right:3px solid var(--gold);
          background:linear-gradient(90deg,rgba(196,160,106,.08),transparent);
          color:#e8d8b8;font-size:17px;line-height:1.8;border-radius:0 10px 10px 0;font-style:italic}

        /* buttons */
        .btn{border:0;padding:14px 24px;border-radius:999px;cursor:pointer;
          transition:.25s ease;font-family:inherit;font-size:15px;display:inline-flex;align-items:center;gap:8px}
        .btn-gold{background:var(--gold);color:#1a1008;font-weight:800;
          box-shadow:0 12px 30px rgba(196,160,106,.2)}
        .btn-gold:hover{transform:translateY(-3px);box-shadow:0 18px 40px rgba(196,160,106,.3)}
        .btn-outline{background:transparent;border:1px solid var(--line);color:#f8ecd3}
        .btn-outline:hover{border-color:var(--gold);color:var(--gold)}

        /* map pin */
        .hk-pin{cursor:pointer;transform-box:fill-box;transform-origin:center;transition:.3s ease}
        .hk-pin circle{transition:.3s ease}
        .hk-pin text{opacity:0;transition:.2s ease;pointer-events:none;fill:#f8ecd3;font-size:9px}
        .hk-pin:hover text,.hk-pin.active text{opacity:1}
        .hk-pin:hover,.hk-pin.active{transform:scale(1.5)}

        /* character image */
        .char-img{transition:opacity .32s ease,transform .32s ease}
        .char-img.fading{opacity:0;transform:scale(.97) translateY(8px)}

        /* region tabs */
        .rtab{transition:.25s ease;cursor:pointer;border:1px solid transparent}
        .rtab:hover{border-color:var(--line)}

        /* waveform */
        @keyframes waveAnim{from{transform:scaleY(.22)}to{transform:scaleY(1)}}

        /* nile */
        @keyframes river{to{stroke-dashoffset:-190}}

        /* floating notes */
        @keyframes noteFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}

        /* scroll mark */
        @keyframes scrollPulse{
          0%,100%{transform:scaleY(.25);opacity:.2;transform-origin:top}
          50%{transform:scaleY(1);opacity:.8;transform-origin:top}
        }

        /* section grid */
        .hk-2col{display:grid;grid-template-columns:1fr 1fr;align-items:center;
          gap:clamp(30px,6vw,90px);padding:100px clamp(22px,6vw,100px)}
        @media(max-width:900px){
          .hk-2col{grid-template-columns:1fr;padding:80px 24px}
          .hk-float-note{display:none}
          .hk-orb{width:75vw!important}
          .char-col{min-height:320px!important}
        }
        @media(prefers-reduced-motion:reduce){*{animation:none!important}.reveal{opacity:1;transform:none}}
      `}</style>

      {/* grain */}
      <div className="hk-grain" />

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, right: 0, left: 0, zIndex: 100, height: 72,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(20px,5vw,72px)',
        background: scrolled ? 'rgba(13,10,8,.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(18px)' : 'none',
        borderBottom: `1px solid ${scrolled ? 'var(--line)' : 'transparent'}`,
        transition: '.35s ease',
      }}>
        <Link to="/" style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-.04em' }}>
          حكاوي<span style={{ color: 'var(--gold)' }}>.</span>
        </Link>
        <div style={{ display: 'flex', gap: 28, color: 'rgba(248,236,211,.6)', fontSize: 13 }}>
          <a href="#characters">الشخصيات</a>
          <a href="#voice">صوت حبايبك</a>
          <a href="#learn">التعلّم</a>
        </div>
        <Link to="/map" style={{
          border: '1px solid rgba(196,160,106,.4)', background: 'rgba(196,160,106,.08)',
          color: 'var(--gold)', padding: '9px 18px', borderRadius: 999, fontSize: 13, fontWeight: 700,
        }}>ابدأ رحلتك</Link>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ position: 'relative', minHeight: '100svh', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
        {/* Hero BG image — dark + muted */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/assets/hero-egypt-night.png)',
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: 0.28, filter: 'saturate(.5)',
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#0d0a08 0%,rgba(13,10,8,.4) 40%,#0d0a08 100%)' }} />

        {/* Floating hieroglyphs */}
        {['𓂀','𓋹','△','𓆣','✦'].map((s, i) => (
          <span key={i} style={{
            position: 'absolute', color: 'var(--gold)', opacity: .06 + i * .01,
            fontSize: `${1.1 + (i % 3) * 0.5}rem`, userSelect: 'none', pointerEvents: 'none',
            left: `${8 + i * 18}%`, top: `${12 + (i % 3) * 22}%`,
            animation: `noteFloat ${6 + i * 1.4}s ease-in-out ${i * 0.7}s infinite alternate`,
          }}>{s}</span>
        ))}

        {/* Content */}
        <div className="reveal visible" style={{ position: 'relative', zIndex: 2, width: '100%', textAlign: 'center', padding: '0 24px', paddingTop: 80 }}>
          <div className="eyebrow" style={{ justifyContent: 'center' }}>مصر كما يرويها أهلها</div>
          <h1 style={{
            fontSize: 'clamp(5rem,18vw,11rem)', fontWeight: 900, lineHeight: .92,
            letterSpacing: '-.065em', color: '#f5e6c8',
            textShadow: '0 0 80px rgba(196,160,106,.2), 0 4px 20px rgba(0,0,0,.7)',
          }}>حكاوي</h1>
          <p style={{ color: 'rgba(196,175,140,.55)', fontSize: 'clamp(16px,1.6vw,20px)', marginTop: 16, letterSpacing: '.02em' }}>
            صوت الماضي، حيّ في الحاضر
          </p>
          <p style={{ color: 'rgba(196,175,140,.25)', fontSize: 12, marginTop: 6, letterSpacing: '.2em', textTransform: 'uppercase' }}>
            The voice of the past, alive in the present
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginTop: 36 }}>
            <Link to="/map"    className="btn btn-gold">استكشف الخريطة <ArrowLeft size={16} /></Link>
            <Link to="/family" className="btn btn-outline"><Mic size={15} /> سجّل صوت عيلتك</Link>
          </div>
        </div>

        {/* Scroll mark */}
        <div style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', color: 'rgba(248,236,211,.3)', fontSize: 11, letterSpacing: '.14em', zIndex: 2 }}>
          اسحب للأسفل
          <div style={{ width: 1, height: 32, margin: '8px auto 0', background: 'linear-gradient(var(--gold),transparent)', animation: 'scrollPulse 1.7s ease-in-out infinite' }} />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 1 — الشخصيات (characters)
      ══════════════════════════════════════════════════════════════════ */}
      <section id="characters" style={{
        borderTop: '1px solid var(--line)',
        background: region.bg,
        transition: 'background .7s ease',
        minHeight: '100svh', display: 'flex', alignItems: 'center',
      }}>
        <div className="hk-2col" style={{ width: '100%' }}>

          {/* ── Left column: text + tabs ─────────────────────────────── */}
          <div className="reveal">
            <div className="eyebrow">01 — شخصيات من كل ركن</div>
            <h2 className={`char-img${fading ? ' fading' : ''}`} style={{
              fontSize: 'clamp(38px,5vw,72px)', fontWeight: 900, lineHeight: 1.04,
              letterSpacing: '-.05em', color: region.accent,
              textShadow: `0 0 40px ${region.glow}`,
            }}>
              {region.name}
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{region.nameEn}</p>

            <blockquote className={`hk-quote char-img${fading ? ' fading' : ''}`}>
              "{region.quote}"
              <br /><small style={{ color: 'var(--muted)', fontSize: 13, fontStyle: 'normal', marginTop: 8, display: 'block' }}>— {region.elderName}، {region.elderTitle}</small>
            </blockquote>

            {/* Region tabs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 28 }}>
              {REGIONS.map((r, i) => (
                <button key={r.key} className="rtab" onClick={() => goTo(i)} style={{
                  padding: '8px 16px', borderRadius: 999, fontSize: 13, fontWeight: 700,
                  background: activeIdx === i ? r.accent : 'rgba(255,255,255,0.04)',
                  color: activeIdx === i ? '#0d0a08' : 'rgba(255,255,255,0.45)',
                  borderColor: activeIdx === i ? r.accent : 'transparent',
                  boxShadow: activeIdx === i ? `0 0 20px ${r.glow}` : 'none',
                }}>
                  {r.name}
                </button>
              ))}
            </div>

            <Link to="/map" className="btn btn-gold" style={{ marginTop: 32 }}>
              تحدث مع الشخصية <ArrowLeft size={15} />
            </Link>
          </div>

          {/* ── Right column: photo + map ──────────────────────────── */}
          <div className="reveal char-col" style={{ position: 'relative', minHeight: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>

            {/* Character photo */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                position: 'absolute', inset: -16, borderRadius: 32,
                background: region.glow, filter: 'blur(32px)', zIndex: 0,
                transition: 'background .7s ease',
              }} />
              <img
                src={region.image}
                alt={region.elderName}
                className={`char-img${fading ? ' fading' : ''}`}
                style={{
                  position: 'relative', zIndex: 1,
                  width: 'clamp(200px,22vw,300px)',
                  aspectRatio: '3/4',
                  objectFit: 'cover',
                  borderRadius: 24,
                  border: `1px solid ${region.accent}30`,
                  boxShadow: `0 0 60px ${region.glow}, 0 20px 50px rgba(0,0,0,.6)`,
                  filter: 'saturate(.75) brightness(.9)',
                }}
              />
              {/* Elder name badge */}
              <div className={`char-img${fading ? ' fading' : ''}`} style={{
                position: 'absolute', bottom: -14, left: '50%', transform: 'translateX(-50%)',
                whiteSpace: 'nowrap', zIndex: 2,
                background: 'rgba(13,10,8,.85)', backdropFilter: 'blur(12px)',
                border: `1px solid ${region.accent}30`, borderRadius: 999,
                padding: '6px 14px', fontSize: 12, color: 'var(--muted)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: region.accent, display: 'inline-block', animation: 'scrollPulse 1.8s ease-in-out infinite' }} />
                {region.elderName}
              </div>
            </div>

            {/* Mini Egypt map */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <svg viewBox="0 0 260 500" style={{ width: 'clamp(80px,10vw,130px)', filter: 'drop-shadow(0 8px 20px rgba(0,0,0,.4))' }}>
                <path d="M88 17L162 35L166 112L184 145L169 199L203 269L177 335L148 409L136 481L103 466L85 390L70 315L76 239L62 177L79 111L73 58Z"
                  fill="rgba(13,10,8,.8)" stroke="rgba(196,160,106,.35)" strokeWidth="1.8" />
                <path d="M124 49C151 96 101 126 134 171C166 215 112 257 144 301C169 336 118 379 128 447"
                  fill="none" stroke="rgba(126,183,196,.5)" strokeWidth="2.5" strokeLinecap="round"
                  strokeDasharray="6 10" style={{ animation: 'river 7s linear infinite' }} />
                {REGIONS.map((r) => (
                  <g key={r.key} className={`hk-pin${region.key === r.key ? ' active' : ''}`}
                    onClick={() => goTo(REGIONS.indexOf(r))}>
                    <circle cx={r.mapCx} cy={r.mapCy} r={7}
                      fill={region.key === r.key ? r.accent : 'rgba(196,160,106,.25)'}
                      stroke={region.key === r.key ? r.accent : 'rgba(196,160,106,.4)'}
                      strokeWidth="2.5" />
                    <text x={r.mapCx + 12} y={r.mapCy + 3}>{r.name}</text>
                  </g>
                ))}
              </svg>
              <p style={{ fontSize: 10, color: 'var(--muted)', opacity: .5, letterSpacing: '.1em', textTransform: 'uppercase' }}>اضغط للتنقل</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 2 — صوت حبايبك
      ══════════════════════════════════════════════════════════════════ */}
      <section id="voice" style={{
        borderTop: '1px solid var(--line)',
        background: 'radial-gradient(circle at 25% 55%,rgba(140,40,40,.16),transparent 40%), linear-gradient(145deg,#0f0807,#0a0606)',
        minHeight: '100svh', display: 'flex', alignItems: 'center',
      }}>
        <div className="hk-2col" style={{ width: '100%' }}>

          {/* Visual */}
          <div className="reveal" style={{ position: 'relative', minHeight: 480, display: 'grid', placeItems: 'center' }}>

            {/* Memory card — CSS art, sepia family photo style */}
            <div style={{
              position: 'relative', width: 'min(90%,560px)', aspectRatio: '1.25',
              borderRadius: 24, overflow: 'hidden',
              border: '1px solid rgba(196,160,106,.15)', boxShadow: 'var(--shadow)',
              background: 'linear-gradient(180deg,transparent 38%,rgba(0,0,0,.82)), radial-gradient(circle at 55% 28%,rgba(220,196,150,.35),transparent 22%), linear-gradient(140deg,#7a5c32,#2a1a0e)',
              filter: 'saturate(.45) brightness(.85)',
            }}>
              {/* CSS silhouette figure */}
              <div style={{ position: 'absolute', width: 140, height: 170, borderRadius: '50% 50% 42% 42%', top: 80, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(#9a6840,#623c24)', boxShadow: '0 100px 0 55px #44281a, 0 -16px 0 10px #c4a870' }} />
              <div style={{ position: 'absolute', right: 24, bottom: 22, left: 24, zIndex: 3 }}>
                <span style={{ display: 'block', color: 'var(--gold)', fontSize: 12, marginBottom: 6, filter: 'none' }}>ذاكرة عائلية — ١٩٧٨</span>
                <strong style={{ fontSize: 'clamp(16px,2vw,22px)', lineHeight: 1.5, color: '#f0e0c0', fontWeight: 700 }}>
                  "كان كل بيت له حكاية،<br />وكل حكاية تبدأ من القعدة."
                </strong>
              </div>
            </div>

            {/* Audio panel */}
            <div style={{
              position: 'absolute', right: -20, top: '50%', transform: 'translateY(-50%)',
              width: 'min(78%,380px)', padding: '16px 18px',
              border: '1px solid rgba(196,160,106,.18)', borderRadius: 18,
              background: 'rgba(10,7,6,.88)', backdropFilter: 'blur(16px)',
              boxShadow: 'var(--shadow)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={togglePlay} style={{
                  width: 46, height: 46, borderRadius: '50%', border: 0,
                  background: 'var(--gold)', color: '#1a1008', fontWeight: 900,
                  cursor: 'pointer', fontSize: 14, flexShrink: 0,
                }}>
                  {playing ? '❚❚' : '▶'}
                </button>
                <div style={{ flex: 1, height: 56, display: 'flex', alignItems: 'center', gap: 3, overflow: 'hidden' }}>
                  {BARS.map(({ i, h }) => (
                    <div key={i} style={{
                      width: 4, minHeight: 6, borderRadius: 6, height: h,
                      background: 'linear-gradient(var(--gold),rgba(196,160,106,.2))',
                      animation: playing ? `waveAnim ${0.5 + (i % 7) * 0.1}s ease-in-out ${-i * 0.05}s infinite alternate` : 'none',
                      transform: playing ? 'scaleY(1)' : 'scaleY(.35)',
                      transformOrigin: 'center',
                      transition: 'transform .3s ease',
                    }} />
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', fontSize: 12 }}>
                <span>صوت من ذاكرة الأسرة</span>
                <span>{fmt(elapsed)} / {fmt(TOTAL)}</span>
              </div>
            </div>
          </div>

          {/* Copy */}
          <div className="reveal">
            <div className="eyebrow">02 — صوت حبايبك</div>
            <h2 style={{ fontSize: 'clamp(38px,5vw,72px)', fontWeight: 900, lineHeight: 1.04, letterSpacing: '-.05em' }}>
              الصوت الذي تحبه<br />
              <span style={{ color: '#a04040' }}>لا يختفي.</span>
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: 'clamp(15px,1.2vw,18px)', lineHeight: 1.9, marginTop: 20 }}>
              نسجّل صوت شخص عزيز، ثم نحفظ نبرته ولهجته داخل تجربة تسمح للعائلة أن تسمع حكاياته مرة أخرى.
            </p>
            <div className="hk-quote">"سجّل صوت جدك قبل ما يختفي للأبد."</div>
            <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['سجّل صوت أي شخص بأي لهجة', 'الـ AI يحفظ نبرته وشخصيته', 'يتكلم مع عيلتك في المناسبات'].map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted)', fontSize: 14 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a04040', flexShrink: 0 }} />
                  {t}
                </div>
              ))}
            </div>
            <Link to="/family" className="btn btn-gold" style={{ marginTop: 28 }}>
              <Mic size={15} /> ابدأ التسجيل
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 3 — التعليم والأطفال
      ══════════════════════════════════════════════════════════════════ */}
      <section id="learn" style={{
        borderTop: '1px solid var(--line)',
        background: 'radial-gradient(circle at 75% 35%,rgba(40,80,120,.16),transparent 38%), linear-gradient(145deg,#070a0f,#050810)',
        minHeight: '80svh', display: 'flex', alignItems: 'center',
      }}>
        <div style={{ width: '100%', maxWidth: 1100, margin: '0 auto', padding: '100px clamp(22px,6vw,100px)', textAlign: 'center' }}>
          <div className="reveal">
            <div className="eyebrow" style={{ justifyContent: 'center' }}>03 — التعليم والأطفال</div>
            <h2 style={{ fontSize: 'clamp(38px,5vw,72px)', fontWeight: 900, letterSpacing: '-.05em', lineHeight: 1.04 }}>
              التاريخ يتحول إلى <span style={{ color: '#3a7a9a' }}>مغامرة.</span>
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: 'clamp(15px,1.2vw,18px)', lineHeight: 1.9, maxWidth: 640, margin: '18px auto 36px' }}>
              الطفل لا يشاهد معلومة فقط؛ يختار طريقًا، يفتح بوابة، يقابل شخصية، ويكتشف تراث كل منطقة بطريقة تفاعلية.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 36 }}>
              {['قصص الأقصر', 'رموز النوبة', 'الأبجدية الهيروغليفية', 'أساطير الإسكندرية', 'حكايات القاهرة'].map((tag) => (
                <span key={tag} style={{
                  padding: '8px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                  background: 'rgba(58,122,154,.12)', border: '1px solid rgba(58,122,154,.25)', color: '#5a9ab8',
                }}>{tag}</span>
              ))}
            </div>
            <Link to="/map" className="btn btn-gold">استكشف الآن</Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          FOOTER CTA
      ══════════════════════════════════════════════════════════════════ */}
      <footer style={{
        position: 'relative', minHeight: '65svh', display: 'grid', placeItems: 'center',
        padding: '90px 24px', textAlign: 'center',
        borderTop: '1px solid var(--line)',
        background: 'radial-gradient(circle at 50% 50%,rgba(196,160,106,.1),transparent 35%), #090705',
        overflow: 'hidden',
      }}>
        {/* Ghost text */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 'min(32vw,440px)', fontWeight: 900, color: 'rgba(196,160,106,.04)',
          letterSpacing: '-.08em', userSelect: 'none', pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>حكاوي</div>

        <div className="reveal" style={{ position: 'relative', zIndex: 2, maxWidth: 800 }}>
          <div className="eyebrow" style={{ justifyContent: 'center' }}>جاهز تبدأ؟</div>
          <h2 style={{ fontSize: 'clamp(44px,7vw,96px)', fontWeight: 900, letterSpacing: '-.065em', lineHeight: .95, marginBottom: 20 }}>
            ابدأ رحلتك.
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 18, marginBottom: 32, lineHeight: 1.7 }}>
            اختر مكانًا على الخريطة، ودع أول حكاية تقودك إلى الباقي.
          </p>
          <Link to="/map" className="btn btn-gold" style={{ fontSize: 17, padding: '16px 32px' }}>
            ادخل إلى حكاوي <ArrowLeft size={17} />
          </Link>
          <p style={{ color: 'rgba(196,160,106,.15)', fontSize: 11, marginTop: 48, letterSpacing: '.1em' }}>
            Cairo University × AI Nexus Hackathon 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
