import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
    const users = await prisma.user.findMany({
        select: { id: true, email: true, role: true, status: true },
    });
    console.log("USERS:", JSON.stringify(users, null, 2));
    const campaigns = await prisma.lotteryCampaign.findMany({
        select: { id: true, name: true, status: true, ticketPrice: true, maxTickets: true, vehicles: true },
    });
    console.log("CAMPAIGNS:", JSON.stringify(campaigns, null, 2));
    const tickets = await prisma.ticket.count();
    console.log("TOTAL TICKETS COUNT:", tickets);
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
