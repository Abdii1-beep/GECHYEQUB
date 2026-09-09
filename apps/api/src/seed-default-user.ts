import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  try {
    const email = 'user@ethiolottery.com';
    const password = 'Password123!';
    const fullName = 'Abebe Bikila';
    const phone = '+251911223344';

    const hashedPassword = await bcrypt.hash(password, 10);

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    let user = existingUser;
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          status: 'ACTIVE',
          emailVerified: true,
          phoneVerified: true,
          customerProfile: {
            create: {
              fullName,
              phone,
              address: 'Bole, Addis Ababa, Ethiopia',
              nationality: 'Ethiopian'
            }
          }
        }
      });
      console.log('User created successfully:', { email, password });
    } else {
      console.log('User already exists:', { email, password });
    }

    // Also ensure at least one active campaign exists
    const campaignCount = await prisma.lotteryCampaign.count();
    if (campaignCount === 0) {
      await prisma.lotteryCampaign.create({
        data: {
          name: 'Rimac Nevera Grand Hypercar Draw',
          slug: 'rimac-nevera-2026',
          systemName: 'CAR-LOTTERY-2026-01',
          description: 'Win a brand new electric supercar with full tax & insurance covered.',
          status: 'PUBLISHED',
          ticketPrice: 500,
          maxTickets: 10000,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          createdBy: user.id,
        },
      });
      console.log('Default campaign created');
    }
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
