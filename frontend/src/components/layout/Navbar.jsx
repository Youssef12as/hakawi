import { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Map, Users, Landmark, BookOpen, Menu, X } from 'lucide-react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const isLanding = location.pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Navigation links — mix of routes and anchor links (for landing page)
  const navLinks = [
    { to: '/map', label: 'الخريطة', icon: Map },
    { to: isLanding ? '#chars' : '/map', label: 'الشخصيات', icon: Landmark, isAnchor: isLanding },
    { to: isLanding ? '#living-wall' : '/#living-wall', label: 'الجدار الحي', icon: BookOpen, isAnchor: isLanding },
    { to: '/family', label: 'شجرة العيلة', icon: Users },
  ];

  const handleClick = (link) => {
    setIsOpen(false);
    if (link.isAnchor && link.to.startsWith('#')) {
      const el = document.querySelector(link.to);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // On non-landing pages the page content doesn't scroll (fixed-height layouts),
  // so the scroll listener never fires. Force the "visible" style for all routes
  // except the landing page where the hero overlay effect is intentional.
  const isVisible = !isLanding || scrolled;

  const navStyle = {
    position: 'fixed',
    top: 0,
    right: 0,
    left: 0,
    zIndex: 500,
    height: 70,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 clamp(18px,5vw,72px)',
    background: isVisible ? 'rgba(14,11,8,.92)' : 'transparent',
    backdropFilter: isVisible ? 'blur(20px)' : 'none',
    WebkitBackdropFilter: isVisible ? 'blur(20px)' : 'none',
    borderBottom: `1px solid ${isVisible ? 'rgba(255,220,140,.08)' : 'transparent'}`,
    transition: 'all .4s ease',
    fontFamily: "'Noto Kufi Arabic', 'IBM Plex Sans Arabic', sans-serif",
    direction: 'rtl',
  };

  return (
    <nav style={navStyle} id="main-nav">
      {/* Logo — single حكاوي */}
      <Link to="/" style={{
        fontSize: 24,
        fontWeight: 900,
        letterSpacing: '-.03em',
        color: '#f0e0c8',
        textDecoration: 'none',
        fontFamily: "'Noto Kufi Arabic', sans-serif",
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{ fontSize: 20 }}>🏛️</span>
        حكاوي<span style={{ color: '#c89830' }}>.</span>
      </Link>

      {/* Desktop Links */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} className="desktop-nav">
        {navLinks.map((link) => (
          link.isAnchor ? (
            <a
              key={link.to}
              href={link.to}
              onClick={(e) => { e.preventDefault(); handleClick(link); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 600,
                color: 'rgba(240,224,200,.6)',
                textDecoration: 'none',
                transition: 'all .25s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => { e.target.style.color = '#f0e0c8'; e.target.style.background = 'rgba(240,224,200,.08)'; }}
              onMouseLeave={(e) => { e.target.style.color = 'rgba(240,224,200,.6)'; e.target.style.background = 'transparent'; }}
            >
              <link.icon size={15} />
              {link.label}
            </a>
          ) : (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => handleClick(link)}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 600,
                color: isActive ? '#c89830' : 'rgba(240,224,200,.6)',
                background: isActive ? 'rgba(200,152,48,.12)' : 'transparent',
                textDecoration: 'none',
                transition: 'all .25s ease',
              })}
            >
              <link.icon size={15} />
              {link.label}
            </NavLink>
          )
        ))}

        {/* CTA Button */}
        <Link to="/map" style={{
          border: '1px solid rgba(200,152,48,.4)',
          background: 'rgba(200,152,48,.12)',
          color: '#c89830',
          padding: '9px 20px',
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 700,
          textDecoration: 'none',
          marginRight: 8,
          transition: 'all .25s ease',
        }}>
          ابدأ رحلتك
        </Link>
      </div>

      {/* Mobile Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'none',
          background: 'none',
          border: 'none',
          color: 'rgba(240,224,200,.7)',
          cursor: 'pointer',
          padding: 8,
        }}
        className="mobile-toggle"
        aria-label="القائمة"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Menu */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 70,
          right: 0,
          left: 0,
          background: 'rgba(14,11,8,.96)',
          backdropFilter: 'blur(20px)',
          padding: '12px 20px 20px',
          borderBottom: '1px solid rgba(255,220,140,.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}>
          {navLinks.map((link) => (
            link.isAnchor ? (
              <a
                key={link.to}
                href={link.to}
                onClick={(e) => { e.preventDefault(); handleClick(link); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 16px',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'rgba(240,224,200,.6)',
                  textDecoration: 'none',
                }}
              >
                <link.icon size={18} />
                {link.label}
              </a>
            ) : (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => handleClick(link)}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 16px',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  color: isActive ? '#c89830' : 'rgba(240,224,200,.6)',
                  background: isActive ? 'rgba(200,152,48,.12)' : 'transparent',
                  textDecoration: 'none',
                })}
              >
                <link.icon size={18} />
                {link.label}
              </NavLink>
            )
          ))}
        </div>
      )}

      {/* Responsive CSS */}
      <style>{`
        @media (max-width: 860px) {
          .desktop-nav { display: none !important; }
          .mobile-toggle { display: block !important; }
        }
      `}</style>
    </nav>
  );
}
