"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 🔑 REQUIRED: load .env so DATABASE_URL is available at runtime
require("dotenv/config");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient({});
const bowlingTypes = [
    { shortName: 'FAST', fullName: 'Fast Bowling' },
    { shortName: 'MEDIUM_FAST', fullName: 'Medium-Fast Bowling' },
    { shortName: 'MEDIUM', fullName: 'Medium Pace Bowling' },
    { shortName: 'OFF_SPIN', fullName: 'Off Spin' },
    { shortName: 'LEG_SPIN', fullName: 'Leg Spin' },
    { shortName: 'LEFT_ARM_ORTHODOX', fullName: 'Left-Arm Orthodox' },
    { shortName: 'LEFT_ARM_UNORTHODOX', fullName: 'Left-Arm Unorthodox' },
    { shortName: 'RIGHT_ARM_ORTHODOX', fullName: 'Right-Arm Orthodox' },
    { shortName: 'RIGHT_ARM_UNORTHODOX', fullName: 'Right-Arm Unorthodox' },
];
async function main() {
    console.log('🌱 Seeding bowling types...');
    for (const type of bowlingTypes) {
        await prisma.bowlingType.upsert({
            where: { shortName: type.shortName },
            update: {},
            create: type,
        });
    }
    console.log('✅ Bowling types seeded successfully!');
}
main()
    .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
