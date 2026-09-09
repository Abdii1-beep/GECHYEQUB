import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSelector from './LanguageSelector';

interface NavbarProps {
  authenticated?: boolean;
  onLogout?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ authenticated, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation(['common', 'navigation', 'auth']);
  const isAuthenticated = authenticated ?? !!localStorage.getItem('auth_token');
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Get user initials for avatar
  const userRaw = localStorage.getItem('user');
  let userInitials = 'U';
  let userName = '';
  try {
    const u = userRaw ? JSON.parse(userRaw) : null;
    const name = u?.fullName || u?.customerProfile?.fullName || u?.username || '';
    userName = name;
    if (name) {
      const parts = name.trim().split(' ');
      userInitials = parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0]?.[0]?.toUpperCase() || 'U';
    }
  } catch { /* ignore */ }

  // Scroll-aware shrink
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [location]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    setMobileOpen(false);
    if (onLogout) onLogout();
    else navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: '/', label: 'Home' },
    ...(isAuthenticated ? [
      { path: '/dashboard', label: t('navigation:dashboard') },
      { path: '/profile',   label: t('navigation:profile') },
    ] : []),
  ];

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full border-b border-white/10 transition-all duration-300 ${
          scrolled
            ? 'bg-dark-950/95 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)] h-16'
            : 'bg-dark-950/80 backdrop-blur-xl h-20'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">

          {/* Logo */}
          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-3 cursor-pointer group select-none flex-shrink-0"
          >
            <div className={`relative rounded-2xl bg-gradient-to-tr from-primary-600 via-primary-500 to-accent-400 p-[1.5px] shadow-[0_0_20px_rgba(14,165,233,0.35)] group-hover:shadow-[0_0_30px_rgba(14,165,233,0.65)] transition-all duration-300 ${scrolled ? 'w-10 h-10' : 'w-12 h-12'}`}>
              <div className="w-full h-full bg-dark-950 rounded-[14px] p-1.5 flex items-center justify-center overflow-hidden">
                <img
                  src="/logo.png"
                  alt="GECHO YEMKINA EQUB"
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                />
              </div>
            </div>
            <div className={`transition-all duration-300 ${scrolled ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'} hidden sm:block`}>
              <span className="text-xl font-display font-extrabold tracking-tight text-white block group-hover:text-primary-300 transition-colors">
                GECHO <span className="text-accent-400">YEMKINA EQUB</span>
              </span>
              <span className="text-[10px] font-semibold text-white/40 tracking-widest uppercase block -mt-1">
                Premier Vehicle Equb
              </span>
            </div>
          </div>

          {/* Center Nav (Desktop) */}
          <nav className="hidden md:flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 backdrop-blur-md">
            {navLinks.map(link => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
                  isActive(link.path)
                    ? 'bg-primary-500/20 text-primary-300 shadow-[0_0_12px_rgba(14,165,233,0.3)]'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSelector />

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                {/* User avatar pill */}
                <button
                  onClick={() => navigate('/profile')}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all group"
                  title="Go to Profile"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-[11px] font-black shadow-inner flex-shrink-0">
                    {userInitials}
                  </div>
                  {userName && (
                    <span className="text-white/80 text-xs font-semibold max-w-[80px] truncate group-hover:text-white transition-colors">
                      {userName.split(' ')[0]}
                    </span>
                  )}
                </button>

                <button
                  onClick={handleLogout}
                  className="hidden sm:block px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl transition-all duration-200 cursor-pointer"
                >
                  {t('navigation:logout')}
                </button>

                {/* Mobile hamburger */}
                <button
                  onClick={() => setMobileOpen(o => !o)}
                  className="md:hidden w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                    {mobileOpen
                      ? <path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
                      : <path d="M2 5h14M2 9h14M2 13h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
                    }
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/login')}
                  className="hidden sm:block px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/80 hover:text-white transition-colors"
                >
                  {t('navigation:login')}
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="relative group overflow-hidden rounded-xl p-[1px] font-bold text-xs uppercase tracking-wider"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-500 via-accent-400 to-primary-600 group-hover:scale-105 transition-transform duration-300" />
                  <div className="relative px-4 py-2 bg-dark-900 rounded-[11px] text-white group-hover:bg-opacity-80 transition-all flex items-center gap-1.5">
                    <span className="hidden sm:inline">{t('navigation:register')}</span>
                    <span className="sm:hidden">Join</span>
                    <span className="text-accent-400 font-extrabold group-hover:translate-x-0.5 transition-transform">→</span>
                  </div>
                </button>

                {/* Mobile hamburger */}
                <button
                  onClick={() => setMobileOpen(o => !o)}
                  className="md:hidden w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                    {mobileOpen
                      ? <path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
                      : <path d="M2 5h14M2 9h14M2 13h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
                    }
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Mobile menu overlay ────────────────────────────────── */}
      {mobileOpen && (
        <>
          <div
            className="mobile-menu-overlay"
            onClick={() => setMobileOpen(false)}
          />
          <div className="mobile-menu-panel animate-slide-in-left">
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-accent-400 p-[1px]">
                  <div className="w-full h-full bg-dark-900 rounded-[10px] p-1 flex items-center justify-center">
                    <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                  </div>
                </div>
                <span className="text-white font-bold text-sm">GECHO EQUB</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* User pill (if auth) */}
            {isAuthenticated && userName && (
              <div className="mx-4 mt-4 p-3 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-black">
                  {userInitials}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{userName}</p>
                  <p className="text-white/40 text-xs">Logged in</p>
                </div>
              </div>
            )}

            {/* Nav links */}
            <nav className="flex-1 p-4 space-y-1">
              {navLinks.map(link => (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    isActive(link.path)
                      ? 'bg-primary-500/20 text-primary-300'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </nav>

            {/* Bottom actions */}
            <div className="p-4 border-t border-white/10 space-y-2">
              {isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="w-full py-3 px-4 bg-red-500/10 border border-red-500/30 text-red-400 font-bold text-sm rounded-xl hover:bg-red-500/20 transition-colors"
                >
                  🚪 Logout
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/login')}
                    className="w-full py-3 px-4 bg-white/5 border border-white/10 text-white font-semibold text-sm rounded-xl hover:bg-white/10 transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => navigate('/register')}
                    className="w-full py-3 px-4 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-bold text-sm rounded-xl"
                  >
                    Register →
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Navbar;
