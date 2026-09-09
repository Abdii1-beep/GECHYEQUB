import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      include: {
        customerProfile: true
      },
      take: 20
    });

    console.log("=== REGISTERED USERS IN DATABASE ===");
    console.log(JSON.stringify(users.map(u => ({
      email: u.email,
      status: u.status,
      passwordHash: u.passwordHash?.substring(0, 15) + '...',
      fullName: u.customerProfile?.fullName,
      phone: u.customerProfile?.phone
    })), null, 2));
  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
