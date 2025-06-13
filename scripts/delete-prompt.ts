import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  await prisma.promptTemplate.delete({ where: { id: 'cmbpcq7i10000sjh18nzztmct' } })
  console.log('Prompt supprimé')
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) }) 