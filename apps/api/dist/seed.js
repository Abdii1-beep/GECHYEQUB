import { PrismaClient, Role, CampaignStatus, KycStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();
async function main() {
    console.log("Seeding database...");
    const saltRounds = 10;
    const adminPasswordHash = await bcrypt.hash("Admin123!", saltRounds);
    const userPasswordHash = await bcrypt.hash("Password123!", saltRounds);
    // 1. Seed Super Admin User
    let admin = await prisma.user.findUnique({
        where: { email: "admin@ethiolottery.com" },
    });
    if (!admin) {
        const adminProfile = await prisma.customerProfile.create({
            data: {
                fullName: "National Lottery Administration",
                phone: "+251911000001",
                address: "Churchill Road, Addis Ababa, Ethiopia",
                nationality: "Ethiopian",
            },
        });
        const adminKyc = await prisma.kycRecord.create({
            data: {
                fullName: "National Lottery Administration",
                phone: "+251911000001",
                email: "admin@ethiolottery.com",
                address: "Churchill Road, Addis Ababa, Ethiopia",
                nationalId: "NLA-ADM-001",
                idVerificationStatus: KycStatus.VERIFIED,
                verificationDate: new Date(),
                verifiedBy: "SYSTEM",
            },
        });
        admin = await prisma.user.create({
            data: {
                email: "admin@ethiolottery.com",
                passwordHash: adminPasswordHash,
                role: Role.SUPER_ADMIN,
                status: "ACTIVE",
                emailVerified: true,
                phoneVerified: true,
                customerProfileId: adminProfile.id,
                kycRecordId: adminKyc.id,
            },
        });
        await prisma.customerProfile.update({
            where: { id: adminProfile.id },
            data: { userId: admin.id },
        });
        await prisma.kycRecord.update({
            where: { id: adminKyc.id },
            data: { userId: admin.id },
        });
        console.log("Created Super Admin user: admin@ethiolottery.com");
    }
    else {
        await prisma.user.update({
            where: { id: admin.id },
            data: { role: Role.SUPER_ADMIN, passwordHash: adminPasswordHash },
        });
        console.log("Updated Super Admin user: admin@ethiolottery.com");
    }
    // 2. Ensure test customer exists and is KYC VERIFIED
    let user = await prisma.user.findUnique({
        where: { email: "user@ethiolottery.com" },
    });
    if (!user) {
        const userProfile = await prisma.customerProfile.create({
            data: {
                fullName: "Abebe Bikila",
                phone: "+251911223344",
                address: "Bole Sub-city, Addis Ababa, Ethiopia",
                nationality: "Ethiopian",
            },
        });
        const userKyc = await prisma.kycRecord.create({
            data: {
                fullName: "Abebe Bikila",
                phone: "+251911223344",
                email: "user@ethiolottery.com",
                address: "Bole Sub-city, Addis Ababa, Ethiopia",
                nationalId: "ETH-2026-987654",
                idVerificationStatus: KycStatus.VERIFIED,
                verificationDate: new Date(),
                verifiedBy: "SYSTEM",
            },
        });
        user = await prisma.user.create({
            data: {
                email: "user@ethiolottery.com",
                passwordHash: userPasswordHash,
                role: Role.CUSTOMER,
                status: "ACTIVE",
                emailVerified: true,
                phoneVerified: true,
                customerProfileId: userProfile.id,
                kycRecordId: userKyc.id,
            },
        });
        await prisma.customerProfile.update({
            where: { id: userProfile.id },
            data: { userId: user.id },
        });
        await prisma.kycRecord.update({
            where: { id: userKyc.id },
            data: { userId: user.id },
        });
        console.log("Created test user: user@ethiolottery.com");
    }
    else {
        if (user.kycRecordId) {
            await prisma.kycRecord.update({
                where: { id: user.kycRecordId },
                data: { idVerificationStatus: KycStatus.VERIFIED },
            });
        }
        console.log("Verified KYC for user@ethiolottery.com");
    }
    // 3. Seed Campaigns
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysLater = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    // Campaign 1: Published & Active Online (Mercedes-AMG GT Coupe 2026)
    let camp1 = await prisma.lotteryCampaign.findFirst({
        where: { slug: "mercedes-amg-gt-coupe-2026" },
    });
    if (!camp1) {
        camp1 = await prisma.lotteryCampaign.create({
            data: {
                name: "Grand Ethiopian Luxury Car Draw: Mercedes-AMG GT Coupe 2026",
                slug: "mercedes-amg-gt-coupe-2026",
                description: "Experience absolute automotive luxury and extreme high performance with the twin-turbo V8 Mercedes-AMG GT Coupe. 100% legally verified and authorized by the Ethiopian National Lottery Administration.",
                systemName: "ETHIO CAR LOTTERY",
                status: CampaignStatus.PUBLISHED,
                ticketPrice: 500,
                maxTickets: 10000,
                startDate: now,
                endDate: thirtyDaysLater,
                drawDate: new Date(thirtyDaysLater.getTime() + 24 * 60 * 60 * 1000),
                createdBy: admin.id,
                publishedAt: now,
                publishedBy: admin.id,
                eligibilityRules: JSON.stringify({
                    minAge: 18,
                    allowedCountries: ["ET", "DIASPORA"],
                }),
            },
        });
    }
    // Ensure vehicle is attached for camp1
    const existingV1 = await prisma.vehicle.findFirst({ where: { campaignId: camp1.id } });
    if (!existingV1) {
        await prisma.vehicle.create({
            data: {
                make: "Mercedes-AMG",
                model: "GT 63 S E Performance Coupe",
                year: 2026,
                color: "Obsidian Black Metallic",
                engineInfo: "4.0L V8 Biturbo Hybrid (831 HP)",
                transmission: "9-Speed AMG SPEEDSHIFT MCT",
                fuelType: "Plug-in Hybrid Gasoline",
                vinChassisNumber: "W1K7GT63SE2026001",
                declaredValue: 32500000,
                vehicleCondition: "BRAND_NEW",
                location: "Addis Ababa Showroom, Bole",
                status: "AVAILABLE",
                campaignId: camp1.id,
                images: JSON.stringify([
                    "/hero-car.jpg",
                    "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?q=80&w=1200&auto=format&fit=crop",
                ]),
            },
        });
        console.log("Attached vehicle to Campaign 1");
    }
    // Campaign 2: Draft Campaign pending release online (Porsche 911 Turbo S)
    let camp2 = await prisma.lotteryCampaign.findFirst({
        where: { slug: "addis-supercar-porsche-911-turbo-s" },
    });
    if (!camp2) {
        camp2 = await prisma.lotteryCampaign.create({
            data: {
                name: "Addis Supercar Chance: Porsche 911 Turbo S (2026 Edition)",
                slug: "addis-supercar-porsche-911-turbo-s",
                description: "The pinnacle of German engineering precision. 640 HP, all-wheel drive, reaching 0-100 km/h in 2.7 seconds. Ready for online release by the National Lottery Director.",
                systemName: "ETHIO CAR LOTTERY",
                status: CampaignStatus.DRAFT, // DRAFT so Admin can click "Release Chances Online"!
                ticketPrice: 750,
                maxTickets: 5000,
                startDate: now,
                endDate: sixtyDaysLater,
                drawDate: new Date(sixtyDaysLater.getTime() + 24 * 60 * 60 * 1000),
                createdBy: admin.id,
                eligibilityRules: JSON.stringify({
                    minAge: 18,
                    allowedCountries: ["ET", "DIASPORA"],
                }),
            },
        });
        await prisma.vehicle.create({
            data: {
                make: "Porsche",
                model: "911 Turbo S Coupe",
                year: 2026,
                color: "GT Silver Metallic with Carmine Red Interior",
                engineInfo: "3.8L Twin-Turbo Flat-6 (640 HP)",
                transmission: "8-Speed Porsche Doppelkupplung (PDK)",
                fuelType: "Premium Gasoline",
                vinChassisNumber: "WP0AD2A99TS2026002",
                declaredValue: 38000000,
                vehicleCondition: "BRAND_NEW",
                location: "Addis Ababa Exhibition Center",
                status: "AVAILABLE",
                campaignId: camp2.id,
                images: JSON.stringify([
                    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200&auto=format&fit=crop",
                ]),
            },
        });
        console.log("Created Campaign 2: Porsche 911 Turbo S (DRAFT)");
    }
    // Campaign 3: BMW M8 Competition Gran Coupe (PUBLISHED)
    let camp3 = await prisma.lotteryCampaign.findFirst({
        where: { slug: "bmw-m8-competition-gran-coupe-2026" },
    });
    if (!camp3) {
        camp3 = await prisma.lotteryCampaign.create({
            data: {
                name: "Abyssinia Grand Prize: BMW M8 Competition Gran Coupe",
                slug: "bmw-m8-competition-gran-coupe-2026",
                description: "Four-door luxury supercar combining unmatched elegance, executive comfort, and M TwinPower Turbo V8 power.",
                systemName: "ETHIO CAR LOTTERY",
                status: CampaignStatus.PUBLISHED,
                ticketPrice: 350,
                maxTickets: 15000,
                startDate: now,
                endDate: thirtyDaysLater,
                drawDate: new Date(thirtyDaysLater.getTime() + 24 * 60 * 60 * 1000),
                createdBy: admin.id,
                publishedAt: now,
                publishedBy: admin.id,
            },
        });
        await prisma.vehicle.create({
            data: {
                make: "BMW",
                model: "M8 Competition Gran Coupe",
                year: 2026,
                color: "Frozen Marina Bay Blue",
                engineInfo: "4.4L BMW M TwinPower Turbo V8 (617 HP)",
                transmission: "8-Speed M Steptronic with Drivelogic",
                fuelType: "Gasoline",
                vinChassisNumber: "WBSAE0C54NC2026003",
                declaredValue: 28000000,
                vehicleCondition: "BRAND_NEW",
                location: "Meskel Square Display Pavilion",
                status: "AVAILABLE",
                campaignId: camp3.id,
                images: JSON.stringify([
                    "https://images.unsplash.com/photo-1555215695-3004980ad54e?q=80&w=1200&auto=format&fit=crop",
                ]),
            },
        });
        console.log("Created Campaign 3: BMW M8 Competition (PUBLISHED)");
    }
    console.log("Database seeded successfully!");
}
main()
    .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
