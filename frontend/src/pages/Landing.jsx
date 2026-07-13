import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

/* ─────────────────────────────────────────────────────────────────────────────
   HIKAWI — Landing Page
   Aesthetic: dark cinematic Egyptian — CSS-art only, no image dependencies
───────────────────────────────────────────────────────────────────────────── */

const PLACES = {
  القاهرة:    'هنا تبدأ حكايات الشوارع، المقاهي، والأصوات التي صنعت ذاكرة المدينة.',
  الإسكندرية: 'بحر، ترام قديم، وصوت المدينة التي استقبلت العالم.',
  الأقصر:    'حكايات المعابد والحرفيين الذين عاشوا بجوار التاريخ.',
  أسوان:     'لون نوبي، موسيقى، ونهر يحمل الذاكرة من الجنوب.',
};

const MAP_PINS = [
  { place: 'القاهرة',    cx: 124, cy: 112 },
  { place: 'الإسكندرية', cx: 95,  cy: 58  },
  { place: 'الأقصر',    cx: 140, cy: 320 },
  { place: 'أسوان',     cx: 129, cy: 425 },
];

/* ── Wave bars ────────────────────────────────────────────────────────────── */
const BARS = Array.from({ length: 42 }, (_, i) => ({
  i,
  h: 10 + Math.random() * 46,
}));

