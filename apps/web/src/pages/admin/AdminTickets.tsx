import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import { api, Ticket, Campaign } from '../../lib/api';

const AdminTickets: React.FC = () => {
  const navigate = useNavigate();
  const [tickets, setTickets]     = useState<Ticket[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const token = localStorage.getItem('auth_token');

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    (async () => {
      setLoading(true);
      const [tRes, cRes] = await Promise.all([
        api.getAdminTickets(),
        api.getAdminCampaigns(),
      ]);
      if (tRes.success && tRes.data) setTickets(tRes.data);
      if (cRes.success && cRes.data) setCampaigns(cRes.data);
      setLoading(false);
    })();
  }, [navigate, token]);

  const filtered = tickets.filter((t: any) => {
    if (selectedCampaign !== 'ALL' && t.campaignId !== selectedCampaign) return false;
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const numMatch = t.purchaseId?.toLowerCase().includes(q) || t.id.toLowerCase().includes(q);
      const custMatch = t.customer?.fullName?.toLowerCase().includes(q);
      return numMatch || custMatch;
    }
    return true;
  });

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <AdminSidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              <span>🎫</span> Ticket Registry & Audited Entries
            </h1>
            <p className="text-white/50 text-sm mt-1">
              Verify issued tickets, purchase IDs, cryptographic verification hashes, and buyer details.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3.5 py-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-xl text-xs font-bold">
              Total Recorded: {tickets.length} Tickets
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-white/50 mb-1">Filter by Campaign</label>
            <select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-yellow-400"
            >
              <option value="ALL">All Lotteries ({campaigns.length})</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-yellow-400"
            >
              <option value="ALL">All Statuses</option>
              <option value="PAID">PAID (Eligible in Drum)</option>
              <option value="PENDING">PENDING Payment</option>
              <option value="WON">WON Prize</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1">Search Ticket / Customer</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="e.g. ECL-2026 or Customer Name..."
              className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-yellow-400"
            />
          </div>
        </div>

        {/* Tickets Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-yellow-500/30 border-t-yellow-400 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
            <div className="text-4xl mb-2">🎫</div>
            <h3 className="text-base font-bold text-white mb-1">No Tickets Found</h3>
            <p className="text-white/40 text-xs">Try selecting a different filter or search term.</p>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-black/40 border-b border-white/10 text-white/50 uppercase font-semibold">
                  <tr>
                    <th className="p-4">Ticket Number</th>
                    <th className="p-4">Campaign</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Issued Date</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Verification Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map((t: any) => (
                    <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <span className="font-mono font-bold text-yellow-300 text-sm">
                          {t.purchaseId || t.id.slice(0, 12)}
                        </span>
                      </td>
                      <td className="p-4 text-white font-medium max-w-xs truncate">
                        {t.LotteryCampaign?.name || campaigns.find(c => c.id === t.campaignId)?.name || 'Lottery'}
                      </td>
                      <td className="p-4">
                        <div className="text-white font-semibold">{t.customer?.fullName || 'Participant'}</div>
                        <div className="text-white/40 text-[10px]">{t.customer?.phone || ''}</div>
                      </td>
                      <td className="p-4 text-white/60">
                        {t.issueTimestamp ? new Date(t.issueTimestamp).toLocaleDateString() : 'Recent'}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          t.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          t.status === 'WON'  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 font-black' :
                          'bg-white/10 text-white/60'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-[10px] text-white/40 max-w-[140px] truncate" title={t.verificationHash}>
                        {t.verificationHash || 'SHA256-PENDING'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminTickets;
