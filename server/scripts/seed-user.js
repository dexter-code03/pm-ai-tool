import '../load-env.js';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';

const email = process.env.SEED_EMAIL || 'demo@pm-ai-tool.local';
const password = process.env.SEED_PASSWORD || 'demo12345';
const name = process.env.SEED_NAME || 'Demo User';

async function main() {
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash: hash, name },
    create: { email, passwordHash: hash, name, role: 'ADMIN' }
  });
  console.log('Seed user ready:', user.email, '/', password);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
