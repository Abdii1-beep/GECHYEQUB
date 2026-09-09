import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
    const password = 'Password123!';
    const hashedPassword = await bcrypt.hash(password, 10);
    // Update or upsert admin
    const admin = await prisma.user.upsert({
        where: { email: 'admin@ethiolottery.com' },
        update: {
            passwordHash: hashedPassword,
            role: Role.SUPER_ADMIN,
            status: 'ACTIVE',
            emailVerified: true,
            phoneVerified: true,
        },
        create: {
            email: 'admin@ethiolottery.com',
            passwordHash: hashedPassword,
            role: Role.SUPER_ADMIN,
            status: 'ACTIVE',
            emailVerified: true,
            phoneVerified: true,
        }
    });
    // Update or upsert user
    const user = await prisma.user.upsert({
        where: { email: 'user@ethiolottery.com' },
        update: {
            passwordHash: hashedPassword,
            role: Role.CUSTOMER,
            status: 'ACTIVE',
            emailVerified: true,
            phoneVerified: true,
        },
        create: {
            email: 'user@ethiolottery.com',
            passwordHash: hashedPassword,
            role: Role.CUSTOMER,
            status: 'ACTIVE',
            emailVerified: true,
            phoneVerified: true,
        }
    });
    console.log('Admin user updated:', { id: admin.id, email: admin.email, role: admin.role, status: admin.status });
    console.log('Customer user updated:', { id: user.id, email: user.email, role: user.role, status: user.status });
    console.log('Default password for both:', password);
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
