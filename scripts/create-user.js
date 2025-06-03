const { PrismaClient } = require('../src/generated/prisma');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'angelo.geraci@soprism.com';
  const password = 'admin1234';
  const hashedPassword = bcrypt.hashSync(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
    },
  });
  console.log('User created:', user);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());