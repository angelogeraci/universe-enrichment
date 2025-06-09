import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

function slugify (str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

async function main () {
  const lists = await prisma.categoryList.findMany()
  const usedSlugs = new Set<string>()
  for (const list of lists) {
    if (!list.slug) {
      let base = slugify(list.name)
      let slug = base
      let i = 1
      while (usedSlugs.has(slug) || (await prisma.categoryList.findUnique({ where: { slug } }))) {
        slug = `${base}-${i++}`
      }
      await prisma.categoryList.update({ where: { id: list.id }, data: { slug } })
      usedSlugs.add(slug)
      console.log(`Set slug for ${list.name}: ${slug}`)
    }
  }
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) }) 