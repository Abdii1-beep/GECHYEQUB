import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import { api } from '../../lib/api';

const AdminPayments: React.FC = () => {
  const navigate = useNavigate();
  const [payments, setPayments]   = useState<any[]>([]);
  const [orders, setOrders]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filterProvider, setFilterProvider] = useState<string>('ALL');
  const token = localStorage.getItem('auth_token');

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    (async () => {
      setLoading(true);
      const res = await api.getAdminPayments();
      if (res.success && res.data) {
        setPayments(res.data.payments || []);
        setOrders(res.data.orders || []);
      }
      setLoading(false);
    })();
  }, [navigate, token]);

  const displayList = payments.length > 0 ? payments : orders;

  const filtered = displayList.filter((item: any) => {
    if (filterProvider === 'ALL') return true;
    const prov = item.provider || item.paymentProvider || 'TELEBIRR';
    return prov.toUpperCase() === filterProvider;
  });

  const totalETB = displayList.reduce((acc, item) => {
    const amt = Number(item.amount || (item.campaign?.ticketPrice ? item.campaign.ticketPrice * (item.tickets?.length || 1) : 0));
    return acc + (isNaN(amt) ? 0 : amt);
  }, 0);

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <AdminSidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              <span>💳</span> Payment Gateway Ledger
            </h1>
            <p className="text-white/50 text-sm mt-1">
              Real-time payment settlements through Telebirr, CBE Birr, and Chapa for lottery ticket sales.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-right">
              <span className="text-white/40 block text-[10px] uppercase font-bold">Processed Revenue</span>
              <span className="text-emerald-400 font-black text-lg">{totalETB.toLocaleString()} ETB</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6">
          {['ALL', 'TELEBIRR', 'CBE_BIRR', 'CHAPA', 'AWASH'].map((p) => (
            <button
              key={p}
              onClick={() => setFilterProvider(p)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterProvider === p
                  ? 'bg-yellow-500 text-black shadow-md'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {p === 'ALL' ? 'All Providers' : p.replace('_', ' ')}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-yellow-500/30 border-t-yellow-400 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
            <div className="text-4xl mb-2">💳</div>
            <h3 className="text-base font-bold text-white mb-1">No Payment Records Found</h3>
            <p className="text-white/40 text-xs">Payment transactions will show here once participants purchase tickets.</p>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-black/40 border-b border-white/10 text-white/50 uppercase font-semibold">
                  <tr>
                    <th className="p-4">Transaction / Order ID</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Campaign</th>
                    <th className="p-4">Provider</th>
                    <th className="p-4">Amount (ETB)</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map((item: any) => {
                    const cust = item.customer || item.order?.customer;
                    const camp = item.campaign || item.order?.campaign;
                    const provider = item.provider || item.paymentProvider || 'TELEBIRR';
                    const amount = item.amount || (camp?.ticketPrice ? camp.ticketPrice * (item.tickets?.length || 1) : 0);
                    const status = item.status || 'COMPLETED';

                    return (
                      <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 font-mono font-bold text-yellow-300">
                          {item.id.slice(0, 16)}...
                        </td>
                        <td className="p-4">
                          <div className="text-white font-semibold">{cust?.fullName || 'Citizen Buyer'}</div>
                          <div className="text-white/40 text-[10px]">{cust?.phone || ''}</div>
                        </td>
                        <td className="p-4 text-white font-medium max-w-xs truncate">
                          {camp?.name || 'Grand Vehicle Lottery'}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-white/10 text-white">
                            {provider}
                          </span>
                        </td>
                        <td className="p-4 font-mono font-black text-emerald-400 text-sm">
                          {Number(amount).toLocaleString()} ETB
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            status === 'COMPLETED' || status === 'PAID' ? 'bg-emerald-500/20 text-emerald-300' :
                            status === 'PENDING'   ? 'bg-yellow-500/20 text-yellow-300' :
                            'bg-red-500/20 text-red-300'
                          }`}>
                            {status}
                          </span>
                        </td>
                        <td className="p-4 text-white/50 text-[11px]">
                          {item.createdAt || item.initiatedAt ? new Date(item.createdAt || item.initiatedAt).toLocaleString() : 'Recent'}
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

export default AdminPayments;
