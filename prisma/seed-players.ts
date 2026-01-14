// 🔑 REQUIRED: load .env so DATABASE_URL is available at runtime
import 'dotenv/config';

import { PrismaClient, Gender, PlayerType, Hand, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Load cities from JSON file
type City = { name: string; lat: number; lng: number };
type CitiesByProvince = Record<string, City[]>;

const citiesPath = path.join(__dirname, '..', 'cities_by_province.json');
const citiesByProvince: CitiesByProvince = JSON.parse(fs.readFileSync(citiesPath, 'utf-8'));

// Flatten cities with their provinces
const allCities: { city: string; state: string; country: string }[] = [];
for (const [province, cities] of Object.entries(citiesByProvince)) {
  for (const city of cities) {
    allCities.push({ city: city.name, state: province, country: 'Pakistan' });
  }
}

// Test player data - 30 players with varied attributes (Pakistani names)
const playerData = [
  { firstName: 'Babar', lastName: 'Azam', gender: Gender.MALE, playerType: PlayerType.BATSMAN, batHand: Hand.RIGHT, isWicketKeeper: false },
  { firstName: 'Shaheen', lastName: 'Afridi', gender: Gender.MALE, playerType: PlayerType.BOWLER, batHand: Hand.LEFT, bowlHand: Hand.LEFT, bowlingTypes: ['FAST'] },
  { firstName: 'Mohammad', lastName: 'Rizwan', gender: Gender.MALE, playerType: PlayerType.BATSMAN, batHand: Hand.RIGHT, isWicketKeeper: true },
  { firstName: 'Fakhar', lastName: 'Zaman', gender: Gender.MALE, playerType: PlayerType.BATSMAN, batHand: Hand.LEFT, isWicketKeeper: false },
  { firstName: 'Shadab', lastName: 'Khan', gender: Gender.MALE, playerType: PlayerType.ALL_ROUNDER, batHand: Hand.RIGHT, bowlHand: Hand.RIGHT, bowlingTypes: ['LEG_SPIN'] },
  { firstName: 'Haris', lastName: 'Rauf', gender: Gender.MALE, playerType: PlayerType.BOWLER, batHand: Hand.RIGHT, bowlHand: Hand.RIGHT, bowlingTypes: ['FAST'] },
  { firstName: 'Imam', lastName: 'ul-Haq', gender: Gender.MALE, playerType: PlayerType.BATSMAN, batHand: Hand.LEFT, isWicketKeeper: false },
  { firstName: 'Naseem', lastName: 'Shah', gender: Gender.MALE, playerType: PlayerType.BOWLER, batHand: Hand.RIGHT, bowlHand: Hand.RIGHT, bowlingTypes: ['FAST'] },
  { firstName: 'Mohammad', lastName: 'Nawaz', gender: Gender.MALE, playerType: PlayerType.ALL_ROUNDER, batHand: Hand.LEFT, bowlHand: Hand.LEFT, bowlingTypes: ['ORTHODOX'] },
  { firstName: 'Iftikhar', lastName: 'Ahmed', gender: Gender.MALE, playerType: PlayerType.ALL_ROUNDER, batHand: Hand.RIGHT, bowlHand: Hand.RIGHT, bowlingTypes: ['OFF_SPIN'] },
  { firstName: 'Saim', lastName: 'Ayub', gender: Gender.MALE, playerType: PlayerType.BATSMAN, batHand: Hand.LEFT, isWicketKeeper: false },
  { firstName: 'Abdullah', lastName: 'Shafique', gender: Gender.MALE, playerType: PlayerType.BATSMAN, batHand: Hand.RIGHT, isWicketKeeper: false },
  { firstName: 'Abrar', lastName: 'Ahmed', gender: Gender.MALE, playerType: PlayerType.BOWLER, batHand: Hand.RIGHT, bowlHand: Hand.RIGHT, bowlingTypes: ['LEG_SPIN'] },
  { firstName: 'Usama', lastName: 'Mir', gender: Gender.MALE, playerType: PlayerType.BOWLER, batHand: Hand.RIGHT, bowlHand: Hand.RIGHT, bowlingTypes: ['LEG_SPIN'] },
  { firstName: 'Faheem', lastName: 'Ashraf', gender: Gender.MALE, playerType: PlayerType.ALL_ROUNDER, batHand: Hand.RIGHT, bowlHand: Hand.RIGHT, bowlingTypes: ['FAST_MEDIUM'] },
  { firstName: 'Sarfaraz', lastName: 'Ahmed', gender: Gender.MALE, playerType: PlayerType.BATSMAN, batHand: Hand.RIGHT, isWicketKeeper: true },
  { firstName: 'Mohammad', lastName: 'Haris', gender: Gender.MALE, playerType: PlayerType.BATSMAN, batHand: Hand.RIGHT, isWicketKeeper: true },
  { firstName: 'Khushdil', lastName: 'Shah', gender: Gender.MALE, playerType: PlayerType.ALL_ROUNDER, batHand: Hand.LEFT, bowlHand: Hand.LEFT, bowlingTypes: ['ORTHODOX'] },
  { firstName: 'Agha', lastName: 'Salman', gender: Gender.MALE, playerType: PlayerType.ALL_ROUNDER, batHand: Hand.RIGHT, bowlHand: Hand.RIGHT, bowlingTypes: ['OFF_SPIN'] },
  { firstName: 'Saud', lastName: 'Shakeel', gender: Gender.MALE, playerType: PlayerType.BATSMAN, batHand: Hand.LEFT, isWicketKeeper: false },
  { firstName: 'Shan', lastName: 'Masood', gender: Gender.MALE, playerType: PlayerType.BATSMAN, batHand: Hand.LEFT, isWicketKeeper: false },
  { firstName: 'Mohammad', lastName: 'Wasim', gender: Gender.MALE, playerType: PlayerType.ALL_ROUNDER, batHand: Hand.RIGHT, bowlHand: Hand.RIGHT, bowlingTypes: ['FAST_MEDIUM'] },
  { firstName: 'Mir', lastName: 'Hamza', gender: Gender.MALE, playerType: PlayerType.BOWLER, batHand: Hand.LEFT, bowlHand: Hand.LEFT, bowlingTypes: ['FAST_MEDIUM'] },
  { firstName: 'Noman', lastName: 'Ali', gender: Gender.MALE, playerType: PlayerType.BOWLER, batHand: Hand.LEFT, bowlHand: Hand.LEFT, bowlingTypes: ['ORTHODOX'] },
  { firstName: 'Azam', lastName: 'Khan', gender: Gender.MALE, playerType: PlayerType.BATSMAN, batHand: Hand.RIGHT, isWicketKeeper: true },
  { firstName: 'Bismah', lastName: 'Maroof', gender: Gender.FEMALE, playerType: PlayerType.BATSMAN, batHand: Hand.LEFT, isWicketKeeper: false },
  { firstName: 'Nida', lastName: 'Dar', gender: Gender.FEMALE, playerType: PlayerType.ALL_ROUNDER, batHand: Hand.RIGHT, bowlHand: Hand.RIGHT, bowlingTypes: ['OFF_SPIN'] },
  { firstName: 'Sidra', lastName: 'Amin', gender: Gender.FEMALE, playerType: PlayerType.BATSMAN, batHand: Hand.RIGHT, isWicketKeeper: false },
  { firstName: 'Fatima', lastName: 'Sana', gender: Gender.FEMALE, playerType: PlayerType.ALL_ROUNDER, batHand: Hand.RIGHT, bowlHand: Hand.RIGHT, bowlingTypes: ['FAST_MEDIUM'] },
  { firstName: 'Aliya', lastName: 'Riaz', gender: Gender.FEMALE, playerType: PlayerType.ALL_ROUNDER, batHand: Hand.RIGHT, bowlHand: Hand.RIGHT, bowlingTypes: ['OFF_SPIN'] },
];

function generateRandomDOB(): Date {
  const minAge = 18;
  const maxAge = 38;
  const age = Math.floor(Math.random() * (maxAge - minAge + 1)) + minAge;
  const year = new Date().getFullYear() - age;
  const month = Math.floor(Math.random() * 12);
  const day = Math.floor(Math.random() * 28) + 1;
  return new Date(year, month, day);
}

async function main() {
  console.log('🌱 Seeding test players...');

  // Hash the common password once
  const hashedPassword = await bcrypt.hash('Test@123', 10);

  // Get bowling types for assignment
  const bowlingTypes = await prisma.bowlingType.findMany();
  const bowlingTypeMap = new Map(bowlingTypes.map((bt) => [bt.shortName, bt.id]));

  if (bowlingTypes.length === 0) {
    console.log('⚠️  No bowling types found. Please run the main seed first: npm run prisma:seed');
    return;
  }

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < playerData.length; i++) {
    const player = playerData[i];
    const email = `${player.firstName.toLowerCase()}.${player.lastName.toLowerCase()}@test.com`;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log(`⏭️  Skipping ${player.firstName} ${player.lastName} - already exists`);
      skipped++;
      continue;
    }

    // Pick a random city from Pakistan
    const cityData = allCities[Math.floor(Math.random() * allCities.length)];

    // Create address
    const address = await prisma.address.create({
      data: {
        street: `House ${100 + i}, Street ${Math.floor(Math.random() * 50) + 1}`,
        townSuburb: 'Sports Colony',
        city: cityData.city,
        state: cityData.state,
        country: cityData.country,
        postalCode: `${10000 + Math.floor(Math.random() * 90000)}`,
      },
    });

    // Create user with PLAYER role and verified email
    const user = await prisma.user.create({
      data: {
        email,
        name: `${player.firstName} ${player.lastName}`,
        password: hashedPassword,
        role: UserRole.PLAYER,
        isEmailVerified: true,
      },
    });

    // Create player profile
    const createdPlayer = await prisma.player.create({
      data: {
        userId: user.id,
        firstName: player.firstName,
        lastName: player.lastName,
        gender: player.gender,
        dateOfBirth: generateRandomDOB(),
        playerType: player.playerType,
        isWicketKeeper: player.isWicketKeeper ?? false,
        batHand: player.batHand,
        bowlHand: player.bowlHand,
        addressId: address.id,
        isActive: true,
      },
    });

    // Assign bowling types for bowlers and all-rounders
    if (player.bowlingTypes && player.bowlingTypes.length > 0) {
      for (const bowlingTypeName of player.bowlingTypes) {
        const bowlingTypeId = bowlingTypeMap.get(bowlingTypeName);
        if (bowlingTypeId) {
          await prisma.playerBowlingType.create({
            data: {
              playerId: createdPlayer.id,
              bowlingTypeId,
            },
          });
        }
      }
    }

    console.log(`✅ Created: ${player.firstName} ${player.lastName} (${player.playerType})`);
    created++;
  }

  console.log('\n📊 Summary:');
  console.log(`   Created: ${created} players`);
  console.log(`   Skipped: ${skipped} players (already existed)`);
  console.log('\n🔐 All test users have password: Test@123');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
