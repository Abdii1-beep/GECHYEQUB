import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../lib/api';

interface SidebarStats {
  kycPending: number;
  fraudAlerts: number;
  pendingPayments: number;
}

const AdminSidebar: React.FC = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [stats, setStats] = useState<SidebarStats>({ kycPending: 0, fraudAlerts: 0, pendingPayments: 0 });
  const [collapsed, setCollapsed] = useState(false);

  // Poll for live badge counts every 30 s
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getAdminStats();
        if (res.success && res.data) {
          setStats({
            kycPending: res.data.kycNotVerified ?? 0,
            fraudAlerts: res.data.suspiciousActivities ?? 0,
            pendingPayments: res.data.pendingPayments ?? 0,
          });
        }
      } catch { /* silent */ }
    };
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  const active = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const NAV: {
    key: string;
    label: string;
    icon: string;
    path: string;
    badge?: number;
    badgeColor?: string;
  }[] = [
    { key: 'dashboard', label: 'Dashboard',     icon: '📊', path: '/admin/dashboard' },
    { key: 'campaigns', label: 'Campaigns',     icon: '🎯', path: '/admin/campaigns' },
    { key: 'draws',     label: 'Live Draws',    icon: '🎲', path: '/admin/draws' },
    { key: 'tickets',   label: 'Tickets',       icon: '🎫', path: '/admin/tickets' },
    { key: 'customers', label: 'Customers',     icon: '👥', path: '/admin/customers' },
    { key: 'kyc',       label: 'KYC Review',    icon: '✅', path: '/admin/kyc',      badge: stats.kycPending,     badgeColor: 'bg-amber-500' },
    { key: 'payments',  label: 'Payments',      icon: '💳', path: '/admin/payments', badge: stats.pendingPayments, badgeColor: 'bg-blue-500' },
    { key: 'winners',   label: 'Winners',       icon: '🏆', path: '/admin/winners' },
    { key: 'fraud',     label: 'Fraud Monitor', icon: '🔍', path: '/admin/fraud',    badge: stats.fraudAlerts,    badgeColor: 'bg-red-500 animate-glow-pulse' },
    { key: 'audit',     label: 'Audit Logs',    icon: '📋', path: '/admin/audit' },
    { key: 'settings',  label: 'Settings',      icon: '⚙️', path: '/admin/settings' },
  ];

  const sideW = collapsed ? 'w-[68px]' : 'w-64';

  return (
    <aside
      className={`${sideW} bg-gray-900 border-r border-white/8 min-h-screen flex flex-col fixed left-0 top-0 z-40 transition-all duration-300`}
    >
      {/* Brand */}
      <div className="p-4 border-b border-white/8 flex items-center gap-3 overflow-hidden">
        <div
          onClick={() => navigate('/admin/dashboard')}
          className="flex items-center gap-3 cursor-pointer group flex-shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 p-1 flex items-center justify-center shadow-md group-hover:border-yellow-500/40 transition-colors flex-shrink-0">
            <img src="/logo.png" alt="GECHO YEMKINA EQUB Logo" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-white font-bold leading-tight group-hover:text-yellow-400 transition-colors text-sm truncate">
                GECHO YEMKINA EQUB
              </h1>
              <p className="text-yellow-400/80 text-[10px] font-medium tracking-wide">Admin Portal</p>
            </div>
          )}
        </div>
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="ml-auto flex-shrink-0 w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            {collapsed
              ? <path d="M4 2l4 4-4 4" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round"/>
              : <path d="M8 2L4 6l4 4" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round"/>
            }
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {!collapsed && (
          <div className="text-white/20 text-[10px] uppercase tracking-widest font-semibold px-3 mb-2">
            Navigation
          </div>
        )}
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const isActive = active(item.path);
            const showBadge = item.badge !== undefined && item.badge > 0;

            return (
              <li key={item.key}>
                <button
                  onClick={() => navigate(item.path)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-left text-sm relative group ${
                    isActive
                      ? 'bg-yellow-500/15 text-yellow-400 font-semibold shadow-[inset_3px_0_0_theme(colors.yellow.500)]'
                      : 'text-white/50 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {/* Active indicator line */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-yellow-400 rounded-r-full" />
                  )}

                  <span className="relative flex-shrink-0 text-base leading-none">
                    {item.icon}
                    {showBadge && (
                      <span className={`nav-badge ${item.badgeColor || 'bg-red-500'}`}>
                        {item.badge! > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </span>

                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{item.label}</span>
                      {showBadge && (
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${item.badgeColor || 'bg-red-500'} text-white flex-shrink-0`}>
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}

                  {/* Tooltip for collapsed mode */}
                  {collapsed && (
                    <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-800 border border-white/15 text-white text-xs rounded-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl">
                      {item.label}
                      {showBadge && (
                        <span className="ml-1.5 text-red-400 font-black">({item.badge})</span>
                      )}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom actions */}
      <div className="p-2 border-t border-white/8 space-y-1">
        <button
          onClick={() => navigate('/')}
          title={collapsed ? 'Back to Site' : undefined}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/40 hover:bg-white/5 hover:text-white transition-all text-sm"
        >
          <span className="flex-shrink-0">🏠</span>
          {!collapsed && <span>Back to Site</span>}
        </button>
        <button
          onClick={handleLogout}
          title={collapsed ? 'Logout' : undefined}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400/60 hover:bg-red-500/10 hover:text-red-400 transition-all text-sm"
        >
          <span className="flex-shrink-0">🚪</span>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
