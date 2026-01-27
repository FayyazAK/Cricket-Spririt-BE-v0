// 🔑 REQUIRED: load .env so DATABASE_URL is available at runtime
import 'dotenv/config';

import {
  PrismaClient,
  Gender,
  PlayerType,
  Hand,
  UserRole,
  InvitationStatus,
} from '@prisma/client';
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
const citiesByProvince: CitiesByProvince = JSON.parse(
  fs.readFileSync(citiesPath, 'utf-8'),
);

const allCities: { city: string; state: string; country: string }[] = [];
for (const [province, cities] of Object.entries(citiesByProvince)) {
  for (const city of cities) {
    allCities.push({ city: city.name, state: province, country: 'Pakistan' });
  }
}

const bowlingTypesSeed = [
  { shortName: 'FAST', fullName: 'Fast' },
  { shortName: 'FAST_MEDIUM', fullName: 'Fast Medium' },
  { shortName: 'OFF_SPIN', fullName: 'Off Spin' },
  { shortName: 'LEG_SPIN', fullName: 'Leg Spin' },
  { shortName: 'CHINAMAN', fullName: 'Chinaman' },
  { shortName: 'ORTHODOX', fullName: 'Orthodox' },
];

const firstNames = [
  'Ali',
  'Ahmed',
  'Bilal',
  'Hassan',
  'Usman',
  'Hamza',
  'Faisal',
  'Zain',
  'Saad',
  'Adeel',
  'Farhan',
  'Imran',
  'Tahir',
  'Shoaib',
  'Noman',
  'Asad',
  'Haroon',
  'Salman',
  'Arslan',
  'Waqas',
];

const lastNames = [
  'Khan',
  'Ali',
  'Sheikh',
  'Malik',
  'Ibrahim',
  'Hussain',
  'Raza',
  'Shah',
  'Butt',
  'Qureshi',
  'Chaudhry',
  'Siddiqui',
  'Mirza',
  'Mehmood',
  'Nadeem',
  'Iqbal',
  'Latif',
  'Aslam',
  'Javed',
  'Arif',
];

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function generateRandomDOB(): Date {
  const minAge = 18;
  const maxAge = 38;
  const age = Math.floor(Math.random() * (maxAge - minAge + 1)) + minAge;
  const year = new Date().getFullYear() - age;
  const month = Math.floor(Math.random() * 12);
  const day = Math.floor(Math.random() * 28) + 1;
  return new Date(year, month, day);
}

async function ensureBowlingTypes() {
  for (const type of bowlingTypesSeed) {
    await prisma.bowlingType.upsert({
      where: { shortName: type.shortName },
      update: {},
      create: type,
    });
  }
}

async function createAddressFromLocation(
  seedIndex: number,
  location: { city: string; state: string; country: string },
) {
  return prisma.address.create({
    data: {
      street: `House ${100 + seedIndex}, Street ${
        Math.floor(Math.random() * 50) + 1
      }`,
      townSuburb: 'Sports Colony',
      city: location.city,
      state: location.state,
      country: location.country,
      postalCode: `${10000 + Math.floor(Math.random() * 90000)}`,
    },
  });
}

async function createAddress(seedIndex: number) {
  const cityData = pickRandom(allCities);
  return createAddressFromLocation(seedIndex, cityData);
}

