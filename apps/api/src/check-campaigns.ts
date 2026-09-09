import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const campaigns = await p.lotteryCampaign.findMany({ 
    select: { id: true, name: true, status: true, startDate: true, endDate: true },
    orderBy: { createdAt: 'desc' },
    take: 15,
  });
  console.log(JSON.stringify(campaigns, null, 2));
  await p.$disconnect();
}
main().catch(console.error);
