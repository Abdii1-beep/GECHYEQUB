import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import { api } from '../../lib/api';

const AdminCustomers: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const token = localStorage.getItem('auth_token');

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    (async () => {
      setLoading(true);
      const res = await api.getAdminUsers();
      if (res.success && res.data) setUsers(res.data);
      setLoading(false);
    })();
  }, [navigate, token]);

  const filtered = users.filter((u: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const emailMatch = u.email?.toLowerCase().includes(q);
    const nameMatch = u.customerProfile?.fullName?.toLowerCase().includes(q);
    const phoneMatch = u.customerProfile?.phone?.toLowerCase().includes(q);
    return emailMatch || nameMatch || phoneMatch;
  });

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <AdminSidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              <span>👥</span> Customer & User Management
            </h1>
            <p className="text-white/50 text-sm mt-1">
              Registered lottery participants, phone numbers, KYC verification statuses, and ticket portfolios.
            </p>
          </div>
          <div className="px-3.5 py-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-xl text-xs font-bold">
            Total Accounts: {users.length} Users
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by full name, email, or Ethiopian phone number (+251...)..."
            className="w-full max-w-md bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-yellow-400"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-yellow-500/30 border-t-yellow-400 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
            <div className="text-4xl mb-2">👥</div>
            <h3 className="text-base font-bold text-white mb-1">No Customers Match Search</h3>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-black/40 border-b border-white/10 text-white/50 uppercase font-semibold">
                  <tr>
                    <th className="p-4">Customer Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Phone</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">KYC Status</th>
                    <th className="p-4">Tickets Bought</th>
                    <th className="p-4">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map((u: any) => {
                    const prof = u.customerProfile;
                    const tickets = u.tickets || [];
                    const ticketList = tickets.map((t: any) => t.purchaseId || t.id).join(', ');
                    return (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 font-bold text-white">
                          {prof?.fullName || 'Registered User'}
                        </td>
                        <td className="p-4 text-white/70 font-mono text-[11px]">{u.email}</td>
                        <td className="p-4 text-white/60 font-mono text-[11px]">{prof?.phone || 'N/A'}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            u.role === 'SUPER_ADMIN' ? 'bg-purple-500/20 text-purple-300' :
                            u.role === 'LOTTERY_MANAGER' ? 'bg-blue-500/20 text-blue-300' :
                            'bg-white/10 text-white/60'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            prof?.kycStatus === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-300' :
                            prof?.kycStatus === 'PENDING'  ? 'bg-yellow-500/20 text-yellow-300' :
                            'bg-white/10 text-white/50'
                          }`}>
                            {prof?.kycStatus || 'NOT_SUBMITTED'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-mono font-bold text-yellow-300" title={ticketList}>
                            {ticketList || 'No tickets'}
                          </span>
                        </td>
                        <td className="p-4 text-white/40 text-[11px]">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Recent'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminCustomers;
