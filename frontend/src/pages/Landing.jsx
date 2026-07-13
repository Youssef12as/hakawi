import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mic } from 'lucide-react';

/* ─── Regions ─────────────────────────────────────────────────────────────── */
const REGIONS = [
  { key:'aswan',      name:'أسوان والنوبة',    nameEn:'Aswan & Nubia',   elderName:'عم عثمان',      elderTitle:'حارس أسرار النوبة',        quote:'الكليم مش بس نسيج، ده لغة. كل رمز فيه بيحكي حكاية من جداتنا.', image:'/assets/char-aswan.png',      accent:'#b07040', glow:'rgba(176,112,64,.22)', mapCx:129, mapCy:425 },
  { key:'luxor',      name:'الأقصر',           nameEn:'Luxor',           elderName:'حكيم الأقصر',   elderTitle:'راوي المعابد الفرعونية',   quote:'عنخ — مفتاح الحياة. أجدادنا نقشوه على كل باب ليحمي البيت من الأبد.', image:'/assets/char-luxor.png',    accent:'#9e8020', glow:'rgba(158,128,32,.22)', mapCx:140, mapCy:320 },
  { key:'cairo',      name:'القاهرة',          nameEn:'Cairo',           elderName:'الشيخ محمود',   elderTitle:'عالم الأزهر الشريف',       quote:'الأرابيسك هو فن إسلامي خالص — خطوط بلا نهاية ترمز لاستمرارية الوجود.', image:'/assets/char-cairo.png',  accent:'#3a6878', glow:'rgba(58,104,120,.22)', mapCx:124, mapCy:112 },
  { key:'alexandria', name:'الإسكندرية',       nameEn:'Alexandria',      elderName:'عم سيد البحري', elderTitle:'ابن البحر المتوسط',         quote:'الإسكندرية مدينة بتتنفس من البحر. الإغريق والمصريين كلهم خلوا أثر هنا.', image:'/assets/char-alexandria.png', accent:'#2e607a', glow:'rgba(46,96,122,.22)', mapCx:95, mapCy:58 },
];

const BARS = Array.from({ length: 38 }, (_, i) => ({ i, h: 10 + Math.random() * 42 }));

/* ─── Scroll-driven parallax hook ────────────────────────────────────────── */
function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    const fn = () => setY(window.scrollY);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);
  return y;
}