async function main() {
  console.log('🌱 Seeding dummy data...');

  await ensureBowlingTypes();
  const bowlingTypes = await prisma.bowlingType.findMany();
  const bowlingTypeIds = bowlingTypes.map((bt) => bt.id);

  const hashedPassword = await bcrypt.hash('password123', 10);

  const baseUsersCount = 150;
  const basePlayersCount = 110;

  const userIds: string[] = [];
  const clubEligiblePlayerIds: string[] = [];
  const allPlayerIds: string[] = [];

  for (let i = 1; i <= baseUsersCount; i++) {
    const email = `user${i.toString().padStart(3, '0')}@seed.test`;
    const name = `${pickRandom(firstNames)} ${pickRandom(lastNames)}`;
    const isPlayer = i <= basePlayersCount;

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        role: isPlayer ? UserRole.PLAYER : UserRole.USER,
        isEmailVerified: true,
        deletedAt: null,
      },
      create: {
        email,
        name,
        password: hashedPassword,
        role: isPlayer ? UserRole.PLAYER : UserRole.USER,
        isEmailVerified: true,
      },
      select: { id: true },
    });

    userIds.push(user.id);

    if (isPlayer) {
      const existingPlayer = await prisma.player.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });

      if (!existingPlayer) {
        const address = await createAddress(i);
        const playerType = pickRandom([
          PlayerType.BATSMAN,
          PlayerType.BOWLER,
          PlayerType.ALL_ROUNDER,
        ]);

        const isBowler =
          playerType === PlayerType.BOWLER ||
          playerType === PlayerType.ALL_ROUNDER;

        const player = await prisma.player.create({
          data: {
            userId: user.id,
            firstName: name.split(' ')[0],
            lastName: name.split(' ')[1] || 'Ali',
            gender: pickRandom([Gender.MALE, Gender.FEMALE]),
            dateOfBirth: generateRandomDOB(),
            playerType,
            isWicketKeeper: Math.random() < 0.1,
            batHand: pickRandom([Hand.LEFT, Hand.RIGHT]),
            bowlHand: isBowler ? pickRandom([Hand.LEFT, Hand.RIGHT]) : null,
            addressId: address.id,
            isActive: true,
          },
          select: { id: true },
        });

        if (isBowler && bowlingTypeIds.length > 0) {
          const bowlingTypeId = pickRandom(bowlingTypeIds);
          await prisma.playerBowlingType.createMany({
            data: [
              {
                playerId: player.id,
                bowlingTypeId,
              },
            ],
            skipDuplicates: true,
          });
        }

        clubEligiblePlayerIds.push(player.id);
        allPlayerIds.push(player.id);
      } else {
        clubEligiblePlayerIds.push(existingPlayer.id);
        allPlayerIds.push(existingPlayer.id);
      }
    }
  }

  const pakistanExtraPlayers = [
    { firstName: 'Babar', lastName: 'Azam' },
    { firstName: 'Shaheen', lastName: 'Afridi' },
    { firstName: 'Mohammad', lastName: 'Rizwan' },
    { firstName: 'Fakhar', lastName: 'Zaman' },
    { firstName: 'Shadab', lastName: 'Khan' },
    { firstName: 'Haris', lastName: 'Rauf' },
    { firstName: 'Imam', lastName: 'ul-Haq' },
    { firstName: 'Naseem', lastName: 'Shah' },
    { firstName: 'Mohammad', lastName: 'Nawaz' },
    { firstName: 'Iftikhar', lastName: 'Ahmed' },
    { firstName: 'Saim', lastName: 'Ayub' },
    { firstName: 'Abdullah', lastName: 'Shafique' },
    { firstName: 'Abrar', lastName: 'Ahmed' },
    { firstName: 'Usama', lastName: 'Mir' },
    { firstName: 'Faheem', lastName: 'Ashraf' },
    { firstName: 'Sarfaraz', lastName: 'Ahmed' },
    { firstName: 'Mohammad', lastName: 'Haris' },
    { firstName: 'Khushdil', lastName: 'Shah' },
    { firstName: 'Agha', lastName: 'Salman' },
    { firstName: 'Saud', lastName: 'Shakeel' },
    { firstName: 'Shan', lastName: 'Masood' },
    { firstName: 'Mohammad', lastName: 'Wasim' },
    { firstName: 'Mir', lastName: 'Hamza' },
    { firstName: 'Noman', lastName: 'Ali' },
    { firstName: 'Azam', lastName: 'Khan' },
  ];

  const indiaExtraPlayers = [
    { firstName: 'Virat', lastName: 'Kohli' },
    { firstName: 'Rohit', lastName: 'Sharma' },
    { firstName: 'Jasprit', lastName: 'Bumrah' },
    { firstName: 'Ravindra', lastName: 'Jadeja' },
    { firstName: 'KL', lastName: 'Rahul' },
    { firstName: 'Shubman', lastName: 'Gill' },
    { firstName: 'Hardik', lastName: 'Pandya' },
    { firstName: 'Rishabh', lastName: 'Pant' },
    { firstName: 'Mohammed', lastName: 'Shami' },
    { firstName: 'Yuzvendra', lastName: 'Chahal' },
    { firstName: 'Kuldeep', lastName: 'Yadav' },
    { firstName: 'Suryakumar', lastName: 'Yadav' },
    { firstName: 'Ishan', lastName: 'Kishan' },
    { firstName: 'Shreyas', lastName: 'Iyer' },
    { firstName: 'Axar', lastName: 'Patel' },
    { firstName: 'Mohammed', lastName: 'Siraj' },
    { firstName: 'Prithvi', lastName: 'Shaw' },
    { firstName: 'Sanju', lastName: 'Samson' },
    { firstName: 'Deepak', lastName: 'Chahar' },
    { firstName: 'Bhuvneshwar', lastName: 'Kumar' },
    { firstName: 'Shardul', lastName: 'Thakur' },
    { firstName: 'Washington', lastName: 'Sundar' },
    { firstName: 'Ruturaj', lastName: 'Gaikwad' },
    { firstName: 'Tilak', lastName: 'Varma' },
    { firstName: 'Arshdeep', lastName: 'Singh' },
  ];

  const extraPlayers = [
    ...pakistanExtraPlayers.map((p) => ({ ...p, country: 'Pakistan' })),
    ...indiaExtraPlayers.map((p) => ({ ...p, country: 'India' })),
  ];

  for (let i = 0; i < extraPlayers.length; i++) {
    const player = extraPlayers[i];
    const emailPrefix = player.country === 'Pakistan' ? 'pk' : 'in';
    const email = `${emailPrefix}.${player.firstName.toLowerCase()}.${player.lastName.toLowerCase().replace(/[^a-z]/g, '')}@seed.test`;

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: `${player.firstName} ${player.lastName}`,
        role: UserRole.PLAYER,
        isEmailVerified: true,
        deletedAt: null,
      },
      create: {
        email,
        name: `${player.firstName} ${player.lastName}`,
        password: hashedPassword,
        role: UserRole.PLAYER,
        isEmailVerified: true,
      },
      select: { id: true },
    });

    const existingPlayer = await prisma.player.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!existingPlayer) {
      const location = pickRandom(allCities);
      const address = await createAddressFromLocation(5000 + i, location);
      const playerType = pickRandom([
        PlayerType.BATSMAN,
        PlayerType.BOWLER,
        PlayerType.ALL_ROUNDER,
      ]);

      const isBowler =
        playerType === PlayerType.BOWLER ||
        playerType === PlayerType.ALL_ROUNDER;

      const createdPlayer = await prisma.player.create({
        data: {
          userId: user.id,
          firstName: player.firstName,
          lastName: player.lastName,
          gender: pickRandom([Gender.MALE, Gender.FEMALE]),
          dateOfBirth: generateRandomDOB(),
          playerType,
          isWicketKeeper: Math.random() < 0.1,
          batHand: pickRandom([Hand.LEFT, Hand.RIGHT]),
          bowlHand: isBowler ? pickRandom([Hand.LEFT, Hand.RIGHT]) : null,
          addressId: address.id,
          isActive: true,
        },
        select: { id: true },
      });

      if (isBowler && bowlingTypeIds.length > 0) {
        const bowlingTypeId = pickRandom(bowlingTypeIds);
        await prisma.playerBowlingType.createMany({
          data: [
            {
              playerId: createdPlayer.id,
              bowlingTypeId,
            },
          ],
          skipDuplicates: true,
        });
      }

      allPlayerIds.push(createdPlayer.id);
    } else {
      allPlayerIds.push(existingPlayer.id);
    }
  }

  const clubsCount = 5;
  const teamsPerClub = 2;
  const playersPerClub = 20;
  const playersNeeded = clubsCount * playersPerClub;

  if (clubEligiblePlayerIds.length < playersNeeded) {
    throw new Error(
      `Not enough players. Needed ${playersNeeded}, found ${clubEligiblePlayerIds.length}`,
    );
  }

  const ownerUsers = await prisma.user.findMany({
    where: {
      role: UserRole.USER,
      deletedAt: null,
    },
    select: { id: true },
    take: clubsCount,
  });

  const fallbackOwners = await prisma.user.findMany({
    select: { id: true },
    take: clubsCount,
  });

  const owners =
    ownerUsers.length >= clubsCount ? ownerUsers : fallbackOwners;

  for (let c = 0; c < clubsCount; c++) {
    const clubName = `Seed Club ${c + 1}`;
    const ownerId = owners[c]?.id || userIds[c];

    let club = await prisma.club.findFirst({
      where: {
        name: clubName,
        ownerId,
        deletedAt: null,
      },
    });

    if (!club) {
      const clubAddress = await createAddress(1000 + c);
      club = await prisma.club.create({
        data: {
          name: clubName,
          bio: 'Seed club for testing.',
          establishedDate: new Date(2010, c, 1),
          addressId: clubAddress.id,
          ownerId,
        },
      });
    }

    const teams: { id: string; name: string }[] = [];
    for (let t = 0; t < teamsPerClub; t++) {
      const teamName = `${clubName} Team ${t + 1}`;
      let team = await prisma.team.findFirst({
        where: {
          name: teamName,
          clubId: club.id,
          deletedAt: null,
        },
        select: { id: true, name: true },
      });

      if (!team) {
        team = await prisma.team.create({
          data: {
            name: teamName,
            description: 'Seed team for testing.',
            clubId: club.id,
          },
          select: { id: true, name: true },
        });
      }

      teams.push(team);
    }

    const startIndex = c * playersPerClub;
    const clubPlayers = clubEligiblePlayerIds.slice(
      startIndex,
      startIndex + playersPerClub,
    );

    const invitationExpiresAt = new Date();
    invitationExpiresAt.setDate(invitationExpiresAt.getDate() + 30);

    await prisma.playerClub.createMany({
      data: clubPlayers.map((playerId) => ({
        playerId,
        clubId: club!.id,
        status: InvitationStatus.ACCEPTED,
        invitedAt: new Date(),
        invitationExpiresAt,
        respondedAt: new Date(),
      })),
      skipDuplicates: true,
    });

    const half = Math.ceil(clubPlayers.length / teams.length);
    for (let t = 0; t < teams.length; t++) {
      const teamPlayers = clubPlayers.slice(t * half, (t + 1) * half);
      await prisma.playerTeam.createMany({
        data: teamPlayers.map((playerId) => ({
          playerId,
          teamId: teams[t].id,
          status: InvitationStatus.ACCEPTED,
          invitedAt: new Date(),
          invitationExpiresAt,
          respondedAt: new Date(),
        })),
        skipDuplicates: true,
      });
    }
  }

  console.log('✅ Dummy data seeded successfully');
  console.log(`   Users: ${baseUsersCount + extraPlayers.length}`);
  console.log(`   Players: ${allPlayerIds.length}`);
  console.log(`   Clubs: ${clubsCount} (2 teams each)`);
  console.log(`   Club players: ${playersPerClub} accepted per club`);
  console.log('\n🔐 All seed users have password: password123');
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
