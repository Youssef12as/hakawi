import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Map, Users, Settings, Menu, X } from 'lucide-react';

const navLinks = [
  { to: '/map', label: 'الخريطة', icon: Map },
  { to: '/family', label: 'شجرة العيلة', icon: Users },
  { to: '/settings', label: 'الإعدادات', icon: Settings },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 inset-x-0 z-50 glass-dark" id="main-nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group" id="nav-logo">
            <span className="text-2xl" role="img" aria-label="heritage">🏛️</span>
            <div className="flex flex-col leading-tight">
              <span className="text-xl font-extrabold text-sand group-hover:text-wine transition-colors duration-300">
                حكاوي
              </span>
              <span className="text-[10px] text-sand/40 font-medium tracking-wider -mt-0.5">
                HIKAWI
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                id={`nav-${to.replace('/', '')}`}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    isActive
                      ? 'bg-wine/20 text-wine'
                      : 'text-sand/60 hover:text-sand hover:bg-sand/8'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
          </div>

          {/* Mobile Toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-sand/70 hover:text-sand transition-colors p-2 rounded-lg"
            aria-label="القائمة"
            id="mobile-menu-toggle"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ${
            isOpen ? 'max-h-60 pb-4' : 'max-h-0'
          }`}
        >
          {navLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-wine/20 text-wine'
                    : 'text-sand/60 hover:text-sand hover:bg-sand/8'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
