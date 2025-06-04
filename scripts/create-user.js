const { PrismaClient } = require('../src/generated/prisma');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Admin
  const adminEmail = 'angelo.geraci@soprism.com';
  const adminPassword = 'admin1234';
  const adminHashed = bcrypt.hashSync(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: adminHashed,
      role: 'admin',
    },
  });

  // User classique
  const userEmail = 'user@demo.com';
  const userPassword = 'user1234';
  const userHashed = bcrypt.hashSync(userPassword, 10);
  await prisma.user.upsert({
    where: { email: userEmail },
    update: {},
    create: {
      email: userEmail,
      password: userHashed,
      role: 'user',
    },
  });

  console.log('Admin et user créés !');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());