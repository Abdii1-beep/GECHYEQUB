import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function fixRoles() {
  // Update all CUSTOMER_SUPPORT users (regular registrations) to CUSTOMER role
  const result = await p.user.updateMany({
    where: { role: 'CUSTOMER_SUPPORT' },
    data: { role: 'CUSTOMER' }
  });
  console.log(`✅ Fixed ${result.count} users: CUSTOMER_SUPPORT → CUSTOMER`);
  
  const users = await p.user.findMany({ select: { email: true, role: true } });
  console.log('All users:', JSON.stringify(users, null, 2));
  await p.$disconnect();
}

fixRoles().catch(console.error);