/* ── Reveal hook ──────────────────────────────────────────────────────────── */
function useReveal(ref) {
  useEffect(() => {
    if (!ref.current) return;
    const els = ref.current.querySelectorAll('.reveal');
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.16 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ref]);
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function Landing() {
  const pageRef = useRef(null);
  useReveal(pageRef);

  /* nav scroll */
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* map pin */
  const [activePin, setActivePin] = useState('القاهرة');

  /* waveform player */
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  const TOTAL = 18;

  const togglePlay = () => {
    setPlaying((prev) => {
      const next = !prev;
      if (next) {
        timerRef.current = setInterval(() => {
          setElapsed((e) => {
            if (e >= TOTAL - 1) {
              clearInterval(timerRef.current);
              setPlaying(false);
              return 0;
            }
            return e + 1;
          });
        }, 1000);
      } else {
        clearInterval(timerRef.current);
      }
      return next;
    });
  };

  const fmt = (s) => `00:${String(s).padStart(2, '0')}`;

  return (
    <div ref={pageRef} dir="rtl" style={{ fontFamily: '"Segoe UI", Tahoma, Arial, sans-serif', overflowX: 'hidden' }}>

      {/* ── Global styles ───────────────────────────────────────────────────── */}
      <style>{`
        :root{
          --bg:#110d0b; --bg-soft:#18110d;
          --ink:#f8ecd3; --muted:#bcae99;
          --gold:#d9ad63; --gold-soft:#8f6b36;
          --red:#9b4435; --green:#365a49; --blue:#325b67;
          --line:rgba(248,236,211,.14);
          --shadow:0 30px 80px rgba(0,0,0,.42);
        }
        *{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}

        /* grain overlay */
        .hk-grain{
          position:fixed;inset:-50%;z-index:100;pointer-events:none;opacity:.055;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          animation:hkGrain .25s steps(2) infinite;
        }
        @keyframes hkGrain{
          0%{transform:translate(0,0)}25%{transform:translate(2%,-3%)}
          50%{transform:translate(-3%,2%)}75%{transform:translate(3%,3%)}
          100%{transform:translate(-2%,-2%)}
        }

        /* reveal */
        .reveal{opacity:0;transform:translateY(40px);transition:opacity .8s ease,transform .8s cubic-bezier(.2,.75,.2,1)}
        .reveal.visible{opacity:1;transform:none}

        /* eyebrow */
        .eyebrow{
          display:inline-flex;align-items:center;gap:10px;
          color:var(--gold);font-size:13px;font-weight:800;
          letter-spacing:.16em;text-transform:uppercase;margin-bottom:20px;
        }
        .eyebrow::before{content:"";width:36px;height:1px;background:var(--gold)}

        /* quote block */
        .hk-quote{
          margin-top:28px;padding:20px 22px;
          border-right:3px solid var(--gold);
          background:linear-gradient(90deg,rgba(217,173,99,.08),transparent);
          color:#ead8b9;font-size:18px;line-height:1.8;border-radius:0 12px 12px 0;
        }

        /* buttons */
        .btn{border:0;padding:15px 24px;border-radius:999px;cursor:pointer;transition:.25s ease;font-family:inherit;font-size:16px}
        .btn-primary{background:var(--gold);color:#24180e;font-weight:800;box-shadow:0 14px 34px rgba(217,173,99,.18);text-decoration:none;display:inline-block}
        .btn-primary:hover{transform:translateY(-3px)}
        .btn-secondary{background:transparent;border:1px solid var(--line);color:var(--ink);text-decoration:none;display:inline-block}

        /* orb */
        @keyframes floatOrb{0%,100%{transform:translateY(-8px) scale(.97)}50%{transform:translateY(10px) scale(1.02)}}

        /* nile */
        @keyframes river{to{stroke-dashoffset:-190}}

        /* scroll mark */
        @keyframes scrollPulse{
          0%,100%{transform:scaleY(.25);opacity:.25;transform-origin:top}
          50%{transform:scaleY(1);opacity:1;transform-origin:top}
        }

        /* floating notes */
        @keyframes noteFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}

        /* wave bars */
        @keyframes waveMove{from{transform:scaleY(.24)}to{transform:scaleY(1)}}

        /* portrait hover */
        .hk-portrait{transition:.45s ease;cursor:pointer}
        .hk-portrait:hover{z-index:5;transform:translateX(0) rotate(0) scale(1.04)!important}
        .hk-portrait.center:hover{transform:translateX(-50%) scale(1.1)!important}

        /* story cards */
        .story-card{transition:.25s ease}
        .story-card:hover{transform:translateY(-6px)}

        /* map pin */
        .hk-pin{cursor:pointer;transform-box:fill-box;transform-origin:center;transition:.25s ease}
        .hk-pin:hover{transform:scale(1.45)}
        .hk-pin.active{transform:scale(1.45)}
        .hk-pin text{opacity:0;transition:.2s ease;pointer-events:none;fill:#f8ecd3;font-size:9px}
        .hk-pin:hover text,.hk-pin.active text{opacity:1}

        /* nav cta */
        .nav-cta{border:1px solid rgba(217,173,99,.45);background:rgba(217,173,99,.08);color:var(--gold);padding:10px 18px;border-radius:999px;cursor:pointer;text-decoration:none;font-size:14px}

        @media(prefers-reduced-motion:reduce){*{animation:none!important;scroll-behavior:auto!important}.reveal{opacity:1;transform:none}}
        @media(max-width:900px){
          .hk-grid-hero,.hk-grid-section{grid-template-columns:1fr!important}
          .hk-float-note{display:none}
        }
      `}</style>

      {/* ── Film grain ────────────────────────────────────────────────────── */}
      <div className="hk-grain" />

      {/* ── Navbar ────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, right: 0, left: 0, zIndex: 30, height: 76,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(22px,5vw,76px)',
        borderBottom: `1px solid ${scrolled ? 'var(--line)' : 'transparent'}`,
        background: scrolled ? 'rgba(17,13,11,.82)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        transition: '.35s ease',
      }}>
        <Link to="/" style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-.04em', color: 'var(--ink)', textDecoration: 'none' }}>
          حكاوي<span style={{ color: 'var(--gold)' }}>.</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, color: 'rgba(248,236,211,.72)', fontSize: 14 }}>
          <a href="#characters" style={{ color: 'inherit', textDecoration: 'none', transition: '.2s' }}>الشخصيات</a>
          <a href="#voice"      style={{ color: 'inherit', textDecoration: 'none', transition: '.2s' }}>صوت حبايبك</a>
          <a href="#learn"      style={{ color: 'inherit', textDecoration: 'none', transition: '.2s' }}>التعلّم</a>
        </div>
        <Link to="/map" className="nav-cta">ابدأ رحلتك</Link>
      </nav>

      {/* ════════════════════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════════════════ */}
      <header className="hk-grid-hero" style={{
        position: 'relative', minHeight: '100svh',
        display: 'grid', gridTemplateColumns: '1.05fr .95fr',
        alignItems: 'center',
        padding: '110px clamp(24px,7vw,110px) 55px',
        isolation: 'isolate',
        background: 'radial-gradient(circle at 20% 45%,rgba(217,173,99,.12),transparent 33%), linear-gradient(145deg,#1a120d 0%,#100d0b 58%,#090807 100%)',
      }} id="top">

        {/* Copy */}
        <div className="reveal visible" style={{ position: 'relative', zIndex: 3, maxWidth: 660 }}>
          <div className="eyebrow">مصر كما يرويها أهلها</div>
          <h1 style={{ fontSize: 'clamp(54px,7.2vw,108px)', lineHeight: .95, letterSpacing: '-.065em', fontWeight: 900 }}>
            كل مكان عنده{' '}
            <em style={{ display: 'block', color: 'var(--gold)', fontStyle: 'normal' }}>حكاية.</em>
          </h1>
          <p style={{ maxWidth: 580, marginTop: 26, color: 'var(--muted)', fontSize: 'clamp(17px,1.35vw,21px)', lineHeight: 1.85 }}>
            خريطة تفاعلية للذاكرة المصرية. اختر مكانًا، قابل شخصياته، اسمع أصوات أهله، واكتشف كيف تعيش الحكاية من جيل إلى جيل.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 32 }}>
            <Link to="/map"    className="btn btn-primary">اكتشف الشخصيات</Link>
            <Link to="/family" className="btn btn-secondary">اسمع حكاية</Link>
          </div>
        </div>

        {/* Visual — orb + SVG map + notes */}
        <div className="reveal visible" style={{ position: 'relative', minHeight: 600, display: 'grid', placeItems: 'center' }}>
          {/* Orb */}
          <div style={{
            position: 'absolute', width: 'min(36vw,520px)', aspectRatio: '1',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 38% 35%,#f0d494 0 7%,#d7a65f 30%,#9b5732 68%,#5c2d20 100%)',
            opacity: .88, boxShadow: '0 0 110px rgba(217,173,99,.18)',
            animation: 'floatOrb 7s ease-in-out infinite',
          }} />

          {/* Egypt SVG map */}
          <svg viewBox="0 0 260 500" style={{ position: 'relative', zIndex: 2, width: 'min(44vw,500px)', filter: 'drop-shadow(0 30px 30px rgba(0,0,0,.3))' }}>
            <path d="M88 17L162 35L166 112L184 145L169 199L203 269L177 335L148 409L136 481L103 466L85 390L70 315L76 239L62 177L79 111L73 58Z"
              fill="rgba(17,13,11,.72)" stroke="#f1d69f" strokeWidth="1.8" />
            <path d="M124 49C151 96 101 126 134 171C166 215 112 257 144 301C169 336 118 379 128 447"
              fill="none" stroke="#7eb7c4" strokeWidth="3" strokeLinecap="round"
              strokeDasharray="7 12" style={{ animation: 'river 7s linear infinite' }} />
            {MAP_PINS.map(({ place, cx, cy }) => (
              <g key={place} className={`hk-pin${activePin === place ? ' active' : ''}`}
                onClick={() => setActivePin(place)}>
                <circle cx={cx} cy={cy} r={7} fill="var(--gold)" stroke="#2a1b12" strokeWidth="3" />
                <text x={cx + 13} y={cy + 3}>{place}</text>
              </g>
            ))}
          </svg>

          {/* Floating notes */}
          <div className="hk-float-note" style={{
            position: 'absolute', zIndex: 4, left: '2%', top: '18%',
            width: 210, padding: '16px 18px', border: '1px solid rgba(248,236,211,.16)',
            borderRadius: 16, background: 'rgba(24,17,13,.72)', backdropFilter: 'blur(13px)',
            boxShadow: 'var(--shadow)', animation: 'noteFloat 5s ease-in-out infinite',
          }}>
            <strong style={{ display: 'block', marginBottom: 5, color: 'var(--ink)' }}>{activePin}</strong>
            <small style={{ color: 'var(--muted)', lineHeight: 1.55, fontSize: 13 }}>{PLACES[activePin]}</small>
          </div>

          <div className="hk-float-note" style={{
            position: 'absolute', zIndex: 4, right: '2%', bottom: '18%',
            width: 210, padding: '16px 18px', border: '1px solid rgba(248,236,211,.16)',
            borderRadius: 16, background: 'rgba(24,17,13,.72)', backdropFilter: 'blur(13px)',
            boxShadow: 'var(--shadow)', animation: 'noteFloat 5s ease-in-out -2s infinite',
          }}>
            <strong style={{ display: 'block', marginBottom: 5, color: 'var(--ink)' }}>اضغط على أي مكان</strong>
            <small style={{ color: 'var(--muted)', lineHeight: 1.55, fontSize: 13 }}>لتظهر لك الشخصيات والحكايات المرتبطة به.</small>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: 'absolute', right: '50%', bottom: 26, transform: 'translateX(50%)', color: 'rgba(248,236,211,.5)', fontSize: 12, letterSpacing: '.12em', textAlign: 'center' }}>
          اسحب للأسفل
          <div style={{ width: 1, height: 34, margin: '9px auto 0', background: 'linear-gradient(var(--gold),transparent)', animation: 'scrollPulse 1.6s ease-in-out infinite' }} />
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 1 — الشخصيات
      ════════════════════════════════════════════════════════════════════ */}
      <section className="hk-grid-section" id="characters" style={{
        position: 'relative', minHeight: '100svh',
        display: 'grid', gridTemplateColumns: '.9fr 1.1fr',
        alignItems: 'center', gap: 'clamp(34px,7vw,100px)',
        padding: '110px clamp(24px,7vw,110px)',
        borderTop: '1px solid var(--line)',
        background: 'radial-gradient(circle at 80% 45%,rgba(155,68,53,.13),transparent 32%), linear-gradient(145deg,#110d0b,#17100d)',
      }}>
        <div className="reveal" style={{ maxWidth: 560 }}>
          <div className="eyebrow">01 — شخصيات من كل ركن</div>
          <h2 style={{ fontSize: 'clamp(40px,5.2vw,76px)', lineHeight: 1.04, letterSpacing: '-.05em', fontWeight: 900 }}>
            قابل الناس قبل أن تقرأ التاريخ.
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 'clamp(16px,1.3vw,20px)', lineHeight: 1.9, marginTop: 22 }}>
            كل محافظة تظهر من خلال أصواتها وشخصياتها: حرفي، حكّاء، فنانة، بحّار، أو جدة تعرف تفاصيل لا تجدها في أي كتاب.
          </p>
          <div className="hk-quote">"أنا ألواني من الجبل، وكل لون عنده معنى."</div>
          <Link to="/map" className="btn btn-primary" style={{ marginTop: 32, display: 'inline-block' }}>استكشف الشخصيات</Link>
        </div>

        {/* CSS portrait stack */}
        <div className="reveal" style={{ position: 'relative', minHeight: 520, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          {/* Portrait 1 — Pharaonic gold */}
          <div className="hk-portrait" style={{
            position: 'absolute', width: 230, height: 350,
            borderRadius: '120px 120px 20px 20px',
            border: '1px solid rgba(248,236,211,.18)', boxShadow: 'var(--shadow)',
            background: 'radial-gradient(circle at 50% 28%,rgba(255,232,186,.42) 0 12%,transparent 13%), linear-gradient(155deg,#c4920a,#3d1e00)',
            right: '2%', bottom: 30, transform: 'rotate(8deg) scale(.88)',
          }}>
            <div style={{ position: 'absolute', width: 108, height: 130, borderRadius: '50% 50% 46% 46%', top: 62, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(#a76d47,#6d3e2d)', boxShadow: '0 78px 0 38px #865040, 0 -13px 0 8px #e0c97a' }} />
            <div style={{ position: 'absolute', right: 20, bottom: 24, zIndex: 2 }}>
              <b style={{ display: 'block', fontSize: 18, color: '#f8ecd3' }}>ذهبي فرعوني</b>
              <small style={{ color: '#d8c6aa' }}>الأقصر</small>
            </div>
          </div>

          {/* Portrait 2 — Alexandrian blue */}
          <div className="hk-portrait" style={{
            position: 'absolute', width: 230, height: 350,
            borderRadius: '120px 120px 20px 20px',
            border: '1px solid rgba(248,236,211,.18)', boxShadow: 'var(--shadow)',
            background: 'radial-gradient(circle at 50% 28%,rgba(186,232,255,.42) 0 12%,transparent 13%), linear-gradient(155deg,#1a5a7a,#05111a)',
            left: '2%', bottom: 26, transform: 'rotate(-8deg) scale(.88)',
          }}>
            <div style={{ position: 'absolute', width: 108, height: 130, borderRadius: '50% 50% 46% 46%', top: 62, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(#a0826a,#6d4e3d)', boxShadow: '0 78px 0 38px #3a6a7a, 0 -13px 0 8px #ddddd0' }} />
            <div style={{ position: 'absolute', right: 20, bottom: 24, zIndex: 2 }}>
              <b style={{ display: 'block', fontSize: 18, color: '#f8ecd3' }}>أزرق إسكندراني</b>
              <small style={{ color: '#d8c6aa' }}>الإسكندرية</small>
            </div>
          </div>

          {/* Portrait 3 — Nubian red (center, front) */}
          <div className="hk-portrait center" style={{
            position: 'absolute', width: 230, height: 350,
            borderRadius: '120px 120px 20px 20px',
            border: '1px solid rgba(248,236,211,.22)', boxShadow: '0 0 60px rgba(155,68,53,.4), var(--shadow)',
            background: 'radial-gradient(circle at 50% 28%,rgba(255,210,186,.38) 0 12%,transparent 13%), linear-gradient(155deg,#7a3822,#190a07)',
            left: '50%', bottom: 16, zIndex: 2, transform: 'translateX(-50%) scale(1.06)',
          }}>
            <div style={{ position: 'absolute', width: 108, height: 130, borderRadius: '50% 50% 46% 46%', top: 62, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(#b07050,#703828)', boxShadow: '0 78px 0 38px #6a2820, 0 -13px 0 8px #1a100c' }} />
            <div style={{ position: 'absolute', right: 20, bottom: 24, zIndex: 2 }}>
              <b style={{ display: 'block', fontSize: 18, color: '#f8ecd3' }}>أحمر نوبي</b>
              <small style={{ color: '#d8c6aa' }}>أسوان</small>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 2 — صوت حبايبك
      ════════════════════════════════════════════════════════════════════ */}
      <section className="hk-grid-section" id="voice" style={{
        position: 'relative', minHeight: '100svh',
        display: 'grid', gridTemplateColumns: '1.1fr .9fr',
        alignItems: 'center', gap: 'clamp(34px,7vw,100px)',
        padding: '110px clamp(24px,7vw,110px)',
        borderTop: '1px solid var(--line)',
        background: 'radial-gradient(circle at 22% 55%,rgba(217,173,99,.14),transparent 30%), linear-gradient(135deg,#17100c,#0d0a09)',
      }}>
        {/* Visual */}
        <div className="reveal" style={{ position: 'relative', minHeight: 540, display: 'grid', placeItems: 'center' }}>
          {/* Memory card */}
          <div style={{
            position: 'relative', width: 'min(90%,640px)', aspectRatio: '1.28',
            borderRadius: 26, overflow: 'hidden',
            border: '1px solid rgba(248,236,211,.16)', boxShadow: 'var(--shadow)',
            background: 'linear-gradient(180deg,transparent 40%,rgba(0,0,0,.78)), radial-gradient(circle at 55% 30%,rgba(237,213,170,.42),transparent 20%), linear-gradient(135deg,#8b6844,#2a1b13 68%)',
            filter: 'sepia(.25)',
          }}>
            {/* CSS person */}
            <div style={{ position: 'absolute', width: 160, height: 200, borderRadius: '50% 50% 44% 44%', top: 85, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(#a97452,#70442f)', boxShadow: '0 116px 0 64px #493128, 0 -18px 0 11px #d7c5a2' }} />
            <div style={{ position: 'absolute', right: 30, bottom: 28, left: 30, zIndex: 3 }}>
              <span style={{ display: 'block', color: 'var(--gold)', fontSize: 13, marginBottom: 7 }}>ذاكرة عائلية — 1978</span>
              <strong style={{ fontSize: 'clamp(18px,2.2vw,30px)', lineHeight: 1.45, color: '#f8ecd3' }}>
                "كان كل بيت له حكاية، وكل حكاية تبدأ من القعدة."
              </strong>
            </div>
          </div>

          {/* Audio panel */}
          <div style={{
            position: 'absolute', right: -24, top: '50%', transform: 'translateY(-50%)',
            width: 'min(78%,420px)', padding: 18,
            border: '1px solid rgba(248,236,211,.18)', borderRadius: 20,
            background: 'rgba(15,11,9,.8)', backdropFilter: 'blur(14px)',
            boxShadow: 'var(--shadow)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button onClick={togglePlay} style={{
                flexShrink: 0, width: 48, height: 48, borderRadius: '50%', border: 0,
                background: 'var(--gold)', color: '#24180e', fontWeight: 900,
                cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 16,
              }}>
                {playing ? '❚❚' : '▶'}
              </button>
              <div style={{ flex: 1, height: 62, display: 'flex', alignItems: 'center', gap: 3, overflow: 'hidden' }}>
                {BARS.map(({ i, h }) => (
                  <div key={i} style={{
                    width: 4, minHeight: 8, borderRadius: 10,
                    background: 'linear-gradient(var(--gold),rgba(217,173,99,.28))',
                    transform: `scaleY(${playing ? 1 : 0.4})`,
                    transformOrigin: 'center',
                    height: h,
                    animation: playing ? `waveMove ${0.5 + (i % 7) * 0.1}s ease-in-out ${-i * 0.05}s infinite alternate` : 'none',
                  }} />
                ))}
              </div>
            </div>
            <div style={{ marginTop: 12, color: 'var(--muted)', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
              <span>صوت محفوظ من ذاكرة الأسرة</span>
              <span>{fmt(elapsed)} / {fmt(TOTAL)}</span>
            </div>
          </div>
        </div>

        {/* Copy */}
        <div className="reveal" style={{ maxWidth: 560 }}>
          <div className="eyebrow">02 — صوت حبايبك</div>
          <h2 style={{ fontSize: 'clamp(40px,5.2vw,76px)', lineHeight: 1.04, letterSpacing: '-.05em', fontWeight: 900 }}>
            الصوت الذي تحبه لا يختفي.
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 'clamp(16px,1.3vw,20px)', lineHeight: 1.9, marginTop: 22 }}>
            نسجّل صوت شخص عزيز، ثم نحفظ نبرته ولهجته داخل تجربة تسمح للعائلة أن تسمع حكاياته مرة أخرى.
          </p>
          <div className="hk-quote">"سجّل صوت جدك قبل ما يختفي للأبد."</div>
          <Link to="/family" className="btn btn-primary" style={{ marginTop: 32, display: 'inline-block' }}>ابدأ التسجيل</Link>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 3 — التعليم والأطفال
      ════════════════════════════════════════════════════════════════════ */}
      <section className="hk-grid-section" id="learn" style={{
        position: 'relative', minHeight: '100svh',
        display: 'grid', gridTemplateColumns: '.9fr 1.1fr',
        alignItems: 'center', gap: 'clamp(34px,7vw,100px)',
        padding: '110px clamp(24px,7vw,110px)',
        borderTop: '1px solid var(--line)',
        background: 'radial-gradient(circle at 75% 30%,rgba(50,91,103,.19),transparent 30%), radial-gradient(circle at 20% 80%,rgba(155,68,53,.14),transparent 28%), linear-gradient(145deg,#100d0b,#16100d)',
      }}>
        <div className="reveal" style={{ maxWidth: 560 }}>
          <div className="eyebrow">03 — التعليم والأطفال</div>
          <h2 style={{ fontSize: 'clamp(40px,5.2vw,76px)', lineHeight: 1.04, letterSpacing: '-.05em', fontWeight: 900 }}>
            التاريخ يتحول إلى مغامرة.
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 'clamp(16px,1.3vw,20px)', lineHeight: 1.9, marginTop: 22 }}>
            الطفل لا يشاهد معلومة فقط؛ يختار طريقًا، يفتح بوابة، يقابل شخصية، ويكتشف تراث كل منطقة بطريقة تفاعلية.
          </p>
          <div className="hk-quote">"اكتشف تراثك عن طريق قصة ممتعة."</div>
          <Link to="/map" className="btn btn-primary" style={{ marginTop: 32, display: 'inline-block' }}>استكشف الآن</Link>
        </div>

        {/* CSS learning world */}
        <div className="reveal" style={{ position: 'relative', width: 'min(100%,700px)', minHeight: 560, borderRadius: 38, border: '1px solid rgba(248,236,211,.14)', overflow: 'hidden', boxShadow: 'var(--shadow)', background: 'radial-gradient(circle at 50% 17%,rgba(217,173,99,.2),transparent 22%), linear-gradient(#274954 0 48%,#8d6b3f 49% 58%,#2c4d3e 59%)' }}>
          {/* Ground */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '42%', background: 'linear-gradient(165deg,#2d5844,#19362d)', clipPath: 'polygon(0 30%,100% 0,100% 100%,0 100%)' }} />
          {/* Sun */}
          <div style={{ position: 'absolute', width: 120, aspectRatio: '1', borderRadius: '50%', left: 48, top: 42, background: 'radial-gradient(circle at 35% 35%,#ffe8ad,#dba758 68%,#9a5a34)', boxShadow: '0 0 50px rgba(255,221,156,.3)' }} />
          {/* CSS children */}
          {[
            { right: '22%', shirt: '#a54736', pants: '#492a22', scale: 1 },
            { right: '48%', shirt: '#d2a24f', pants: '#324c57', scale: .9 },
            { right: '70%', shirt: '#3f6e5a', pants: '#402d27', scale: .82 },
          ].map((c, i) => (
            <div key={i} style={{
              position: 'absolute', bottom: 75, right: c.right,
              width: 126, height: 220,
              borderRadius: '70px 70px 25px 25px',
              background: `linear-gradient(${c.shirt},${c.pants})`,
              boxShadow: '0 18px 40px rgba(0,0,0,.25)',
              transform: `scale(${c.scale})`,
              transformOrigin: 'bottom center',
            }}>
              <div style={{ position: 'absolute', width: 76, height: 76, borderRadius: '50%', background: '#9a6543', left: '50%', top: -46, transform: 'translateX(-50%)', boxShadow: '0 -12px 0 6px #2a1a14' }} />
            </div>
          ))}
          {/* Story cards */}
          <div className="story-card" style={{ position: 'absolute', width: 190, padding: 16, borderRadius: 18, background: 'rgba(15,11,9,.8)', border: '1px solid rgba(248,236,211,.15)', backdropFilter: 'blur(12px)', left: 28, bottom: 36 }}>
            <b style={{ display: 'block', marginBottom: 5, color: 'var(--ink)' }}>مهمة اليوم</b>
            <small style={{ color: 'var(--muted)', lineHeight: 1.55 }}>ابحث عن رمز السجاد النوبي واكتشف قصته.</small>
          </div>
          <div className="story-card" style={{ position: 'absolute', width: 190, padding: 16, borderRadius: 18, background: 'rgba(15,11,9,.8)', border: '1px solid rgba(248,236,211,.15)', backdropFilter: 'blur(12px)', right: 24, top: 32 }}>
            <b style={{ display: 'block', marginBottom: 5, color: 'var(--ink)' }}>رحلة جديدة</b>
            <small style={{ color: 'var(--muted)', lineHeight: 1.55 }}>من القاهرة الفاطمية إلى بيوت النوبة.</small>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          FOOTER CTA
      ════════════════════════════════════════════════════════════════════ */}
      <footer style={{
        position: 'relative', minHeight: '72svh', display: 'grid', placeItems: 'center',
        padding: '100px 24px', textAlign: 'center',
        borderTop: '1px solid var(--line)', overflow: 'hidden',
        background: 'radial-gradient(circle at 50% 52%,rgba(217,173,99,.14),transparent 32%), #0d0a09',
      }}>
        {/* Big ghost text */}
        <div style={{ position: 'absolute', fontSize: 'min(30vw,420px)', fontWeight: 900, color: 'rgba(248,236,211,.025)', letterSpacing: '-.08em', userSelect: 'none', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          حكاوي
        </div>
        <div className="reveal" style={{ position: 'relative', zIndex: 2, maxWidth: 900 }}>
          <div className="eyebrow" style={{ justifyContent: 'center' }}>جاهز تبدأ؟</div>
          <h2 style={{ fontSize: 'clamp(48px,7vw,104px)', lineHeight: 1.04, letterSpacing: '-.05em', fontWeight: 900, marginBottom: 24 }}>
            ابدأ رحلتك.
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 20, marginBottom: 32 }}>
            اختر مكانًا على الخريطة، ودع أول حكاية تقودك إلى الباقي.
          </p>
          <Link to="/map" className="btn btn-primary" style={{ fontSize: 18, padding: '18px 32px' }}>ادخل إلى حكاوي</Link>
          <p style={{ color: 'rgba(248,236,211,.15)', fontSize: 12, marginTop: 48 }}>
            Cairo University × AI Nexus Hackathon 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
