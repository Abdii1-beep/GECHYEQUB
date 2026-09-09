import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function resetUser() {
    const email = 'tesfayefufaa@gmail.com';
    console.log(`Cleaning up user: ${email}`);
    const user = await prisma.user.findUnique({
        where: { email }
    });
    if (user) {
        if (user.customerProfileId) {
            await prisma.customerProfile.deleteMany({ where: { id: user.customerProfileId } });
        }
        if (user.kycRecordId) {
            await prisma.kycRecord.deleteMany({ where: { id: user.kycRecordId } });
        }
        await prisma.user.delete({ where: { email } });
        console.log("Successfully deleted user and related records.");
    }
    else {
        console.log("User does not exist.");
    }
}
resetUser().catch(console.error).finally(() => prisma.$disconnect());
