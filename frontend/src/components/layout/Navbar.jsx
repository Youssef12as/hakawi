import { useState, useEffect } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { Map, Users, Menu, X, User, LogIn, LogOut, Compass, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isLanding = location.pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { to: '/map', label: 'خريطة التراث', icon: Map },
    { to: '/family', label: 'شجرة العيلة', icon: Users },
  ];

  const handleClick = () => {
    setIsOpen(false);
  };

  const handleLogout = async () => {
    setIsOpen(false);
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const isVisible = !isLanding || scrolled;

  const navStyle = {
    position: 'fixed',
    top: 0,
    right: 0,
    left: 0,
    zIndex: 500,
    height: 72,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 clamp(20px, 5vw, 72px)',
    background: isVisible ? 'rgba(14, 11, 8, 0.92)' : 'transparent',
    backdropFilter: isVisible ? 'blur(20px)' : 'none',
    WebkitBackdropFilter: isVisible ? 'blur(20px)' : 'none',
    borderBottom: `1px solid ${isVisible ? 'rgba(200, 152, 48, 0.16)' : 'transparent'}`,
    boxShadow: isVisible ? '0 10px 30px rgba(0, 0, 0, 0.6)' : 'none',
    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    fontFamily: "'Noto Kufi Arabic', 'IBM Plex Sans Arabic', sans-serif",
    direction: 'rtl',
  };

  const displayName = user?.user_metadata?.full_name?.split(' ')[0] || user?.profile?.display_name?.split(' ')[0] || 'الملف الشخصي';

  return (
    <nav style={navStyle} id="main-nav">
      {/* Brand Mark Logo */}
      <Link
        to="/"
        className="hover-lift"
        style={{
          fontSize: 24,
          fontWeight: 900,
          letterSpacing: 'normal',
          color: '#fff8ee',
          textDecoration: 'none',
          fontFamily: "'Noto Kufi Arabic', sans-serif",
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        {/* Cultural SVG Glyph */}
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(200,152,48,0.25), rgba(200,152,48,0.05))',
            border: '1px solid rgba(200,152,48,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(200,152,48,0.2)',
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="url(#goldGrad)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <defs>
              <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f0d078" />
                <stop offset="100%" stopColor="#c89830" />
              </linearGradient>
            </defs>
            <path d="M3 21h18" />
            <path d="M4 21V10l8-6 8 6v11" />
            <path d="M9 21v-7a3 3 0 0 1 6 0v7" />
            <circle cx="12" cy="7" r="1" fill="#c89830" />
          </svg>
        </div>

        <span>
          حكاوي<span style={{ color: '#c89830', fontSize: '1.2em' }}>.</span>
        </span>
      </Link>

      {/* Desktop Navigation Links */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} className="desktop-nav">
        {navLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={handleClick}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 18px',
              borderRadius: 999,
              fontSize: 13.5,
              fontWeight: 600,
              color: isActive ? '#fff8ee' : 'rgba(240,224,200,0.7)',
              background: isActive
                ? 'linear-gradient(135deg, rgba(200,152,48,0.22), rgba(200,152,48,0.08))'
                : 'transparent',
              border: isActive ? '1px solid rgba(200,152,48,0.38)' : '1px solid transparent',
              boxShadow: isActive ? '0 0 20px rgba(200,152,48,0.15)' : 'none',
              textDecoration: 'none',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            })}
          >
            <link.icon size={16} className="text-[#c89830]" />
            <span>{link.label}</span>
          </NavLink>
        ))}

        {/* Living Wall Anchor for Landing */}
        {isLanding && (
          <a
            href="#living-wall"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 999,
              fontSize: 13.5,
              fontWeight: 600,
              color: 'rgba(240,224,200,0.7)',
              textDecoration: 'none',
              transition: 'all 0.25s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#c89830';
              e.currentTarget.style.background = 'rgba(200,152,48,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(240,224,200,0.7)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Sparkles size={15} className="text-[#c89830]" />
            <span>الجدار الحي</span>
          </a>
        )}

        {/* User Auth Section */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
            {/* Profile Button */}
            <NavLink
              to="/profile"
              onClick={handleClick}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 16px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                color: isActive ? '#c89830' : '#f0e0c8',
                background: isActive ? 'rgba(200,152,48,0.2)' : 'rgba(24, 18, 12, 0.8)',
                border: '1px solid rgba(200,152,48,0.35)',
                textDecoration: 'none',
                transition: 'all 0.25s ease',
              })}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #c89830, #805010)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0e0b08',
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                {displayName.charAt(0)}
              </div>
              <span>{displayName}</span>
            </NavLink>

            {/* Logout Quick Action */}
            <button
              onClick={handleLogout}
              title="تسجيل الخروج"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: '#f87171',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239,68,68,0.22)';
                e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)';
              }}
              aria-label="تسجيل الخروج"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          /* Login CTA */
          <Link
            to="/login"
            className="hover-lift"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 22px',
              borderRadius: 999,
              fontSize: 13.5,
              fontWeight: 700,
              color: '#0e0b08',
              background: 'linear-gradient(135deg, #e8bc58 0%, #c89830 100%)',
              textDecoration: 'none',
              boxShadow: '0 4px 18px rgba(200,152,48,0.3)',
              marginRight: 8,
              transition: 'all 0.25s ease',
            }}
          >
            <LogIn size={15} />
            <span>تسجيل الدخول</span>
          </Link>
        )}
      </div>

      {/* Mobile Toggle Button (min 44x44px touch target) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'none',
          background: 'rgba(200,152,48,0.1)',
          border: '1px solid rgba(200,152,48,0.25)',
          borderRadius: 10,
          color: '#f0e0c8',
          cursor: 'pointer',
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        className="mobile-toggle"
        aria-label={isOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
      >
        {isOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Mobile Drawer Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 72,
            right: 0,
            left: 0,
            background: 'rgba(14, 11, 8, 0.98)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            padding: '16px 20px 24px',
            borderBottom: '1px solid rgba(200, 152, 48, 0.25)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            animation: 'fadeIn 0.25s ease-out',
          }}
        >
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={handleClick}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 18px',
                borderRadius: 14,
                fontSize: 15,
                fontWeight: 600,
                color: isActive ? '#c89830' : '#f0e0c8',
                background: isActive ? 'rgba(200, 152, 48, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: isActive ? '1px solid rgba(200, 152, 48, 0.3)' : '1px solid transparent',
                textDecoration: 'none',
              })}
            >
              <link.icon size={20} className="text-[#c89830]" />
              <span>{link.label}</span>
            </NavLink>
          ))}

          {isLanding && (
            <a
              href="#living-wall"
              onClick={handleClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 18px',
                borderRadius: 14,
                fontSize: 15,
                fontWeight: 600,
                color: '#f0e0c8',
                background: 'rgba(255, 255, 255, 0.03)',
                textDecoration: 'none',
              }}
            >
              <Sparkles size={20} className="text-[#c89830]" />
              <span>الجدار الحي</span>
            </a>
          )}

          {/* User Mobile Options */}
          {user ? (
            <>
              <NavLink
                to="/profile"
                onClick={handleClick}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 18px',
                  borderRadius: 14,
                  fontSize: 15,
                  fontWeight: 600,
                  color: isActive ? '#c89830' : '#f0e0c8',
                  background: 'rgba(200, 152, 48, 0.12)',
                  border: '1px solid rgba(200, 152, 48, 0.25)',
                  textDecoration: 'none',
                  marginTop: 4,
                })}
              >
                <User size={20} className="text-[#c89830]" />
                <span>الملف الشخصي ({displayName})</span>
              </NavLink>

              <button
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 18px',
                  borderRadius: 14,
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#f87171',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'right',
                }}
              >
                <LogOut size={20} />
                <span>تسجيل الخروج</span>
              </button>
            </>
          ) : (
            <Link
              to="/login"
              onClick={handleClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                padding: '14px 18px',
                borderRadius: 14,
                fontSize: 15,
                fontWeight: 700,
                color: '#0e0b08',
                background: 'linear-gradient(135deg, #e8bc58, #c89830)',
                textDecoration: 'none',
                marginTop: 8,
                boxShadow: '0 4px 20px rgba(200,152,48,0.3)',
              }}
            >
              <LogIn size={18} />
              <span>تسجيل الدخول</span>
            </Link>
          )}
        </div>
      )}

      {/* Responsive Media Query */}
      <style>{`
        @media (max-width: 860px) {
          .desktop-nav { display: none !important; }
          .mobile-toggle { display: flex !important; }
        }
      `}</style>
    </nav>
  );
}
