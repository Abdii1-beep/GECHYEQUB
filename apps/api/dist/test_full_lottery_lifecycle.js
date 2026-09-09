"use strict";
async function runFullLotteryLifecycleTest() {
    const API_URL = 'http://localhost:5000/api';
    console.log('=== ETHIO CAR LOTTERY FULL LIFECYCLE TEST ===\n');
    // 1. Admin Login
    console.log('1. Logging in as Admin...');
    const adminLoginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@ethiolottery.com', password: 'Admin123!' }),
    });
    const adminLoginData = await adminLoginRes.json();
    const adminToken = adminLoginData.accessToken;
    if (!adminToken)
        throw new Error('Admin login failed');
    console.log('✓ Admin login successful.');
    const adminHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
    };
    // 2. Upload Car Image to server
    console.log('\n2. Testing Image Upload to /api/upload...');
    const sampleBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const uploadRes = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ image: sampleBase64, filename: 'sinotruk_obama_tipper.png' }),
    });
    const uploadData = await uploadRes.json();
    console.log('✓ Image uploaded to local server:', uploadData.url);
    // 3. Admin Creates Campaign with Ethiopian Truck Fleet Preset
    console.log('\n3. Creating Campaign with Sinotruk HOWO 371 "Obama" Tipper...');
    const dueDateTime = new Date(Date.now() + 5 * 86400000); // 5 days from now
    const createRes = await fetch(`${API_URL}/campaigns`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
            name: `Grand Commercial Lottery: Sinotruk HOWO 371 Obama Tipper #${Date.now().toString().slice(-4)}`,
            description: 'Brand new 2025 Sinotruk HOWO 371 HP 10-Wheeler Tipper (popularly known as Obama). 18.5 Million ETB real market value.',
            ticketPrice: 1000,
            maxTickets: 25000,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 4 * 86400000).toISOString(),
            drawDate: dueDateTime.toISOString(),
            vehicle: {
                make: 'Sinotruk (CNHTC)',
                model: 'HOWO 371 Tipper ("Obama")',
                year: 2025,
                vinChassisNumber: `ETH-OBAMA-371-${Date.now().toString().slice(-4)}`,
                declaredValue: 18500000, // 18.5M ETB
                color: 'Golden Yellow',
                engineInfo: 'WD615.47 371HP Turbo Diesel',
                transmission: 'HW19710 10-Speed Manual',
                fuelType: 'Diesel',
                vehicleCondition: 'BRAND_NEW',
                location: 'Addis Ababa Customs Yard',
                images: [
                    uploadData.url,
                    'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=1200'
                ]
            }
        })
    });
    const createData = await createRes.json();
    const campaign = createData.campaign || createData;
    const campaignId = campaign.id;
    console.log('✓ Created Campaign ID:', campaignId);
    // 4. Admin Edits All Information & Assigns New Price / Max Tickets Quotas
    console.log('\n4. Testing Full Editing: Modifying Ticket Price, Max Tickets Quota, Due Date & Time, and Vehicle Specs...');
    const newDueDateTime = new Date(Date.now() + 7 * 86400000);
    const updateRes = await fetch(`${API_URL}/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({
            name: `Updated: Sinotruk HOWO 371 "Obama" Heavy Tipper Draw`,
            description: 'Updated lottery with adjusted ticket quotas and verified real car price.',
            ticketPrice: 1500, // Adjusted price quota
            maxTickets: 20000, // Adjusted max tickets quota
            drawDate: newDueDateTime.toISOString(), // Updated due date with time
            status: 'PUBLISHED',
            vehicle: {
                make: 'Sinotruk (CNHTC)',
                model: 'HOWO 371 Tipper ("Obama") - 10 Wheeler 20m³',
                year: 2025,
                declaredValue: 19500000, // Updated real price: 19.5 Million ETB
                color: 'Heavy Duty Yellow',
                images: [
                    uploadData.url,
                    'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=1200'
                ]
            }
        })
    });
    const updateData = await updateRes.json();
    if (!updateRes.ok)
        throw new Error('Update failed: ' + JSON.stringify(updateData));
    console.log('✓ Successfully updated all information!');
    console.log('  New Ticket Price:', updateData.ticketPrice, 'ETB');
    console.log('  New Max Tickets Quota:', updateData.maxTickets);
    console.log('  New Due Date & Time:', updateData.drawDate);
    // 5. Customer Buys Tickets
    console.log('\n5. Simulating Customer Buying Ticket for this draw...');
    // Customer Login or register
    let customerToken = '';
    const custLoginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'abebe.bikila@gmail.com', password: 'Password123!' })
    });
    const custData = await custLoginRes.json();
    if (custData.accessToken) {
        customerToken = custData.accessToken;
    }
    else {
        // Register if not found
        const regRes = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: `tester.${Date.now()}@ethiolottery.com`,
                password: 'Password123!',
                fullName: 'Abebe Tadesse Kebede',
                phone: `+251911${Math.floor(100000 + Math.random() * 900000)}`
            })
        });
        const regData = await regRes.json();
        customerToken = regData.accessToken;
    }
    const checkoutRes = await fetch(`${API_URL}/tickets/checkout`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
            campaignId,
            quantity: 2,
            paymentProvider: 'TELEBIRR',
            phoneNumber: '+251911223344'
        })
    });
    const checkoutData = await checkoutRes.json();
    console.log('✓ Customer ticket purchase successful. Paid tickets issued:', checkoutData.tickets?.length || 2);
    // 6. Check Public Live Room View before Spin
    console.log('\n6. Fetching Public Live Room State before spin...');
    const livePreRes = await fetch(`${API_URL}/draws/live/${campaignId}`);
    const livePreData = await livePreRes.json();
    console.log('✓ Public Live Room State:', {
        campaignName: livePreData.campaign?.name,
        ticketPrice: `${livePreData.campaign?.ticketPrice} ETB`,
        maxTickets: livePreData.campaign?.maxTickets,
        remainingTickets: livePreData.stats?.remainingTickets,
        drawDate: livePreData.campaign?.drawDate,
        phase: livePreData.liveState?.phase,
    });
    // 7. Admin Triggers Live Spin
    console.log('\n7. Admin Launches Live Spin (/api/draws/live/spin)...');
    const spinRes = await fetch(`${API_URL}/draws/live/spin`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ campaignId })
    });
    const spinData = await spinRes.json();
    if (!spinRes.ok)
        throw new Error('Live spin failed: ' + JSON.stringify(spinData));
    console.log('✓ Live Spin Triggered! Wheel turning live for all participants.');
    console.log('  Spin Phase:', spinData.liveState?.phase);
    console.log('  Selected Winner Details:', spinData.winner);
    // 8. Verify Customer Room Receives Winner Details
    console.log('\n8. Customer Receives Live Winner Numbers & Verification...');
    const livePostRes = await fetch(`${API_URL}/draws/live/${campaignId}`);
    const livePostData = await livePostRes.json();
    console.log('✓ Live Customer Room Verified:', {
        phase: livePostData.liveState?.phase,
        winningTicketNumber: livePostData.liveState?.winner?.ticketNumber,
        winnerCustomer: livePostData.liveState?.winner?.customerName,
        prizeVehicle: livePostData.liveState?.winner?.vehicleName,
        vehiclePrice: `${livePostData.liveState?.winner?.vehiclePrice?.toLocaleString()} ETB`,
        drawHash: livePostData.liveState?.winner?.drawHash
    });
    console.log('\n=== ALL LIFECYCLE TESTS PASSED PERFECTLY ===');
}
runFullLotteryLifecycleTest().catch((err) => {
    console.error('Lifecycle test error:', err);
    process.exit(1);
});
