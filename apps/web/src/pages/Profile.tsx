import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, User } from '../lib/api';
import Navbar from '../components/Navbar';
import PageWrapper from '../components/PageWrapper';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'navigation', 'profile']);
  const [user, setUser]     = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', phone: '', address: '' });
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) { navigate('/login'); return; }
    api.getCurrentUser()
      .then((res) => {
        if (res.success && res.data) {
          setUser(res.data);
          setFormData({
            fullName: res.data.customerProfile.fullName,
            phone:    res.data.customerProfile.phone,
            address:  res.data.customerProfile.address || '',
          });
        }
      })
      .catch(() => setError(t('common:error')))
      .finally(() => setLoading(false));
  }, [navigate, t]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleSave = async () => {
    setError(''); setSuccess('');
    try {
      const res = await api.updateProfile(formData);
      if (res.success && res.data) {
        setUser(res.data);
        localStorage.setItem('user', JSON.stringify(res.data));
        setSuccess(t('profile:profileUpdated'));
        setEditing(false);
      } else {
        setError(res.error || t('profile:profileUpdateFailed'));
      }
    } catch {
      setError(t('profile:profileUpdateFailed'));
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setFormData({
      fullName: user?.customerProfile.fullName || '',
      phone:    user?.customerProfile.phone    || '',
      address:  user?.customerProfile.address  || '',
    });
  };

  if (loading) {
    return (
      <PageWrapper>
        <Navbar authenticated onLogout={handleLogout} />
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-14 h-14 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mb-4" />
          <p className="text-white/50 text-sm">{t('common:loading')}</p>
        </div>
      </PageWrapper>
    );
  }

  const initials = user?.customerProfile?.fullName
    ?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <PageWrapper>
      <Navbar authenticated onLogout={handleLogout} />

      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-slide-up">
          <h1 className="text-4xl font-display font-bold text-white mb-1">{t('profile:myProfile')}</h1>
          <p className="text-white/45">Manage your personal information and account settings</p>
        </div>

        {/* Alerts */}
        {error   && <div className="mb-5 p-4 bg-red-500/15 border border-red-500/30 text-red-300 rounded-xl text-sm animate-fade-in">{error}</div>}
        {success && <div className="mb-5 p-4 bg-green-500/15 border border-green-500/30 text-green-300 rounded-xl text-sm animate-fade-in">✓ {success}</div>}

        {/* Profile hero card */}
        <div className="glass rounded-2xl p-6 mb-6 flex flex-col sm:flex-row items-center gap-5 animate-slide-up" style={{ animationDelay: '0.05s' }}>
          {/* Avatar */}
          <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center text-3xl font-display font-black text-white shadow-glow flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl font-display font-bold text-white">{user?.customerProfile?.fullName || 'User'}</h2>
            <p className="text-white/45 text-sm">{user?.email}</p>
            <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
              <span className={user?.emailVerified ? 'badge-green' : 'badge-red'}>
                {user?.emailVerified ? '✓ Email Verified' : '✗ Email Unverified'}
              </span>
              <span className={user?.phoneVerified ? 'badge-green' : 'badge-red'}>
                {user?.phoneVerified ? '✓ Phone Verified' : '✗ Phone Unverified'}
              </span>
              <span className="badge-primary">{user?.status}</span>
            </div>
          </div>
        </div>

        {/* Account info */}
        <div className="glass glass-hover rounded-2xl p-6 mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="section-icon bg-gradient-to-br from-primary-500 to-primary-700 shadow-glow">👤</div>
            <h2 className="text-lg font-display font-bold text-white">{t('profile:accountInformation')}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: t('profile:email'),         value: user?.email },
              { label: t('profile:status'),         value: user?.status },
              { label: t('profile:emailVerified'),  value: user?.emailVerified ? t('profile:yes') : t('profile:no') },
              { label: t('profile:phoneVerified'),  value: user?.phoneVerified ? t('profile:yes') : t('profile:no') },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/5 border border-white/8 rounded-xl p-4">
                <span className="text-white/40 text-xs block mb-1">{label}</span>
                <p className="text-white font-semibold text-sm">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Personal info */}
        <div className="glass glass-hover rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="section-icon bg-gradient-to-br from-accent-500 to-accent-700 shadow-glow-accent">📝</div>
              <h2 className="text-lg font-display font-bold text-white">{t('profile:personalInformation')}</h2>
            </div>
            {!editing && (
              <button onClick={() => setEditing(true)} className="btn-primary text-sm py-2 px-4">
                {t('profile:editProfile')}
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-4 animate-fade-in">
              {[
                { name: 'fullName', label: t('profile:fullName'), type: 'text' },
                { name: 'phone',    label: t('profile:phone'),    type: 'tel'  },
              ].map(({ name, label, type }) => (
                <div key={name}>
                  <label className="block text-white/70 text-sm font-semibold mb-1.5">{label}</label>
                  <input
                    type={type}
                    name={name}
                    value={formData[name as keyof typeof formData]}
                    onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })}
                    className="input"
                  />
                </div>
              ))}
              <div>
                <label className="block text-white/70 text-sm font-semibold mb-1.5">{t('profile:address')}</label>
                <textarea
                  name="address"
                  rows={3}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input resize-none"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={handleSave} className="btn-accent px-8 py-2.5 text-sm">
                  {t('profile:saveChanges')}
                </button>
                <button onClick={handleCancel} className="btn-ghost px-8 py-2.5 text-sm">
                  {t('profile:cancelEdit')}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: t('profile:fullName'), value: user?.customerProfile?.fullName },
                { label: t('profile:phone'),    value: user?.customerProfile?.phone },
                { label: t('profile:address'),  value: user?.customerProfile?.address || t('profile:notProvided') },
                ...(user?.customerProfile?.nationality ? [{ label: t('profile:nationality'), value: user.customerProfile.nationality }] : []),
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/5 border border-white/8 rounded-xl p-4">
                  <span className="text-white/40 text-xs block mb-1">{label}</span>
                  <p className="text-white font-semibold text-sm">{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
};

export default Profile;