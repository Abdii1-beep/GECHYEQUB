async function verifyAllAdminRoutes() {
  const API_URL = 'http://localhost:5000/api';
  console.log('Testing Admin Endpoints...');

  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@ethiolottery.com', password: 'Admin123!' }),
  });
  const { accessToken } = await loginRes.json() as any;
  const authHeaders = { Authorization: `Bearer ${accessToken}` };

  const endpoints = [
    { name: 'Dashboard Stats', url: `${API_URL}/admin/dashboard` },
    { name: 'Campaigns', url: `${API_URL}/campaigns?includeDraft=true` },
    { name: 'Tickets', url: `${API_URL}/tickets` },
    { name: 'Customers / Users', url: `${API_URL}/admin/users` },
    { name: 'KYC Queue', url: `${API_URL}/admin/kyc-queue` },
    { name: 'Payments', url: `${API_URL}/admin/payments` },
    { name: 'Winners', url: `${API_URL}/winners` },
    { name: 'Fraud Flags', url: `${API_URL}/fraud/flags` },
    { name: 'Fraud Statistics', url: `${API_URL}/fraud/statistics` },
    { name: 'Audit Logs', url: `${API_URL}/audit/logs` },
    { name: 'Platform Settings', url: `${API_URL}/admin/settings` },
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, { headers: authHeaders });
      console.log(`[${res.status}] ${ep.name} -> ${res.ok ? 'SUCCESS ✓' : 'FAILED ✗'}`);
      if (!res.ok) {
        const text = await res.text();
        console.error(`   Error details: ${text}`);
      }
    } catch (e: any) {
      console.error(`[ERR] ${ep.name} -> ${e.message}`);
    }
  }
}

verifyAllAdminRoutes();
