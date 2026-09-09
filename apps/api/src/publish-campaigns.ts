import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function publishCampaigns() {
  const campaigns = await prisma.lotteryCampaign.findMany();
  console.log(`Found ${campaigns.length} campaigns`);

  const now = new Date();
  const future = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days ahead

  for (const c of campaigns) {
    console.log(`Campaign ${c.name}: current status = ${c.status}`);
    await prisma.lotteryCampaign.update({
      where: { id: c.id },
      data: {
        status: 'PUBLISHED',
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // started yesterday
        endDate: future, // ends in 60 days
      }
    });
    console.log(` -> Updated ${c.name} to PUBLISHED (valid until ${future.toISOString()})`);
  }

  const updated = await prisma.lotteryCampaign.findMany({
    select: { id: true, name: true, status: true, startDate: true, endDate: true }
  });
  console.log('Updated campaigns:', JSON.stringify(updated, null, 2));

  await prisma.$disconnect();
}

publishCampaigns().catch(console.error);
