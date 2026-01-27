// 🔑 REQUIRED: load .env so DATABASE_URL is available at runtime
import 'dotenv/config';

import { PrismaClient, InvitationStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SEED_PASSWORD = 'password123';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderList(items: string[]) {
  if (items.length === 0) return '-';
  return items.map((item) => escapeHtml(item)).join('<br>');
}

async function main() {
  console.log('🧾 Generating seed report...');

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      clubs: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const clubs = await prisma.club.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      owner: {
        select: {
          name: true,
          email: true,
        },
      },
      teams: {
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          players: {
            where: { status: InvitationStatus.ACCEPTED },
            select: {
              player: {
                select: {
                  firstName: true,
                  lastName: true,
                  user: {
                    select: {
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const teams = clubs.flatMap((club) =>
    club.teams.map((team) => ({
      id: team.id,
      name: team.name,
      clubName: club.name,
      players: team.players.map(
        (p) => `${p.player.firstName} ${p.player.lastName} (${p.player.user?.email || 'no-email'})`,
      ),
    })),
  );

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Seed Data Report</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
      h1, h2 { margin-bottom: 8px; }
      .note { color: #555; margin-bottom: 20px; }
      table { border-collapse: collapse; width: 100%; margin-bottom: 32px; }
      th, td { border: 1px solid #ddd; padding: 8px; vertical-align: top; }
      th { background: #f5f5f5; text-align: left; }
      .muted { color: #777; }
    </style>
  </head>
  <body>
    <h1>Seed Data Report</h1>
    <div class="note">All seed users use password: <strong>${SEED_PASSWORD}</strong></div>

    <h2>Users</h2>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Password</th>
          <th>Owned Clubs</th>
        </tr>
      </thead>
      <tbody>
        ${users
          .map((user) => {
            const ownedClubs = user.clubs.map((club) => club.name);
            return `<tr>
              <td>${escapeHtml(user.name)}</td>
              <td>${escapeHtml(user.email)}</td>
              <td>${SEED_PASSWORD}</td>
              <td>${renderList(ownedClubs)}</td>
            </tr>`;
          })
          .join('')}
      </tbody>
    </table>

    <h2>Clubs</h2>
    <table>
      <thead>
        <tr>
          <th>Club</th>
          <th>Owner</th>
          <th>Teams</th>
        </tr>
      </thead>
      <tbody>
        ${clubs
          .map((club) => {
            const ownerLabel = club.owner
              ? `${club.owner.name} (${club.owner.email})`
              : 'Unknown';
            const teamNames = club.teams.map((team) => team.name);
            return `<tr>
              <td>${escapeHtml(club.name)}</td>
              <td>${escapeHtml(ownerLabel)}</td>
              <td>${renderList(teamNames)}</td>
            </tr>`;
          })
          .join('')}
      </tbody>
    </table>

    <h2>Teams</h2>
    <table>
      <thead>
        <tr>
          <th>Team</th>
          <th>Club</th>
          <th>Players (Accepted)</th>
        </tr>
      </thead>
      <tbody>
        ${teams
          .map((team) => {
            return `<tr>
              <td>${escapeHtml(team.name)}</td>
              <td>${escapeHtml(team.clubName)}</td>
              <td>${renderList(team.players)}</td>
            </tr>`;
          })
          .join('')}
      </tbody>
    </table>

    <div class="muted">Generated at ${escapeHtml(new Date().toISOString())}</div>
  </body>
</html>
`;

  const reportPath = path.join(__dirname, '..', 'seed-report.html');
  fs.writeFileSync(reportPath, html, 'utf-8');

  console.log(`✅ Seed report generated: ${reportPath}`);
}

main()
  .catch((error) => {
    console.error('❌ Report generation failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