/* ─── Reveal on scroll ────────────────────────────────────────────────────── */
function useReveal(ref) {
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('in'); }),
      { threshold: 0.12 }
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

  /* nav */
  const navScrolled = scrollY > 30;

  /* characters section */
  const [activeIdx, setActiveIdx] = useState(0);
  const [fading,    setFading]    = useState(false);
  const timerRef = useRef(null);

  const goTo = useCallback((idx) => {
    clearInterval(timerRef.current);
    setFading(true);
    setTimeout(() => { setActiveIdx(idx); setFading(false); }, 300);
    timerRef.current = setInterval(() => {
      setFading(true);
      setTimeout(() => { setActiveIdx((p) => (p + 1) % REGIONS.length); setFading(false); }, 300);
    }, 4500);
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setFading(true);
      setTimeout(() => { setActiveIdx((p) => (p + 1) % REGIONS.length); setFading(false); }, 300);
    }, 4500);
    return () => clearInterval(timerRef.current);
  }, []);

  const region = REGIONS[activeIdx];

  /* waveform player */
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const waveTimer = useRef(null);
  const TOTAL = 18;
  const fmt = (s) => `00:${String(s).padStart(2, '0')}`;
  const togglePlay = () => {
    setPlaying((p) => {
      if (!p) {
        waveTimer.current = setInterval(() => setElapsed((e) => {
          if (e >= TOTAL - 1) { clearInterval(waveTimer.current); setPlaying(false); return 0; }
          return e + 1;
        }), 1000);
      } else {
        clearInterval(waveTimer.current);
      }
      return !p;
    });
  };

  return (
    <div ref={pageRef} dir="rtl" style={{ fontFamily:'"Segoe UI",Tahoma,Arial,sans-serif', background:'#0a0806', color:'#e8d8b8', overflowX:'hidden' }}>

      {/* ── Global CSS ──────────────────────────────────────────────────── */}
      <style>{`
        :root{ --gold:#a88040; --dim:#7a6040; --muted:#7a6e60; --line:rgba(168,128,64,.12); }
        *{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        a{text-decoration:none;color:inherit}
        img{display:block}

        /* grain */
        .grain{position:fixed;inset:-50%;z-index:400;pointer-events:none;opacity:.052;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          animation:gr .22s steps(2) infinite}
        @keyframes gr{0%{transform:translate(0,0)}25%{transform:translate(3%,-2%)}50%{transform:translate(-2%,3%)}75%{transform:translate(2%,2%)}100%{transform:translate(-3%,-3%)}}

        /* reveal */
        .rv{opacity:0;transform:translateY(44px);
          transition:opacity .9s cubic-bezier(.16,1,.3,1),transform .9s cubic-bezier(.16,1,.3,1)}
        .rv.in{opacity:1;transform:none}
        .rv.d1{transition-delay:.12s}.rv.d2{transition-delay:.24s}.rv.d3{transition-delay:.36s}

        /* eyebrow */
        .ey{display:inline-flex;align-items:center;gap:9px;
          color:var(--gold);font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;margin-bottom:16px}
        .ey::before{content:"";width:28px;height:1px;background:var(--gold)}

        /* quote */
        .qt{margin-top:22px;padding:16px 20px;font-size:16px;line-height:1.85;
          border-right:2px solid var(--gold);font-style:italic;
          background:linear-gradient(90deg,rgba(168,128,64,.07),transparent);
          color:#c8b890;border-radius:0 8px 8px 0}

        /* buttons */
        .btn{display:inline-flex;align-items:center;gap:8px;border:0;
          padding:13px 22px;border-radius:999px;cursor:pointer;
          font-family:inherit;font-size:14px;font-weight:700;transition:.25s ease}
        .btn-g{background:var(--gold);color:#0a0806;box-shadow:0 8px 28px rgba(168,128,64,.18)}
        .btn-g:hover{transform:translateY(-2px);box-shadow:0 14px 36px rgba(168,128,64,.26)}
        .btn-o{background:transparent;border:1px solid var(--line);color:#c8b890}
        .btn-o:hover{border-color:var(--gold);color:var(--gold)}

        /* pin */
        .pin{cursor:pointer;transform-box:fill-box;transform-origin:center;transition:.28s ease}
        .pin circle{transition:.28s}
        .pin text{opacity:0;transition:.2s;pointer-events:none;fill:#c8b890;font-size:9px}
        .pin:hover,.pin.on{transform:scale(1.5)}
        .pin:hover text,.pin.on text{opacity:1}

        /* char image fade */
        .cf{transition:opacity .3s ease,transform .3s ease}
        .cf.fd{opacity:0;transform:scale(.96) translateY(6px)}

        /* region tab */
        .rtab{transition:.22s ease;cursor:pointer;border:1px solid transparent;outline:none;font-family:inherit}
        .rtab:hover{border-color:var(--line)}

        /* wave */
        @keyframes wv{from{transform:scaleY(.2)}to{transform:scaleY(1)}}

        /* nile */
        @keyframes nile{to{stroke-dashoffset:-180}}

        /* float */
        @keyframes fl{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-14px) rotate(1.5deg)}}
        @keyframes fl2{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-10px) rotate(1deg)}}

        /* scroll caret */
        @keyframes caret{0%,100%{opacity:.15;transform:scaleY(.3);transform-origin:top}50%{opacity:.7;transform:scaleY(1);transform-origin:top}}

        /* 2-col grid */
        .g2{display:grid;grid-template-columns:1fr 1fr;align-items:center;
          gap:clamp(28px,6vw,80px);padding:96px clamp(20px,6vw,96px)}
        @media(max-width:860px){.g2{grid-template-columns:1fr;padding:72px 22px}}
        @media(max-width:640px){h2{font-size:clamp(32px,9vw,52px)!important}}
        @media(prefers-reduced-motion:reduce){*{animation:none!important}.rv{opacity:1;transform:none}}
      `}</style>

      <div className="grain" />

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position:'fixed',top:0,right:0,left:0,zIndex:300,height:68,
        display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'0 clamp(18px,5vw,68px)',
        background: navScrolled ? 'rgba(10,8,6,.88)' : 'transparent',
        backdropFilter: navScrolled ? 'blur(20px)' : 'none',
        borderBottom:`1px solid ${navScrolled ? 'var(--line)' : 'transparent'}`,
        transition:'.35s ease',
      }}>
        <Link to="/" style={{fontSize:22,fontWeight:900,letterSpacing:'-.04em',color:'#e8d8b8'}}>
          حكاوي<span style={{color:'var(--gold)'}}>.</span>
        </Link>
        <div style={{display:'flex',gap:26,color:'rgba(232,216,184,.45)',fontSize:13}}>
          {[['#chars','الشخصيات'],['#voice','صوت حبايبك'],['#kids','التعلّم']].map(([h,l])=>(
            <a key={h} href={h} style={{transition:'.2s'}} onMouseEnter={e=>e.target.style.color='#c8b890'} onMouseLeave={e=>e.target.style.color='rgba(232,216,184,.45)'}>{l}</a>
          ))}
        </div>
        <Link to="/map" style={{border:'1px solid rgba(168,128,64,.3)',background:'rgba(168,128,64,.07)',color:'var(--gold)',padding:'8px 16px',borderRadius:999,fontSize:13,fontWeight:700}}>ابدأ رحلتك</Link>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════
          HERO — Parallax illustration
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{position:'relative',minHeight:'100svh',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',background:'#0a0806'}}>

        {/* Parallax BG illustration — اهرامات ومعابد */}
        <div style={{
          position:'absolute',inset:0,
          backgroundImage:'url(/image/background.png)',
          backgroundSize:'110% auto',
          backgroundPosition:'center bottom',
          backgroundRepeat:'no-repeat',
          opacity:.10,
          filter:'sepia(1) brightness(.4)',
          transform:`translateY(${scrollY * 0.28}px)`,
          willChange:'transform',
        }} />

        {/* Dark vignette */}
        <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 50% 60%,transparent 30%,#0a0806 80%)'}} />
        <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,#0a0806 0%,transparent 25%,transparent 70%,#0a0806 100%)'}} />

        {/* Floating hieroglyph symbols */}
        {['𓂀','𓋹','△','𓆣','𓏏','𓇋'].map((s,i)=>(
          <span key={i} style={{
            position:'absolute',color:'var(--gold)',
            opacity: .04 + (i%3)*.02,
            fontSize:`${1+i%3*.5}rem`,
            userSelect:'none',pointerEvents:'none',
            left:`${6+i*16}%`, top:`${10+(i%4)*18}%`,
            animation:`fl ${6+i*1.2}s ease-in-out ${i*.6}s infinite alternate`,
          }}>{s}</span>
        ))}

        {/* Mast-ship floating right — subtle */}
        <img src="/image/ship.png" alt="" style={{
          position:'absolute',right:'4%',bottom:'8%',
          width:'clamp(120px,16vw,240px)',
          opacity:.07, filter:'sepia(1) brightness(.5)',
          transform:`translateY(${scrollY * -0.12}px)`,
          pointerEvents:'none',
          animation:'fl2 8s ease-in-out infinite',
        }} />

        {/* Text */}
        <div className="rv in" style={{position:'relative',zIndex:2,textAlign:'center',padding:'0 22px',paddingTop:68}}>
          <div className="ey" style={{justifyContent:'center',marginBottom:20}}>مصر كما يرويها أهلها</div>

          <h1 style={{
            fontSize:'clamp(5.5rem,20vw,13rem)',fontWeight:900,lineHeight:.88,
            letterSpacing:'-.07em',color:'#d4c09a',
            textShadow:'0 0 120px rgba(168,128,64,.12)',
          }}>حكاوي</h1>

          <p style={{color:'rgba(200,180,140,.4)',fontSize:'clamp(14px,1.4vw,18px)',marginTop:18,letterSpacing:'.04em'}}>
            صوت الماضي، حيّ في الحاضر
          </p>
          <p style={{color:'rgba(168,128,64,.2)',fontSize:11,marginTop:6,letterSpacing:'.22em',textTransform:'uppercase'}}>
            The voice of the past · alive in the present
          </p>

          <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap',marginTop:40}}>
            <Link to="/map" className="btn btn-g">استكشف الخريطة <ArrowLeft size={14}/></Link>
            <Link to="/family" className="btn btn-o"><Mic size={14}/> سجّل صوت عيلتك</Link>
          </div>
        </div>

        {/* Scroll caret */}
        <div style={{position:'absolute',bottom:24,left:'50%',transform:'translateX(-50%)',textAlign:'center',color:'rgba(168,128,64,.3)',fontSize:10,letterSpacing:'.16em',zIndex:2}}>
          اكتشف<br/>
          <div style={{width:1,height:30,margin:'7px auto 0',background:'linear-gradient(var(--gold),transparent)',animation:'caret 1.8s ease-in-out infinite'}}/>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 1 — الشخصيات
      ══════════════════════════════════════════════════════════════════ */}
      <section id="chars" style={{
        borderTop:'1px solid var(--line)',
        background:'#09080a',
        position:'relative',overflow:'hidden',
        minHeight:'100svh',display:'flex',alignItems:'center',
      }}>
        {/* Floating mamar illustration — parallax */}
        <img src="/image/mamar.png" alt="" style={{
          position:'absolute',left:'-4%',bottom:'-2%',
          width:'clamp(180px,28vw,420px)',
          opacity:.05, filter:'sepia(1) brightness(.4)',
          transform:`translateY(${(scrollY - 600) * -0.1}px)`,
          pointerEvents:'none',
          animation:'fl 9s ease-in-out infinite',
        }}/>

        <div className="g2" style={{width:'100%',position:'relative',zIndex:2}}>

          {/* Copy */}
          <div>
            <div className="rv ey">01 — شخصيات من كل ركن</div>
            <h2 className={`rv d1 cf${fading?' fd':''}`} style={{
              fontSize:'clamp(36px,5vw,68px)',fontWeight:900,lineHeight:1.04,letterSpacing:'-.05em',
              color: region.accent,
              textShadow:`0 0 50px ${region.glow}`,
              transition:'color .4s ease, text-shadow .4s ease',
            }}>{region.name}</h2>
            <p className="rv d1" style={{color:'var(--muted)',fontSize:13,marginTop:4}}>{region.nameEn}</p>

            <blockquote className={`rv d2 qt cf${fading?' fd':''}`}>
              "{region.quote}"
              <small style={{display:'block',marginTop:10,fontStyle:'normal',color:'var(--muted)',fontSize:12}}>
                — {region.elderName}، {region.elderTitle}
              </small>
            </blockquote>

            {/* Tabs */}
            <div className="rv d2" style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:24}}>
              {REGIONS.map((r,i)=>(
                <button key={r.key} className="rtab" onClick={()=>goTo(i)} style={{
                  padding:'7px 14px',borderRadius:999,fontSize:12,fontWeight:700,
                  background: activeIdx===i ? r.accent : 'rgba(255,255,255,.04)',
                  color: activeIdx===i ? '#0a0806' : 'rgba(200,180,140,.4)',
                  borderColor: activeIdx===i ? r.accent : 'transparent',
                  boxShadow: activeIdx===i ? `0 0 18px ${r.glow}` : 'none',
                }}>{r.name}</button>
              ))}
            </div>

            <div className="rv d3" style={{marginTop:28}}>
              <Link to="/map" className="btn btn-g">تحدث مع الشخصية <ArrowLeft size={13}/></Link>
            </div>
          </div>

          {/* Portrait + mini map */}
          <div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'center',gap:20,minHeight:440}}>
            {/* Glow */}
            <div className={`cf${fading?' fd':''}`} style={{
              position:'absolute',inset:'-10%',
              background:`radial-gradient(ellipse at 40% 50%, ${region.glow} 0%, transparent 65%)`,
              transition:'background .5s ease',pointerEvents:'none',zIndex:0,
            }}/>

            {/* Photo */}
            <div className="rv" style={{position:'relative',zIndex:1}}>
              <img src={region.image} alt={region.elderName}
                className={`cf${fading?' fd':''}`}
                style={{
                  width:'clamp(180px,20vw,270px)',aspectRatio:'3/4',
                  objectFit:'cover',borderRadius:20,
                  border:`1px solid ${region.accent}25`,
                  boxShadow:`0 0 50px ${region.glow}, 0 20px 50px rgba(0,0,0,.7)`,
                  filter:'saturate(.55) brightness(.82)',
                }}
              />
              {/* Name badge */}
              <div className={`cf${fading?' fd':''}`} style={{
                position:'absolute',bottom:-12,left:'50%',transform:'translateX(-50%)',
                whiteSpace:'nowrap',zIndex:2,
                background:'rgba(10,8,6,.9)',backdropFilter:'blur(12px)',
                border:`1px solid ${region.accent}25`,borderRadius:999,
                padding:'5px 12px',fontSize:11,color:'var(--muted)',
                display:'flex',alignItems:'center',gap:5,
              }}>
                <span style={{width:5,height:5,borderRadius:'50%',background:region.accent,display:'inline-block',animation:'caret 2s ease-in-out infinite'}}/>
                {region.elderName}
              </div>
            </div>

            {/* Mini SVG map */}
            <div className="rv d1" style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
              <svg viewBox="0 0 260 500" style={{width:'clamp(70px,9vw,110px)',filter:'drop-shadow(0 6px 16px rgba(0,0,0,.5))'}}>
                <path d="M88 17L162 35L166 112L184 145L169 199L203 269L177 335L148 409L136 481L103 466L85 390L70 315L76 239L62 177L79 111L73 58Z"
                  fill="rgba(10,8,6,.85)" stroke="rgba(168,128,64,.25)" strokeWidth="1.6"/>
                <path d="M124 49C151 96 101 126 134 171C166 215 112 257 144 301C169 336 118 379 128 447"
                  fill="none" stroke="rgba(80,140,160,.4)" strokeWidth="2" strokeLinecap="round"
                  strokeDasharray="5 9" style={{animation:'nile 6s linear infinite'}}/>
                {REGIONS.map((r)=>(
                  <g key={r.key} className={`pin${region.key===r.key?' on':''}`} onClick={()=>goTo(REGIONS.indexOf(r))}>
                    <circle cx={r.mapCx} cy={r.mapCy} r={7}
                      fill={region.key===r.key ? r.accent : 'rgba(168,128,64,.18)'}
                      stroke={region.key===r.key ? r.accent : 'rgba(168,128,64,.3)'}
                      strokeWidth="2"/>
                    <text x={r.mapCx+11} y={r.mapCy+3}>{r.name}</text>
                  </g>
                ))}
              </svg>
              <p style={{fontSize:9,color:'var(--muted)',opacity:.4,letterSpacing:'.1em',textTransform:'uppercase'}}>اضغط للتنقل</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 2 — صوت حبايبك
      ══════════════════════════════════════════════════════════════════ */}
      <section id="voice" style={{
        borderTop:'1px solid var(--line)',
        background:'#080608',
        position:'relative',overflow:'hidden',
        minHeight:'100svh',display:'flex',alignItems:'center',
      }}>
        {/* Floating hieroglyph stone — parallax */}
        <img src="/image/noqush.png" alt="" style={{
          position:'absolute',right:'-6%',top:'10%',
          width:'clamp(200px,30vw,440px)',
          opacity:.055, filter:'sepia(1) brightness(.35)',
          transform:`translateY(${(scrollY - 1400) * -0.09}px)`,
          pointerEvents:'none',
          animation:'fl2 10s ease-in-out 1s infinite',
        }}/>

        <div className="g2" style={{width:'100%',position:'relative',zIndex:2}}>

          {/* Visual — memory card + waveform */}
          <div style={{position:'relative',minHeight:440,display:'grid',placeItems:'center'}}>
            {/* Sepia photo card */}
            <div className="rv" style={{
              position:'relative',width:'min(90%,520px)',aspectRatio:'1.2',
              borderRadius:20,overflow:'hidden',
              border:'1px solid rgba(168,128,64,.1)',boxShadow:'0 24px 60px rgba(0,0,0,.6)',
              background:'linear-gradient(160deg,#4a3420,#1c1008)',
              filter:'saturate(.35) brightness(.75)',
            }}>
              {/* CSS figure */}
              <div style={{position:'absolute',width:130,height:160,borderRadius:'50% 50% 42% 42%',top:70,left:'50%',transform:'translateX(-50%)',background:'linear-gradient(#8a5830,#522816)',boxShadow:'0 90px 0 50px #3a1e10, 0 -14px 0 9px #b89060'}}/>
              <div style={{position:'absolute',right:22,bottom:20,left:22,zIndex:3}}>
                <span style={{display:'block',color:'rgba(168,128,64,.7)',fontSize:11,marginBottom:5}}>ذاكرة عائلية — ١٩٧٨</span>
                <strong style={{fontSize:'clamp(14px,1.8vw,20px)',lineHeight:1.55,color:'rgba(220,200,160,.8)',fontWeight:700}}>
                  "كان كل بيت له حكاية،<br/>وكل حكاية تبدأ من القعدة."
                </strong>
              </div>
            </div>

            {/* Wave panel */}
            <div className="rv d1" style={{
              position:'absolute',right:-18,top:'50%',transform:'translateY(-50%)',
              width:'min(76%,340px)',padding:'14px 16px',
              border:'1px solid rgba(168,128,64,.15)',borderRadius:16,
              background:'rgba(8,6,8,.92)',backdropFilter:'blur(18px)',
              boxShadow:'0 20px 50px rgba(0,0,0,.5)',
            }}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <button onClick={togglePlay} style={{
                  width:42,height:42,borderRadius:'50%',border:0,
                  background:'var(--gold)',color:'#0a0806',fontWeight:900,
                  cursor:'pointer',fontSize:13,flexShrink:0,
                }}>{playing?'❚❚':'▶'}</button>
                <div style={{flex:1,height:50,display:'flex',alignItems:'center',gap:2.5,overflow:'hidden'}}>
                  {BARS.map(({i,h})=>(
                    <div key={i} style={{
                      width:3.5,minHeight:5,borderRadius:5,height:h,
                      background:'linear-gradient(var(--gold),rgba(168,128,64,.15))',
                      transformOrigin:'center',
                      transform:playing?'scaleY(1)':'scaleY(.3)',
                      transition:'transform .3s ease',
                      animation:playing?`wv ${.45+(i%7)*.1}s ease-in-out ${-i*.04}s infinite alternate`:'none',
                    }}/>
                  ))}
                </div>
              </div>
              <div style={{marginTop:9,display:'flex',justifyContent:'space-between',color:'var(--muted)',fontSize:11}}>
                <span>صوت من ذاكرة الأسرة</span>
                <span>{fmt(elapsed)} / {fmt(TOTAL)}</span>
              </div>
            </div>
          </div>

          {/* Copy */}
          <div>
            <div className="rv ey">02 — صوت حبايبك</div>
            <h2 className="rv d1" style={{fontSize:'clamp(36px,5vw,68px)',fontWeight:900,lineHeight:1.04,letterSpacing:'-.05em'}}>
              الصوت الذي تحبه<br/>
              <span style={{color:'#7a3030'}}>لا يختفي.</span>
            </h2>
            <p className="rv d2" style={{color:'var(--muted)',fontSize:'clamp(14px,1.2vw,17px)',lineHeight:1.9,marginTop:18}}>
              نسجّل صوت شخص عزيز، ثم نحفظ نبرته ولهجته داخل تجربة تسمح للعائلة أن تسمع حكاياته مرة أخرى.
            </p>
            <div className="qt rv d2">"سجّل صوت جدك قبل ما يختفي للأبد."</div>
            <div className="rv d3" style={{marginTop:24,display:'flex',flexDirection:'column',gap:9}}>
              {['سجّل صوت أي شخص بأي لهجة','الـ AI يحفظ نبرته وشخصيته','يتكلم مع عيلتك في المناسبات'].map((t,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:9,color:'var(--muted)',fontSize:13}}>
                  <div style={{width:4,height:4,borderRadius:'50%',background:'#7a3030',flexShrink:0}}/>
                  {t}
                </div>
              ))}
            </div>
            <div className="rv d3" style={{marginTop:26}}>
              <Link to="/family" className="btn btn-g"><Mic size={13}/> ابدأ التسجيل</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 3 — التعليم
      ══════════════════════════════════════════════════════════════════ */}
      <section id="kids" style={{
        borderTop:'1px solid var(--line)',
        background:'#07090a',
        position:'relative',overflow:'hidden',
        minHeight:'80svh',display:'flex',alignItems:'center',
      }}>
        {/* Floating ramz scroll illustration */}
        <img src="/image/ramz.png" alt="" style={{
          position:'absolute',left:'2%',bottom:'5%',
          width:'clamp(140px,20vw,300px)',
          opacity:.06, filter:'sepia(1) brightness(.4)',
          transform:`translateY(${(scrollY - 2300) * -0.08}px)`,
          pointerEvents:'none',
          animation:'fl 11s ease-in-out 2s infinite',
        }}/>

        <div style={{width:'100%',maxWidth:960,margin:'0 auto',padding:'90px clamp(20px,6vw,90px)',textAlign:'center',position:'relative',zIndex:2}}>
          <div className="rv ey" style={{justifyContent:'center'}}>03 — التعليم والأطفال</div>
          <h2 className="rv d1" style={{fontSize:'clamp(36px,5vw,68px)',fontWeight:900,letterSpacing:'-.05em',lineHeight:1.04}}>
            التاريخ يتحول إلى <span style={{color:'#2a5060'}}>مغامرة.</span>
          </h2>
          <p className="rv d2" style={{color:'var(--muted)',fontSize:'clamp(14px,1.2vw,17px)',lineHeight:1.9,maxWidth:580,margin:'16px auto 30px'}}>
            الطفل لا يشاهد معلومة فقط؛ يختار طريقًا، يفتح بوابة، يقابل شخصية، ويكتشف تراث كل منطقة بطريقة تفاعلية.
          </p>
          <div className="rv d2" style={{display:'flex',flexWrap:'wrap',gap:8,justifyContent:'center',marginBottom:30}}>
            {['قصص الأقصر','رموز النوبة','الأبجدية الهيروغليفية','أساطير الإسكندرية','حكايات القاهرة'].map(tag=>(
              <span key={tag} style={{padding:'7px 14px',borderRadius:999,fontSize:12,fontWeight:600,background:'rgba(42,80,96,.14)',border:'1px solid rgba(42,80,96,.28)',color:'rgba(80,140,160,.7)'}}>{tag}</span>
            ))}
          </div>
          <div className="rv d3">
            <Link to="/map" className="btn btn-g">استكشف الآن</Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════════ */}
      <footer style={{
        position:'relative',minHeight:'60svh',display:'grid',placeItems:'center',
        padding:'80px 22px',textAlign:'center',
        borderTop:'1px solid var(--line)',
        background:'linear-gradient(to bottom,#07060a,#0a0806)',
        overflow:'hidden',
      }}>
        {/* Ghost title */}
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',
          fontSize:'min(34vw,460px)',fontWeight:900,color:'rgba(168,128,64,.03)',
          letterSpacing:'-.08em',userSelect:'none',pointerEvents:'none',whiteSpace:'nowrap'}}>حكاوي</div>

        {/* Ship floating bottom */}
        <img src="/image/ship.png" alt="" style={{
          position:'absolute',right:'3%',bottom:'4%',
          width:'clamp(100px,14vw,200px)',
          opacity:.05,filter:'sepia(1) brightness(.4)',
          pointerEvents:'none',
          animation:'fl2 7s ease-in-out infinite',
        }}/>

        <div className="rv" style={{position:'relative',zIndex:2,maxWidth:700}}>
          <div className="ey" style={{justifyContent:'center'}}>جاهز تبدأ؟</div>
          <h2 style={{fontSize:'clamp(40px,7.5vw,98px)',fontWeight:900,letterSpacing:'-.068em',lineHeight:.9,marginBottom:18,color:'#c4ae88'}}>
            ابدأ رحلتك.
          </h2>
          <p style={{color:'var(--muted)',fontSize:16,marginBottom:30,lineHeight:1.75}}>
            اختر مكانًا على الخريطة، ودع أول حكاية تقودك إلى الباقي.
          </p>
          <Link to="/map" className="btn btn-g" style={{fontSize:16,padding:'14px 30px'}}>
            ادخل إلى حكاوي <ArrowLeft size={15}/>
          </Link>
          <p style={{color:'rgba(168,128,64,.12)',fontSize:11,marginTop:44,letterSpacing:'.1em'}}>
            Cairo University · AI Nexus Hackathon 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
