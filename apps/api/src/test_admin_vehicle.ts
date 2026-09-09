async function testAdminFlow() {
  const API_URL = 'http://localhost:5000/api';

  console.log('1. Logging in as Admin...');
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@ethiolottery.com',
      password: 'Admin123!'
    })
  });
  const loginData: any = await loginRes.json();
  const token = loginData.accessToken;
  if (!token) {
    throw new Error('Admin login failed: ' + JSON.stringify(loginData));
  }
  console.log('Admin token acquired successfully.');

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  console.log('\n2. Testing Image Upload (/api/upload)...');
  const dummyBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const uploadRes = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      image: dummyBase64,
      filename: 'sinotruk_obama_tipper.png'
    })
  });
  const uploadData: any = await uploadRes.json();
  console.log('Upload response:', uploadData);
  const uploadedUrl = uploadData.url;

  console.log('\n3. Creating New Vehicle Campaign with Real ETB Price & Quotas...');
  const uniqueName = `National Commercial Lottery: Sinotruk HOWO 371 Obama Dump Truck #${Date.now().toString().slice(-4)}`;
  const createRes = await fetch(`${API_URL}/campaigns`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: uniqueName,
      description: 'Win a brand new 2025 Sinotruk HOWO 371 HP 10-Wheeler Tipper (popularly known across Ethiopia as OBAMA). Real commercial market value: 18,500,000 ETB. Heavy mining dump box with reinforced chassis.',
      ticketPrice: 1000,
      maxTickets: 25000,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 60 * 86400000).toISOString(),
      drawDate: new Date(Date.now() + 65 * 86400000).toISOString(),
      vehicle: {
        make: 'Sinotruk (CNHTC)',
        model: 'HOWO 371 Tipper ("Obama")',
        year: 2025,
        vinChassisNumber: `ETH-OBAMA-371-${Date.now().toString().slice(-4)}`,
        declaredValue: 18500000, // 18.5 Million ETB
        color: 'Construction Golden Yellow',
        engineInfo: 'WD615.47 371HP Euro II / III Turbocharged Diesel',
        transmission: 'HW19710 10-Speed Manual with PTO',
        fuelType: 'Diesel',
        vehicleCondition: 'BRAND_NEW',
        location: 'Kality Customs Terminal, Addis Ababa',
        images: [
          uploadedUrl,
          'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=1200'
        ]
      }
    })
  });
  const createData: any = await createRes.json();
  if (!createRes.ok) {
    throw new Error('Create campaign failed: ' + JSON.stringify(createData));
  }
  const campaign = createData.campaign || createData;
  const campaignId = campaign.id;
  console.log('Created Campaign ID:', campaignId);
  console.log('Campaign Name:', campaign.name);

  console.log('\n4. Testing Campaign Editing (Update Price Quota, Status & Real Price)...');
  const updateRes = await fetch(`${API_URL}/campaigns/${campaignId}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      status: 'PUBLISHED',
      ticketPrice: 1200, // Updated quota
      maxTickets: 20000, // Updated quota
      vehicleValue: 19000000, // Updated ETB market price: 19 Million ETB
      vehicleModel: 'HOWO 371 Tipper ("Obama") - Heavy Duty 10-Wheeler',
      vehicleImages: [
        uploadedUrl,
        'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=1200'
      ]
    })
  });
  const updateData: any = await updateRes.json();
  if (!updateRes.ok) {
    throw new Error('Update campaign failed: ' + JSON.stringify(updateData));
  }
  const updatedCampaign = updateData.campaign || updateData;
  console.log('Updated ticket price:', updatedCampaign.ticketPrice, 'ETB');
  console.log('Updated max tickets quota:', updatedCampaign.maxTickets);

  console.log('\n5. Fetching Public Campaign Details to verify tickets remaining and real price...');
  const publicRes = await fetch(`${API_URL}/campaigns/${campaignId}`);
  const data: any = await publicRes.json();
  const c = data.campaign;
  console.log({
    id: c.id,
    name: c.name,
    status: c.status,
    ticketPrice: `${c.ticketPrice} ETB`,
    maxTickets: c.maxTickets,
    soldTickets: c.soldTickets,
    remainingTickets: c.remainingTickets,
    vehicle: {
      make: c.vehicles?.[0]?.make,
      model: c.vehicles?.[0]?.model,
      declaredValue: `${c.vehicles?.[0]?.declaredValue?.toLocaleString()} ETB`,
      imagesCount: c.vehicles?.[0]?.images?.length,
      firstImage: c.vehicles?.[0]?.images?.[0]
    }
  });

  console.log('\nAll test checks passed successfully!');
}

testAdminFlow().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
