import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import Navbar from '../../components/Navbar';
import PageWrapper from '../../components/PageWrapper';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'auth', 'navigation']);
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', confirmPassword: '', fullName: '', phone: '',
  });
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError(t('auth:passwordsDoNotMatch'));
      return;
    }
    if (formData.password.length < 6) {
      setError(t('auth:passwordTooShort'));
      return;
    }
    setLoading(true);
    try {
      const res = await api.register(formData.username, formData.email, formData.password, formData.fullName, formData.phone);
      if (res.success && res.data) {
        localStorage.setItem('auth_token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        navigate('/dashboard');
      } else {
        setError(res.error || 'Registration failed. Please check your details.');
      }
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please check your connection or details.');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { name: 'username',        label: 'Username',                type: 'text',     placeholder: 'Choose a username',                 autoComplete: 'username' },
    { name: 'fullName',        label: t('auth:fullName'),        type: 'text',     placeholder: t('auth:fullNamePlaceholder'),        autoComplete: 'name' },
    { name: 'email',           label: t('auth:email'),           type: 'email',    placeholder: t('auth:emailPlaceholder'),           autoComplete: 'email' },
    { name: 'phone',           label: t('auth:phone'),           type: 'tel',      placeholder: t('auth:phonePlaceholder'),           autoComplete: 'tel' },
  ];

  return (
    <PageWrapper>
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-5 my-8">
        <div className="w-full max-w-md mx-auto animate-scale-in">
          <div className="glass shadow-card-lg rounded-3xl p-8">
          {/* Logo + heading */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-dark-950/80 border border-white/10 rounded-2xl flex items-center justify-center shadow-glow-accent mx-auto mb-5 p-2">
              <img src="/logo.png" alt="GECHO YEMKINA EQUB" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-display font-bold text-white mb-1">{t('auth:register')}</h1>
            <p className="text-white/45 text-sm">Create your account to start winning</p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-red-500/15 border border-red-500/30 text-red-300 rounded-xl text-sm animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map(({ name, label, type, placeholder, autoComplete }) => (
              <div key={name}>
                <label className="block text-white/80 text-sm font-semibold mb-1.5">{label}</label>
                <input
                  id={`register-${name}`}
                  type={type}
                  name={name}
                  className="input"
                  placeholder={placeholder}
                  value={formData[name as keyof typeof formData]}
                  onChange={handleChange}
                  autoComplete={autoComplete}
                  required
                />
              </div>
            ))}

            {/* Password */}
            <div>
              <label className="block text-white/80 text-sm font-semibold mb-1.5">{t('auth:password')}</label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPw ? 'text' : 'password'}
                  name="password"
                  className="input pr-11"
                  placeholder={t('auth:passwordPlaceholder')}
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors" tabIndex={-1}>
                  {showPw ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-white/80 text-sm font-semibold mb-1.5">{t('auth:confirmPassword')}</label>
              <input
                id="register-confirm-password"
                type={showPw ? 'text' : 'password'}
                name="confirmPassword"
                className="input"
                placeholder={t('auth:confirmPasswordPlaceholder')}
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
            </div>

            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="btn-accent w-full py-3.5 text-base mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('auth:registering')}
                </span>
              ) : t('auth:register')}
            </button>
          </form>

          <p className="mt-7 text-center text-white/45 text-sm">
            {t('auth:hasAccount')}{' '}
            <button onClick={() => navigate('/login')} className="text-primary-400 hover:text-primary-300 font-semibold transition-colors">
              {t('auth:loginHere')}
            </button>
          </p>
        </div>
      </div>
      </div>
    </PageWrapper>
  );
};

export default Register;