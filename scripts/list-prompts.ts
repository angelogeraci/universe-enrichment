import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  const prompts = await prisma.promptTemplate.findMany({
    select: { id: true, label: true, searchType: true, model: true, isActive: true }
  })
  console.log(JSON.stringify(prompts, null, 2))
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) }) 