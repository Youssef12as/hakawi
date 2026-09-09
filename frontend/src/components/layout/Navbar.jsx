import { useState, useEffect } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { Map, Users, Menu, X, User, LogIn, LogOut, MessageCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isLanding = location.pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { to: '/map', label: 'الخريطة', icon: Map },
    { to: '/family', label: 'شجرة العيلة', icon: Users },
    { to: '/history', label: 'محادثاتي', icon: MessageCircle },
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

  const displayName = user?.user_metadata?.full_name?.split(' ')[0] || 'الملف الشخصي';

  return (
    <nav style={navStyle} id="main-nav">
      {/* Logo — single حكاوي */}
      <Link
        to="/"
        style={{
          fontSize: 24,
          fontWeight: 900,
          letterSpacing: '-.03em',
          color: '#f0e0c8',
          textDecoration: 'none',
          fontFamily: "'Noto Kufi Arabic', sans-serif",
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 20 }}>🏛️</span>
        حكاوي<span style={{ color: '#c89830' }}>.</span>
      </Link>

      {/* Desktop Links */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} className="desktop-nav">
        {navLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={handleClick}
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
        ))}

        {/* User Auth Section */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Profile Button */}
            <NavLink
              to="/profile"
              onClick={handleClick}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 600,
                color: isActive ? '#c89830' : '#f0e0c8',
                background: isActive ? 'rgba(200,152,48,.18)' : 'rgba(240,224,200,.08)',
                border: '1px solid rgba(200,152,48,.3)',
                textDecoration: 'none',
                transition: 'all .25s ease',
              })}
            >
              <User size={15} className="text-[#c89830]" />
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
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(239,68,68,.1)',
                border: '1px solid rgba(239,68,68,.2)',
                color: '#f87171',
                cursor: 'pointer',
                transition: 'all .25s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,.1)'; }}
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          /* Login Button */
          <Link
            to="/login"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 18px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
              color: '#0e0b08',
              background: 'linear-gradient(135deg, #e8bc58, #c89830)',
              textDecoration: 'none',
              boxShadow: '0 4px 15px rgba(200,152,48,.25)',
              marginRight: 6,
              transition: 'all .25s ease',
            }}
          >
            <LogIn size={15} />
            تسجيل الدخول
          </Link>
        )}

        {/* Start Journey CTA */}
        <Link
          to="/map"
          style={{
            border: '1px solid rgba(200,152,48,.4)',
            background: 'rgba(200,152,48,.12)',
            color: '#c89830',
            padding: '8px 18px',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 700,
            textDecoration: 'none',
            marginRight: 6,
            transition: 'all .25s ease',
          }}
        >
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
        <div
          style={{
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
            gap: 6,
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
          ))}

          {/* User Mobile Options */}
          {user ? (
            <>
              <NavLink
                to="/profile"
                onClick={handleClick}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 16px',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  color: isActive ? '#c89830' : '#f0e0c8',
                  background: 'rgba(200,152,48,.1)',
                  textDecoration: 'none',
                })}
              >
                <User size={18} className="text-[#c89830]" />
                الملف الشخصي ({displayName})
              </NavLink>

              <button
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 16px',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#f87171',
                  background: 'rgba(239,68,68,.1)',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'right',
                }}
              >
                <LogOut size={18} />
                تسجيل الخروج
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
                gap: 8,
                padding: '12px 16px',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                color: '#0e0b08',
                background: 'linear-gradient(135deg, #e8bc58, #c89830)',
                textDecoration: 'none',
                marginTop: 6,
              }}
            >
              <LogIn size={18} />
              تسجيل الدخول
            </Link>
          )}
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
