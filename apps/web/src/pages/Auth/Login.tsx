import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import Navbar from '../../components/Navbar';
import PageWrapper from '../../components/PageWrapper';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'auth', 'navigation']);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const doLogin = async (targetUsername: string, targetPass: string) => {
    setError('');
    setLoading(true);
    try {
      const res = await api.login(targetUsername.trim(), targetPass);
      if (res.success && res.data) {
        const user = res.data.user;
        const role = user?.role;
        const isAdminRole = [
          'SUPER_ADMIN',
          'LOTTERY_MANAGER',
          'DRAW_OFFICER',
          'FINANCE_OFFICER',
          'KYC_OFFICER',
          'AUDITOR',
          'CONTENT_MANAGER'
        ].includes(role || '');

        localStorage.setItem('auth_token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));

        if (isAdminRole) {
          navigate('/admin/dashboard');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(res.error || t('auth:invalidCredentials'));
      }
    } catch {
      setError(t('auth:invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please provide both username and password.');
      return;
    }
    await doLogin(username, password);
  };

  const fillDemo = (demoUsername: string, demoPass: string) => {
    setUsername(demoUsername);
    setPassword(demoPass);
    setError('');
  };

  return (
    <PageWrapper>
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-5 my-8">
        <div className="w-full max-w-md mx-auto animate-scale-in">
          {/* Main Card */}
          <div className="glass shadow-card-lg rounded-3xl p-8 border border-white/10">
            {/* Logo + Heading */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-dark-950/80 border border-white/10 rounded-2xl flex items-center justify-center shadow-glow mx-auto mb-4 p-2">
                <img src="/logo.png" alt="GECHO YEMKINA EQUB" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-3xl font-display font-bold text-white mb-1">
                {t('auth:login')}
              </h1>
              <p className="text-white/50 text-sm">
                Welcome back — sign in to continue
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mb-5 p-3.5 bg-red-500/15 border border-red-500/30 text-red-300 rounded-xl text-sm animate-fade-in flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Unified Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div>
                <label className="block text-white/80 text-sm font-semibold mb-1.5">
                  Username
                </label>
                <input
                  id="login-username"
                  type="text"
                  className="input"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-white/80 text-sm font-semibold">
                    {t('auth:password')}
                  </label>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPw ? 'text' : 'password'}
                    className="input pr-11"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors p-1"
                    tabIndex={-1}
                  >
                    {showPw ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="w-full py-3.5 text-base mt-2 font-bold rounded-2xl btn-primary shadow-glow transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('auth:loggingIn')}
                  </span>
                ) : (
                  <span>Sign In →</span>
                )}
              </button>
            </form>

            {/* Quick Demo Fill Buttons */}
            <div className="mt-6 pt-5 border-t border-white/10">
              <div className="flex items-center justify-between text-xs text-white/40 mb-2">
                <span>Quick demo credentials:</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fillDemo('customer', 'Password123!')}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary-500/40 rounded-xl text-left text-xs transition-all"
                >
                  <div className="text-white font-medium flex items-center gap-1.5">
                    <span>👤</span> Customer
                  </div>
                  <div className="text-white/40 text-[10px] truncate">customer</div>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo('admin', 'Password123!')}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-yellow-500/40 rounded-xl text-left text-xs transition-all"
                >
                  <div className="text-yellow-400 font-medium flex items-center gap-1.5">
                    <span>👑</span> Admin
                  </div>
                  <div className="text-white/40 text-[10px] truncate">admin</div>
                </button>
              </div>
            </div>

            {/* Register link */}
            <p className="mt-6 text-center text-white/50 text-sm">
              {t('auth:noAccount')}{' '}
              <button
                onClick={() => navigate('/register')}
                className="text-primary-400 hover:text-primary-300 font-semibold transition-colors ml-1"
              >
                {t('auth:registerHere')}
              </button>
            </p>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default Login;