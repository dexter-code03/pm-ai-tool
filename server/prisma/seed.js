import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('demo12345', 10);

  const user = await prisma.user.upsert({
    where: { email: 'demo@pm-ai-tool.local' },
    update: {},
    create: {
      email: 'demo@pm-ai-tool.local',
      passwordHash: hash,
      name: 'Demo User',
      role: 'ADMIN',
    },
  });
  console.log('Seeded user:', user.email, user.id);

  const existingPrds = await prisma.prd.count({ where: { userId: user.id } });
  if (existingPrds === 0) {
    const prd1 = await prisma.prd.create({
      data: {
        userId: user.id,
        title: 'User Authentication Revamp',
        status: 'review',
        content: JSON.stringify([
          { id: 'sec_01', num: '01', title: 'Executive Summary', type: 'text', confidence: 'high', content: 'This PRD outlines the complete revamp of the user authentication system to support SSO, MFA, and session management improvements.' },
          { id: 'sec_02', num: '02', title: 'Problem Statement', type: 'text', confidence: 'high', content: 'Current authentication lacks SSO support and MFA, leading to security concerns and poor enterprise adoption.' },
          { id: 'sec_03', num: '03', title: 'Goals & Objectives', type: 'list', confidence: 'high', items: ['Support Google/Microsoft SSO', 'Add TOTP-based MFA', 'Reduce login friction by 40%', 'Pass SOC2 audit requirements'] },
          { id: 'sec_04', num: '04', title: 'User Stories', type: 'list', confidence: 'mid', items: ['As a user, I want to sign in with my Google account', 'As an admin, I want to enforce MFA for all users', 'As a user, I want to stay logged in across sessions'] },
          { id: 'sec_05', num: '05', title: 'Success Metrics', type: 'table', confidence: 'mid', headers: ['Metric', 'Target', 'Current'], rows: [['Login success rate', '99.5%', '97.2%'], ['Avg login time', '<3s', '5.2s'], ['SSO adoption', '>60%', '0%']] },
        ]),
      },
    });

    await prisma.prd.create({
      data: {
        userId: user.id,
        title: 'Mobile Push Notification System',
        status: 'draft',
        content: JSON.stringify([
          { id: 'sec_01', num: '01', title: 'Overview', type: 'text', confidence: 'high', content: 'Design and implement a scalable push notification system for iOS and Android.' },
          { id: 'sec_02', num: '02', title: 'Requirements', type: 'list', confidence: 'high', items: ['Support FCM and APNs', 'Configurable notification channels', 'Rate limiting per user', 'Rich notification support'] },
        ]),
      },
    });

    await prisma.prd.create({
      data: {
        userId: user.id,
        title: 'API Rate Limiting & Throttling',
        status: 'approved',
        content: JSON.stringify([
          { id: 'sec_01', num: '01', title: 'Summary', type: 'text', confidence: 'high', content: 'Implement API rate limiting using Redis sliding window algorithm to protect backend services.' },
        ]),
      },
    });

    await prisma.notification.createMany({
      data: [
        { userId: user.id, type: 'prd_update', title: 'PRD Updated', message: 'User Authentication Revamp was updated by Alex M.', prdId: prd1.id },
        { userId: user.id, type: 'comment', title: 'New Comment', message: 'Sarah K. commented on section "Goals & Objectives"', prdId: prd1.id },
        { userId: user.id, type: 'approval', title: 'Approval Requested', message: 'Jordan L. requested your approval on API Rate Limiting PRD' },
      ],
    });

    console.log('Seeded 3 PRDs and 3 notifications');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
