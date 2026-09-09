import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedAdmin() {
  try {
    console.log('🔧 Seeding admin user...');

    const adminEmail = 'admin@ethiolottery.com';
    const adminPassword = 'Password123!';

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Upsert admin user
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

    if (!existingAdmin) {
      await prisma.user.create({
        data: {
          username: "admin",
          email: adminEmail,
          passwordHash: hashedPassword,
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          emailVerified: true,
          phoneVerified: true,
        },
      });
      console.log('✅ Admin user CREATED:', adminEmail, '| Password:', adminPassword, '| Role: SUPER_ADMIN');
    } else {
      // Update existing user to have admin role and correct password
      await prisma.user.update({
        where: { email: adminEmail },
        data: {
          username: "admin",
          passwordHash: hashedPassword,
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          emailVerified: true,
          phoneVerified: true,
        },
      });
      console.log('✅ Admin user UPDATED:', adminEmail, '| Password:', adminPassword, '| Role: SUPER_ADMIN');
    }

    // Also seed/fix the regular user
    const userEmail = 'user@ethiolottery.com';
    const userPassword = 'Password123!';
    const userHashedPassword = await bcrypt.hash(userPassword, 10);

    const existingUser = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { customerProfile: true },
    });

    if (!existingUser) {
      await prisma.user.create({
        data: {
          username: "customer",
          email: userEmail,
          passwordHash: userHashedPassword,
          role: 'CUSTOMER',
          status: 'ACTIVE',
          emailVerified: true,
          phoneVerified: true,
          customerProfile: {
            create: {
              fullName: 'Abebe Bikila',
              phone: '+251911223344',
              address: 'Bole, Addis Ababa, Ethiopia',
              nationality: 'Ethiopian',
            },
          },
        },
      });
      console.log('✅ Regular user CREATED:', userEmail, '| Password:', userPassword);
    } else {
      await prisma.user.update({
        where: { email: userEmail },
        data: {
          username: "customer",
          passwordHash: userHashedPassword,
          role: 'CUSTOMER',
          status: 'ACTIVE',
        },
      });
      console.log('✅ Regular user UPDATED:', userEmail, '| Password:', userPassword);
    }

    console.log('\n🎉 Seed complete!');
    console.log('┌─────────────────────────────────────────────────┐');
    console.log('│  ADMIN:  admin / Password123!                    │');
    console.log('│  USER:   customer / Password123!                 │');
    console.log('└─────────────────────────────────────────────────┘');
  } catch (err) {
    console.error('❌ Seed error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();
